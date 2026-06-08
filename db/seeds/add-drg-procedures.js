// db/seeds/add-drg-procedures.js
//
// Merge a curated set of common, shoppable INPATIENT MS-DRG procedures into
// data/procedures.json (idempotent on code+code_type). DRGs are how inpatient
// stays are priced in hospital MRFs (esp. the XLSX files) — this unlocks the
// ~365 XLSX hospitals and adds high-value inpatient content alongside the
// outpatient CPT set. Titles validated against a real MRF (Jackson Health,
// MS-DRG v42) + canonical CMS nomenclature; descriptions written plain-English.
// After running, re-run: npm run seed:procedures.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const path = resolve(__dirname, '..', '..', 'data', 'procedures.json');

// code, name (clean), slug, category, search_priority, description, aliases
const D = (code, name, slug, category, sp, description, aliases) => ({
  code, code_type: 'MS-DRG', name, slug, description, category,
  shoppable_service: true, search_priority: sp, aliases, source: 'ms_drg_v42',
});

const drgs = [
  // Maternity
  D('765', 'Cesarean section (with complications)', 'cesarean-section', 'maternity', 5, 'A C-section delivery where the mother or baby had additional complications or conditions during the stay. One of the most common reasons for a hospital admission.', ['c-section', 'csection', 'cesarean delivery']),
  D('766', 'Cesarean section (without complications)', 'cesarean-section-uncomplicated', 'maternity', 5, 'A standard C-section delivery without major additional complications.', ['c-section', 'cesarean delivery']),
  D('774', 'Vaginal delivery (with complications)', 'vaginal-delivery-complicated', 'maternity', 5, 'A vaginal childbirth admission where complicating diagnoses were present.', ['childbirth', 'giving birth', 'labor and delivery']),
  D('775', 'Vaginal delivery (without complications)', 'vaginal-delivery-inpatient', 'maternity', 5, 'A routine vaginal childbirth hospital stay without complicating diagnoses — the most common delivery type. Reflects the full inpatient stay, not just the delivery service.', ['childbirth', 'giving birth', 'natural birth', 'labor and delivery']),
  // Orthopedic
  D('470', 'Hip or knee replacement (without major complications)', 'hip-or-knee-replacement', 'orthopedic', 5, 'Major joint replacement of the hip or knee without major complications — among the most common and most shopped inpatient surgeries.', ['joint replacement', 'knee replacement', 'hip replacement', 'total knee', 'total hip']),
  D('469', 'Hip or knee replacement (with major complications)', 'hip-or-knee-replacement-complex', 'orthopedic', 4, 'Major hip or knee joint replacement where major complications or conditions were present.', ['joint replacement', 'knee replacement', 'hip replacement']),
  D('480', 'Hip and femur procedures (with major complications)', 'hip-femur-procedures-mcc', 'orthopedic', 3, 'Surgical repair of the hip or thigh bone (other than joint replacement), such as fixing a fracture, with major complications.', ['hip fracture repair', 'broken hip surgery']),
  D('481', 'Hip and femur procedures (with complications)', 'hip-femur-procedures-cc', 'orthopedic', 3, 'Surgical repair of the hip or thigh bone (other than joint replacement) with complications.', ['hip fracture repair', 'broken hip surgery']),
  D('482', 'Hip and femur procedures (without complications)', 'hip-femur-procedures', 'orthopedic', 3, 'Surgical repair of the hip or thigh bone (other than joint replacement) without major complications.', ['hip fracture repair', 'broken hip surgery']),
  D('460', 'Spinal fusion, except cervical (without major complications)', 'spinal-fusion', 'orthopedic', 4, 'Surgery to permanently join two or more vertebrae in the back, excluding the neck, without major complications.', ['back surgery', 'lumbar fusion', 'spine surgery']),
  // Cardiac
  D('247', 'Coronary stent (drug-eluting, without major complications)', 'coronary-stent-inpatient', 'cardiac', 4, 'A hospital stay to open a blocked heart artery and place a medication-coated stent, without major complications. Reflects the full inpatient admission.', ['heart stent', 'angioplasty', 'cardiac stent', 'pci']),
  D('280', 'Heart attack, discharged alive (with major complications)', 'heart-attack-mcc', 'cardiac', 3, 'Hospital care for an acute heart attack (myocardial infarction) with major complications, where the patient survived to discharge.', ['heart attack', 'myocardial infarction', 'mi']),
  D('281', 'Heart attack, discharged alive (with complications)', 'heart-attack-cc', 'cardiac', 3, 'Hospital care for an acute heart attack with complications, discharged alive.', ['heart attack', 'myocardial infarction']),
  D('282', 'Heart attack, discharged alive (without complications)', 'heart-attack', 'cardiac', 3, 'Hospital care for an acute heart attack without major complications, discharged alive.', ['heart attack', 'myocardial infarction']),
  D('291', 'Heart failure and shock (with major complications)', 'heart-failure-mcc', 'cardiac', 4, 'Hospital admission for heart failure with major complications — one of the most frequent inpatient diagnoses.', ['heart failure', 'congestive heart failure', 'chf']),
  D('292', 'Heart failure and shock (with complications)', 'heart-failure-cc', 'cardiac', 4, 'Hospital admission for heart failure with complications.', ['heart failure', 'congestive heart failure', 'chf']),
  D('293', 'Heart failure and shock (without complications)', 'heart-failure', 'cardiac', 4, 'Hospital admission for heart failure without major complications.', ['heart failure', 'congestive heart failure', 'chf']),
  D('308', 'Cardiac arrhythmia (with major complications)', 'cardiac-arrhythmia-mcc', 'cardiac', 2, 'Hospital care for an irregular heartbeat or conduction disorder with major complications.', ['irregular heartbeat', 'atrial fibrillation', 'afib']),
  D('309', 'Cardiac arrhythmia (with complications)', 'cardiac-arrhythmia-cc', 'cardiac', 2, 'Hospital care for an irregular heartbeat or conduction disorder with complications.', ['irregular heartbeat', 'atrial fibrillation', 'afib']),
  D('310', 'Cardiac arrhythmia (without complications)', 'cardiac-arrhythmia', 'cardiac', 2, 'Hospital care for an irregular heartbeat or conduction disorder without major complications.', ['irregular heartbeat', 'atrial fibrillation', 'afib']),
  // Stroke / neuro
  D('064', 'Stroke (with major complications)', 'stroke-mcc', 'neurological', 3, 'Hospital care for an intracranial hemorrhage or cerebral infarction (stroke) with major complications.', ['stroke', 'brain bleed', 'cerebral infarction']),
  D('065', 'Stroke (with complications)', 'stroke-cc', 'neurological', 3, 'Hospital care for a stroke (intracranial hemorrhage or cerebral infarction) with complications.', ['stroke', 'cerebral infarction']),
  D('066', 'Stroke (without complications)', 'stroke', 'neurological', 3, 'Hospital care for a stroke (intracranial hemorrhage or cerebral infarction) without major complications.', ['stroke', 'cerebral infarction']),
  // Respiratory
  D('189', 'Pulmonary edema and respiratory failure', 'respiratory-failure', 'respiratory', 3, 'Hospital care for fluid in the lungs or failure of the lungs to oxygenate the blood adequately.', ['respiratory failure', 'fluid in lungs']),
  D('190', 'COPD (with major complications)', 'copd-mcc', 'respiratory', 3, 'Hospital admission for chronic obstructive pulmonary disease (COPD) with major complications.', ['copd', 'emphysema', 'chronic bronchitis']),
  D('191', 'COPD (with complications)', 'copd-cc', 'respiratory', 3, 'Hospital admission for COPD with complications.', ['copd', 'emphysema']),
  D('192', 'COPD (without complications)', 'copd', 'respiratory', 3, 'Hospital admission for COPD without major complications.', ['copd', 'emphysema']),
  D('193', 'Pneumonia and pleurisy (with major complications)', 'pneumonia-mcc', 'respiratory', 4, 'Hospital care for simple pneumonia or pleurisy with major complications.', ['pneumonia', 'lung infection']),
  D('194', 'Pneumonia and pleurisy (with complications)', 'pneumonia-cc', 'respiratory', 4, 'Hospital care for simple pneumonia or pleurisy with complications.', ['pneumonia', 'lung infection']),
  D('195', 'Pneumonia and pleurisy (without complications)', 'pneumonia', 'respiratory', 4, 'Hospital care for simple pneumonia or pleurisy without major complications.', ['pneumonia', 'lung infection']),
  // Sepsis
  D('871', 'Sepsis (with major complications)', 'sepsis-mcc', 'infectious', 4, 'Hospital care for septicemia or severe sepsis (a life-threatening response to infection) with major complications, without prolonged ventilation.', ['sepsis', 'blood infection', 'septicemia']),
  D('872', 'Sepsis (without major complications)', 'sepsis', 'infectious', 4, 'Hospital care for septicemia or severe sepsis without major complications or prolonged ventilation.', ['sepsis', 'blood infection', 'septicemia']),
  // GI / digestive
  D('329', 'Major bowel procedure (with major complications)', 'major-bowel-procedure-mcc', 'digestive', 3, 'Major surgery on the small or large intestine with major complications.', ['bowel surgery', 'colon surgery', 'intestinal surgery']),
  D('330', 'Major bowel procedure (with complications)', 'major-bowel-procedure-cc', 'digestive', 3, 'Major surgery on the small or large intestine with complications.', ['bowel surgery', 'colon surgery']),
  D('331', 'Major bowel procedure (without complications)', 'major-bowel-procedure', 'digestive', 3, 'Major surgery on the small or large intestine without major complications.', ['bowel surgery', 'colon surgery']),
  D('377', 'GI hemorrhage (with major complications)', 'gi-bleed-mcc', 'digestive', 2, 'Hospital care for gastrointestinal bleeding with major complications.', ['gi bleed', 'gastrointestinal bleeding', 'internal bleeding']),
  D('378', 'GI hemorrhage (with complications)', 'gi-bleed-cc', 'digestive', 2, 'Hospital care for gastrointestinal bleeding with complications.', ['gi bleed', 'gastrointestinal bleeding']),
  D('379', 'GI hemorrhage (without complications)', 'gi-bleed', 'digestive', 2, 'Hospital care for gastrointestinal bleeding without major complications.', ['gi bleed', 'gastrointestinal bleeding']),
  D('391', 'Digestive disorders, e.g. gastroenteritis (with major complications)', 'digestive-disorders-mcc', 'digestive', 2, 'Hospital care for esophagitis, gastroenteritis, or other digestive disorders with major complications.', ['gastroenteritis', 'stomach flu', 'esophagitis']),
  D('392', 'Digestive disorders, e.g. gastroenteritis (without major complications)', 'digestive-disorders', 'digestive', 2, 'Hospital care for esophagitis, gastroenteritis, or other digestive disorders without major complications.', ['gastroenteritis', 'stomach flu', 'esophagitis']),
  D('417', 'Laparoscopic gallbladder removal (with major complications)', 'gallbladder-removal-mcc', 'digestive', 3, 'Minimally invasive (keyhole) surgery to remove the gallbladder, with major complications.', ['gallbladder removal', 'cholecystectomy', 'gallbladder surgery']),
  D('418', 'Laparoscopic gallbladder removal (with complications)', 'gallbladder-removal-cc', 'digestive', 3, 'Minimally invasive surgery to remove the gallbladder, with complications.', ['gallbladder removal', 'cholecystectomy']),
  D('419', 'Laparoscopic gallbladder removal (without complications)', 'gallbladder-removal', 'digestive', 3, 'Minimally invasive (keyhole) surgery to remove the gallbladder without major complications.', ['gallbladder removal', 'cholecystectomy', 'gallbladder surgery']),
  // Renal / urinary
  D('682', 'Kidney failure (with major complications)', 'kidney-failure-mcc', 'kidney', 2, 'Hospital care for renal (kidney) failure with major complications.', ['kidney failure', 'renal failure']),
  D('683', 'Kidney failure (with complications)', 'kidney-failure-cc', 'kidney', 2, 'Hospital care for renal failure with complications.', ['kidney failure', 'renal failure']),
  D('684', 'Kidney failure (without complications)', 'kidney-failure', 'kidney', 2, 'Hospital care for renal failure without major complications.', ['kidney failure', 'renal failure']),
  D('689', 'Kidney or urinary tract infection (with major complications)', 'uti-mcc', 'kidney', 2, 'Hospital care for a kidney or urinary tract infection with major complications.', ['uti', 'urinary tract infection', 'kidney infection']),
  D('690', 'Kidney or urinary tract infection (without major complications)', 'uti', 'kidney', 2, 'Hospital care for a kidney or urinary tract infection without major complications.', ['uti', 'urinary tract infection', 'kidney infection']),
  // Endocrine
  D('637', 'Diabetes (with major complications)', 'diabetes-mcc', 'endocrine', 2, 'Hospital admission for diabetes with major complications.', ['diabetes', 'diabetic ketoacidosis', 'dka']),
  D('638', 'Diabetes (with complications)', 'diabetes-cc', 'endocrine', 2, 'Hospital admission for diabetes with complications.', ['diabetes']),
  D('639', 'Diabetes (without complications)', 'diabetes', 'endocrine', 2, 'Hospital admission for diabetes without major complications.', ['diabetes']),
  // Skin / infectious
  D('602', 'Cellulitis (with major complications)', 'cellulitis-mcc', 'infectious', 2, 'Hospital care for cellulitis (a bacterial skin infection) with major complications.', ['cellulitis', 'skin infection']),
  D('603', 'Cellulitis (without major complications)', 'cellulitis', 'infectious', 2, 'Hospital care for cellulitis (a bacterial skin infection) without major complications.', ['cellulitis', 'skin infection']),
  // Other common
  D('312', 'Syncope and collapse', 'syncope', 'general', 2, 'Hospital evaluation for fainting (syncope) or collapse.', ['fainting', 'passing out', 'syncope']),
  D('313', 'Chest pain', 'chest-pain', 'cardiac', 3, 'Hospital evaluation of chest pain when a more specific cause is not established.', ['chest pain']),
  D('743', 'Uterine and adnexa surgery, non-cancer (without complications)', 'uterine-surgery', 'womens-health', 2, 'Surgery on the uterus or ovaries/tubes for non-cancerous conditions, without major complications — e.g. hysterectomy for benign disease.', ['hysterectomy', 'uterine surgery', 'fibroid surgery']),
  D('885', 'Psychiatric admission (psychoses)', 'psychiatric-admission', 'behavioral', 2, 'Inpatient psychiatric care for psychoses such as schizophrenia or severe mood disorders.', ['psychiatric hospitalization', 'mental health admission', 'inpatient psychiatry']),
  D('945', 'Inpatient rehabilitation (with complications)', 'rehabilitation-cc', 'rehab', 2, 'Inpatient rehabilitation (e.g. after a stroke, surgery, or injury) with complications.', ['rehab', 'inpatient rehab', 'physical rehabilitation']),
  D('946', 'Inpatient rehabilitation (without complications)', 'rehabilitation', 'rehab', 2, 'Inpatient rehabilitation without major complications.', ['rehab', 'inpatient rehab']),
];

const dict = JSON.parse(readFileSync(path, 'utf8'));
const seen = new Set(dict.procedures.map((p) => `${p.code}|${p.code_type}`));
let added = 0, replaced = 0;
for (const d of drgs) {
  const key = `${d.code}|${d.code_type}`;
  const i = dict.procedures.findIndex((p) => `${p.code}|${p.code_type}` === key);
  if (i >= 0) { dict.procedures[i] = d; replaced++; } else { dict.procedures.push(d); added++; }
  seen.add(key);
}
// Sanity: unique slugs (slug collisions would break /procedure/[slug] routing).
const slugs = dict.procedures.map((p) => p.slug);
const dupSlugs = slugs.filter((s, i) => slugs.indexOf(s) !== i);
if (dupSlugs.length) { console.error('DUPLICATE SLUGS:', [...new Set(dupSlugs)]); process.exit(1); }

writeFileSync(path, JSON.stringify(dict, null, 2) + '\n');
console.log(`DRG merge: +${added} added, ${replaced} replaced. Total procedures now ${dict.procedures.length}.`);
console.log('Next: npm run seed:procedures');
