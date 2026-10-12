"""
tts.py - renders the narration scripts to chapter MP3s with Kokoro-82M (ONNX).

Reads   audio/script/<id>.json     (written by: node scripts/narrate.mjs)
Writes  audio/<id>.mp3             one file per chapter, CBR mono (seek-accurate)
        audio/manifest.json        duration + section/figure timestamps per chapter

Every spoken segment is cached by hash(voice, lang, speed, text), so after an edit
only the changed paragraphs are synthesised again. A chapter whose script and voice
are unchanged is skipped entirely.

Setup (once):  see README "Audiobook"
Run:           python scripts/tts.py [ch07 ch08 ...] [--voice af_heart] [--speed 1.0]
"""
import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = ROOT / "audio" / "script"
OUT = ROOT / "audio"
MANIFEST = OUT / "manifest.json"
HOME = Path(os.environ.get("SOT_TTS_HOME") or Path(os.environ.get("LOCALAPPDATA", Path.home())) / "sot-tts")
CACHE = HOME / "cache"
SR = 24000

# Paced for listening while doing something else: unhurried, with room to think.
# Silence after each kind of segment, in seconds; headings and figures also get a lead-in,
# so a change of topic is audible even when you are only half listening.
PAUSE_AFTER = {"title": 2.2, "heading": 1.3, "sub": 1.0, "label": 0.8, "para": 1.0, "fig": 1.4}
PAUSE_BEFORE = {"heading": 1.4, "sub": 0.6, "fig": 0.8}
SENTENCE_GAP = 0.45   # between sentences inside a paragraph (Kokoro's own edges are trimmed)
DEFAULT_SPEED = 0.92  # a touch slower than Kokoro's natural rate

# split after . ! ? when the next sentence starts with a capital, digit or quote
SENTENCE = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9\"'])")


def sha(*parts):
    return hashlib.sha1("\x1f".join(map(str, parts)).encode("utf-8")).hexdigest()


def load_model():
    from kokoro_onnx import Kokoro
    models = HOME / "models"
    onnx = next((models / n for n in ("kokoro-v1.0.onnx", "kokoro-v1.0.fp16.onnx", "kokoro-v1.0.int8.onnx")
                 if (models / n).exists()), None)
    if not onnx:
        sys.exit(f"No Kokoro model in {models}. See README, 'Audiobook'.")
    print(f"model: {onnx.name}")
    return Kokoro(str(onnx), str(models / "voices-v1.0.bin"))


def speak(kokoro, text, voice, name, lang, speed):
    """One segment: each sentence synthesised separately, joined with a deliberate pause."""
    gap = np.zeros(int(SENTENCE_GAP * SR), dtype="float32")
    parts, made = [], 0
    for i, sentence in enumerate(s for s in SENTENCE.split(text) if s.strip()):
        audio, fresh = synth(kokoro, sentence, voice, name, lang, speed)
        made += fresh
        if i:
            parts.append(gap)
        parts.append(audio)
    return (np.concatenate(parts) if parts else np.zeros(0, dtype="float32")), made


def synth(kokoro, text, voice, name, lang, speed):
    key = sha("v1", name, lang, speed, text)
    path = CACHE / key[:2] / f"{key}.flac"
    if path.exists():
        audio, _ = sf.read(path, dtype="float32")
        return audio, False
    audio, sr = kokoro.create(text, voice=voice, speed=speed, lang=lang)
    assert sr == SR, sr
    audio = np.asarray(audio, dtype="float32")
    path.parent.mkdir(parents=True, exist_ok=True)
    sf.write(path, audio, SR, subtype="PCM_16")
    return audio, True


def encode(wav_path, mp3_path, meta, bitrate):
    tags = []
    for k, v in meta.items():
        tags += ["-metadata", f"{k}={v}"]
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav_path),
         "-af", "loudnorm=I=-18:TP=-1.5:LRA=11", "-ar", str(SR), "-ac", "1",
         "-c:a", "libmp3lame", "-b:a", bitrate, "-write_xing", "0", *tags, str(mp3_path)],
        check=True,
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("ids", nargs="*", help="chapter ids to render (default: all)")
    ap.add_argument("--voice", default="af_heart", help="Kokoro voice, or a blend like af_heart:70,bf_emma:30")
    ap.add_argument("--lang", default="en-us")
    ap.add_argument("--speed", type=float, default=DEFAULT_SPEED)
    ap.add_argument("--bitrate", default="48k")
    ap.add_argument("--force", action="store_true", help="re-encode even if unchanged")
    args = ap.parse_args()

    manifest = json.loads(MANIFEST.read_text("utf-8")) if MANIFEST.exists() else {}
    chapters = manifest.setdefault("chapters", {})
    manifest.update(voice=args.voice, lang=args.lang, model="Kokoro-82M")

    scripts = sorted(SCRIPTS.glob("*.json"))
    if args.ids:
        scripts = [p for p in scripts if p.stem in set(args.ids)]
    if not scripts:
        sys.exit("No narration scripts. Run: node scripts/narrate.mjs")

    kokoro = None
    voice = args.voice
    total_audio = total_wall = 0.0
    for p in scripts:
        nar = json.loads(p.read_text("utf-8"))
        cid = nar["id"]
        pacing = (PAUSE_AFTER, PAUSE_BEFORE, SENTENCE_GAP)
        key = sha(nar["hash"], args.voice, args.lang, args.speed, args.bitrate, pacing)[:12]
        mp3 = OUT / f"{cid}.mp3"
        if not args.force and chapters.get(cid, {}).get("key") == key and mp3.exists():
            print(f"{cid}: unchanged")
            continue

        if kokoro is None:
            kokoro = load_model()
            if ":" in args.voice:  # blended voice, e.g. af_heart:70,bf_emma:30
                parts = [v.split(":") for v in args.voice.split(",")]
                w = sum(float(x) for _, x in parts)
                voice = sum(kokoro.get_voice_style(n) * (float(x) / w) for n, x in parts)

        t0 = time.time()
        pieces, secs, figs, made = [], [], {}, 0
        cursor = 0
        for i, seg in enumerate(nar["segments"]):
            pre = PAUSE_BEFORE.get(seg["k"], 0) if i else 0
            if pre:
                pieces.append(np.zeros(int(pre * SR), dtype="float32"))
                cursor += int(pre * SR)
            start = cursor / SR
            audio, fresh = speak(kokoro, seg["t"], voice, args.voice, args.lang, args.speed)
            made += fresh
            pieces.append(audio)
            cursor += len(audio)
            if seg.get("sec"):
                secs.append([seg["sec"], round(start, 2)])
            if seg.get("fig") is not None:
                figs[seg["fig"]] = [round(start, 2), round(cursor / SR, 2)]
            gap = int(PAUSE_AFTER.get(seg["k"], 0.45) * SR)
            pieces.append(np.zeros(gap, dtype="float32"))
            cursor += gap
            print(f"\r{cid}: {i + 1}/{len(nar['segments'])} segments", end="", flush=True)

        full = np.concatenate(pieces)
        with tempfile.TemporaryDirectory() as tmp:
            wav = Path(tmp) / f"{cid}.wav"
            sf.write(wav, full, SR, subtype="PCM_16")
            title = (f"{nar['ch']}. " if nar.get("ch") else "") + nar["title"]
            encode(wav, mp3, {"title": title, "album": "The Science of Training",
                              "artist": "Sijan Pahari", "track": nar.get("ch") or ""}, args.bitrate)

        dur = round(len(full) / SR, 2)
        chapters[cid] = {
            "file": f"audio/{cid}.mp3",
            "v": hashlib.sha1(mp3.read_bytes()).hexdigest()[:8],
            "key": key,
            "dur": dur,
            "secs": secs,
            "figs": [figs.get(i) for i in range(nar.get("figures", 0))],
        }
        MANIFEST.write_text(json.dumps(manifest, indent=1), "utf-8")
        wall = time.time() - t0
        total_audio += dur
        total_wall += wall
        print(f"\r{cid}: {dur / 60:5.1f} min audio, {made} new segments, {wall / 60:5.1f} min "
              f"({dur / max(wall, 1e-6):.1f}x realtime), {mp3.stat().st_size / 1e6:.1f} MB")

    if total_wall:
        print(f"done: {total_audio / 3600:.2f} h of audio in {total_wall / 3600:.2f} h")


if __name__ == "__main__":
    main()
