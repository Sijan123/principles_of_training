// The Science of Training - book structure.
// Each chapter's content lives in content/<id>.html as a fragment (no <html> shell).

export const book = {
  title: 'The Science of Training',
  subtitle: 'Anatomy, Physiology, Adaptation & Fuel — A Visual Guide',
  edition: 'First edition · 2026',
  author: 'Sijan Pahari',
};

export const parts = [
  { id: 'p1', n: 'I',   title: 'The Machine',    blurb: 'Anatomy — the hardware you train.',                    hue: 'crimson' },
  { id: 'p2', n: 'II',  title: 'The Engine',     blurb: 'Physiology — how energy becomes movement.',            hue: 'teal' },
  { id: 'p3', n: 'III', title: 'The Training',   blurb: 'Endurance, HIIT, strength — and what each changes.',   hue: 'amber' },
  { id: 'p4', n: 'IV',  title: 'The Muscle Map', blurb: 'Every major muscle: what it does, what trains it.',          hue: 'indigo' },
  { id: 'p5', n: 'V',   title: 'The Fuel',       blurb: 'Nutrition — supplying and rebuilding the system.',      hue: 'green' },
  { id: 'p6', n: 'VI',  title: 'The Practice',   blurb: 'Programming, testing, individuality, longevity.',            hue: 'violet' },
  { id: 'bm', n: '',    title: 'Reference',      blurb: 'Evidence guide, glossary and sources.',                      hue: 'slate' },
];

// ch: display number | id: file stem | kw: search keywords
export const chapters = [
  // ---- PART I - THE MACHINE
  { id:'ch01', part:'p1', ch:1,  title:'How the Body Is Organised', sub:'From molecule to movement: the levels of structure',
    kw:['anatomy','tissue','homeostasis','planes of motion','organ system','cell','connective tissue','fascia','scale'] },
  { id:'ch02', part:'p1', ch:2,  title:'Bones, Joints & Levers', sub:'The skeleton as a living, adapting lever system',
    kw:['bone','joint','lever','torque','moment arm','osteoblast','Wolff law','cartilage','synovial','range of motion'] },
  { id:'ch03', part:'p1', ch:3,  title:'Muscle Architecture', sub:'Whole muscle to myofibril — and why shape dictates function',
    kw:['muscle','fascicle','pennation angle','PCSA','tendon','myofibril','epimysium','muscle-tendon unit','architecture'] },
  { id:'ch04', part:'p1', ch:4,  title:'Inside the Sarcomere', sub:'The cross-bridge cycle, and the two curves that govern force',
    kw:['sliding filament','actin','myosin','cross-bridge','calcium','troponin','length-tension','force-velocity','titin','ATP'] },
  { id:'ch05', part:'p1', ch:5,  title:'Fibre Types & Motor Units', sub:'Slow, fast, and the recruitment order that decides who works',
    kw:['type I','type IIa','type IIx','motor unit','size principle','rate coding','Henneman','myosin heavy chain','fibre type'] },
  { id:'ch06', part:'p1', ch:6,  title:'The Nervous System in Motion', sub:'Intent to contraction: drive, feedback, skill and central fatigue',
    kw:['motor cortex','proprioception','golgi tendon organ','muscle spindle','reflex','stretch-shortening cycle','central fatigue','coordination'] },

  // ---- PART II - THE ENGINE
  { id:'ch07', part:'p2', ch:7,  title:'The Energy Systems', sub:'Phosphagen, glycolytic, oxidative — always all three, never equally',
    kw:['ATP','phosphocreatine','glycolysis','oxidative phosphorylation','lactate','energy system','anaerobic','aerobic','PCr'] },
  { id:'ch08', part:'p2', ch:8,  title:'Mitochondria & Fuel Selection', sub:'The oxidative machine, and the crossover from fat to carbohydrate',
    kw:['mitochondria','PGC-1alpha','electron transport chain','fat oxidation','crossover concept','FATmax','biogenesis','citrate synthase'] },
  { id:'ch09', part:'p2', ch:9,  title:'The Heart & Circulation', sub:'Cardiac output, stroke volume, and the Fick equation',
    kw:['heart','stroke volume','cardiac output','Fick equation','VO2max','athlete heart','blood pressure','capillary','a-vO2 difference'] },
  { id:'ch10', part:'p2', ch:10, title:'Breathing & Gas Exchange', sub:'Ventilation, diffusion, and whether lungs ever limit you',
    kw:['ventilation','diaphragm','gas exchange','oxyhaemoglobin','respiratory muscle','EIAH','breathing','VE'] },
  { id:'ch11', part:'p2', ch:11, title:'Blood, Fluid & Heat', sub:'Plasma volume, haemoglobin mass, and the thermal cost of work',
    kw:['plasma volume','haemoglobin mass','blood volume','thermoregulation','sweat','core temperature','cardiovascular drift'] },
  { id:'ch12', part:'p2', ch:12, title:'Hormones & Molecular Signalling', sub:'From testosterone to mTOR: how a session becomes an adaptation',
    kw:['testosterone','growth hormone','IGF-1','cortisol','insulin','catecholamines','mTOR','AMPK','myokine','signalling'] },

  // ---- PART III - THE TRAINING
  { id:'ch13', part:'p3', ch:13, title:'The Laws of Adaptation', sub:'Overload, specificity, fatigue — the rules every method obeys',
    kw:['overload','specificity','SAID principle','supercompensation','fitness-fatigue','reversibility','dose-response','individuality'] },
  { id:'ch14', part:'p3', ch:14, title:'Endurance Training', sub:'Zones, thresholds, and the distribution elites actually use',
    kw:['endurance','zone 2','LT1','LT2','polarized','pyramidal','threshold','long run','tempo','durability','base training'] },
  { id:'ch15', part:'p3', ch:15, title:'HIIT & Sprint Interval Training', sub:'Protocol design, time near VO2max, and what intensity buys you',
    kw:['HIIT','SIT','Tabata','4x4','30-15','intervals','VO2max','EPOC','work rest ratio','Wingate','REHIT'] },
  { id:'ch16', part:'p3', ch:16, title:'Strength', sub:'Neural drive, maximal force and rate of force development',
    kw:['strength','1RM','neural adaptation','rate of force development','RFD','heavy load','intent','load specificity'] },
  { id:'ch17', part:'p3', ch:17, title:'Hypertrophy', sub:'Mechanical tension, volume, and proximity to failure',
    kw:['hypertrophy','mechanical tension','protein synthesis','volume','sets per week','reps in reserve','failure','range of motion','satellite cell'] },
  { id:'ch18', part:'p3', ch:18, title:'Power, Speed & Plyometrics', sub:'The stretch-shortening cycle and the force-velocity profile',
    kw:['power','plyometrics','stretch-shortening cycle','sprint','jump','force-velocity profile','contrast training','elasticity'] },
  { id:'ch19', part:'p3', ch:19, title:'Mobility & Connective Tissue', sub:'Loading tendon, ligament and bone — the slow tissues',
    kw:['mobility','flexibility','stretch tolerance','tendon stiffness','heavy slow resistance','isometric','collagen','bone density'] },
  { id:'ch20', part:'p3', ch:20, title:'Concurrent Training', sub:'Can you build an engine and a chassis at once?',
    kw:['concurrent training','interference effect','AMPK','mTOR','hybrid athlete','session sequencing','recovery window'] },
  { id:'ch21', part:'p3', ch:21, title:'Programming & Periodization', sub:'Turning principles into weeks, blocks and a season',
    kw:['periodization','block periodization','mesocycle','autoregulation','RPE','RIR','deload','taper','progression','annual plan'] },

  // ---- PART IV - THE MUSCLE MAP
  { id:'ch22', part:'p4', ch:22, title:'Lower Body', sub:'Quadriceps, hamstrings, glutes, adductors, calves',
    kw:['quadriceps','hamstrings','gluteus maximus','adductor','gastrocnemius','soleus','squat','deadlift','hip thrust','calf raise'] },
  { id:'ch23', part:'p4', ch:23, title:'Upper Body — Push', sub:'Pectorals, deltoids, triceps and the shoulder complex',
    kw:['pectoralis major','deltoid','triceps','bench press','overhead press','dip','scapula','rotator cuff'] },
  { id:'ch24', part:'p4', ch:24, title:'Upper Body — Pull', sub:'Lats, traps, rhomboids, biceps and grip',
    kw:['latissimus dorsi','trapezius','rhomboid','biceps','brachialis','row','pull-up','grip','forearm'] },
  { id:'ch25', part:'p4', ch:25, title:'The Core & Spine', sub:'Bracing, intra-abdominal pressure and anti-movement',
    kw:['core','rectus abdominis','oblique','transverse abdominis','erector spinae','intra-abdominal pressure','bracing','pelvic floor'] },
  { id:'ch26', part:'p4', ch:26, title:'The Activation Atlas', sub:'What running, cycling, swimming, rowing and the big lifts recruit',
    kw:['activation','running muscles','cycling muscles','swimming','rowing','EMG','prime mover','synergist','stabiliser'] },

  // ---- PART V - THE FUEL
  { id:'ch27', part:'p5', ch:27, title:'From Plate to Mitochondrion', sub:'Digestion, absorption, transport — and training the gut',
    kw:['digestion','absorption','SGLT1','GLUT5','gut training','gastric emptying','GI distress','osmolality'] },
  { id:'ch28', part:'p5', ch:28, title:'Carbohydrate', sub:'Glycogen, intake rates, loading and train-low',
    kw:['carbohydrate','glycogen','glucose','fructose','90 g per hour','carb loading','train low','sleep low','bonking','gel'] },
  { id:'ch29', part:'p5', ch:29, title:'Protein', sub:'Dose, distribution, quality and the leucine threshold',
    kw:['protein','leucine','muscle protein synthesis','1.6 g/kg','distribution','whey','casein','DIAAS','plant protein','deficit'] },
  { id:'ch30', part:'p5', ch:30, title:'Fat', sub:'Oxidation capacity, essential fats, and the keto question',
    kw:['fat','fatty acid','omega-3','ketogenic diet','fat adaptation','intramuscular triglyceride','FATmax'] },
  { id:'ch31', part:'p5', ch:31, title:'Micronutrients', sub:'Iron, vitamin D, calcium — and the antioxidant paradox',
    kw:['iron','ferritin','vitamin D','calcium','magnesium','zinc','B vitamins','antioxidant','micronutrient'] },
  { id:'ch32', part:'p5', ch:32, title:'Hydration & Electrolytes', sub:'Sweat rate, sodium, and both ends of the fluid error',
    kw:['hydration','sweat rate','sodium','electrolyte','dehydration','hyponatraemia','drinking to thirst'] },
  { id:'ch33', part:'p5', ch:33, title:'Supplements', sub:'A tiered reading of the evidence, with doses',
    kw:['creatine','caffeine','beta-alanine','nitrate','beetroot','sodium bicarbonate','HMB','collagen','ergogenic aid'] },
  { id:'ch34', part:'p5', ch:34, title:'Fuelling Playbooks', sub:'Day plans and a food atlas for each training goal',
    kw:['meal plan','fuelling','food atlas','pre workout','post workout','race day','fat loss','bulking','energy availability'] },

  // ---- PART VI - THE PRACTICE
  { id:'ch35', part:'p6', ch:35, title:'Testing & Monitoring', sub:'Measuring the engine, the chassis and the readiness',
    kw:['VO2max test','lactate test','critical power','FTP','1RM test','jump test','HRV','readiness','velocity based training'] },
  { id:'ch36', part:'p6', ch:36, title:'Recovery, Fatigue & Overtraining', sub:'Sleep, soreness, modalities, and the overreaching spectrum',
    kw:['recovery','sleep','DOMS','muscle damage','overreaching','overtraining','cold water immersion','massage','compression'] },
  { id:'ch37', part:'p6', ch:37, title:'Training in Heat, Cold & Altitude', sub:'Environmental stress as a training tool',
    kw:['heat acclimation','altitude','live high train low','cold','hypoxia','haemoglobin mass','blood flow restriction'] },
  { id:'ch38', part:'p6', ch:38, title:'Individual Differences', sub:'Age, sex, menstrual cycle, genetics and responders',
    kw:['sex differences','menstrual cycle','masters athlete','youth training','genetics','responder','ageing','sarcopenia'] },
  { id:'ch39', part:'p6', ch:39, title:'Injury, Load & Longevity', sub:'Tissue tolerance, load management and training for sixty years',
    kw:['injury','load management','acute chronic workload','tissue tolerance','return to training','longevity','healthspan'] },
  { id:'ch40', part:'p6', ch:40, title:'Warm-Up, Mobility & Stretching', sub:'What to do before you train — animated, timed, and justified',
    kw:['warm up','RAMP protocol','dynamic stretching','static stretching','mobility drill','activation','post-activation potentiation','cool down','foam rolling'] },
  { id:'ch41', part:'p6', ch:41, title:'Strength Work for Runners & Cyclists', sub:'Which muscles to load, how heavy, and why it makes you faster',
    kw:['strength for runners','running economy','heavy strength training endurance','plyometrics runners','calf raise','Nordic curl','single leg','cyclist strength'] },
  { id:'ch42', part:'p6', ch:42, title:'Rehabilitation & Return to Running', sub:'Tendon, muscle and bone injuries — the loading progressions that work',
    kw:['rehab','rehabilitation','Achilles tendinopathy','patellar tendinopathy','plantar fasciitis','shin splints','bone stress injury','hamstring strain','ITB','return to run'] },
  { id:'ch43', part:'p6', ch:43, title:'Case Study — Iliotibial Band Syndrome', sub:'One injury, examined all the way down: anatomy, mechanism, evidence, full rehab plan',
    kw:['iliotibial band','ITB syndrome','ITBS','lateral knee pain','runner knee','hip drop','gluteus medius','compression theory','cadence','tensor fasciae latae','Renne','Noble test'] },
  { id:'ch44', part:'p6', ch:44, title:'Indoor Cycling — The Workout Library', sub:'Every turbo session, what it changes, and the plan it belongs in',
    kw:['indoor cycling','turbo trainer','Zwift','sweet spot','over-unders','FTP','SST','30/15','threshold intervals','torque intervals','cadence','trainer plan','smart trainer','TSS'] },

  // ---- BACK MATTER
  { id:'bm01', part:'bm', ch:null, title:'How to Read the Evidence', sub:'Study design, effect size, and why most headlines mislead',
    kw:['evidence','meta-analysis','effect size','randomised trial','confounding','statistics','study quality'] },
  { id:'bm02', part:'bm', ch:null, title:'Glossary', sub:'Every term in the book, defined',
    kw:['glossary','definitions','terms'] },
  { id:'bm03', part:'bm', ch:null, title:'References & Further Reading', sub:'Primary sources, by chapter',
    kw:['references','sources','bibliography','further reading'] },
];

export const partOf = Object.fromEntries(parts.map(p => [p.id, p]));

export function slugOf(c) {
  const base = c.title.toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return c.id + '-' + base;
}
