import XLSX from 'xlsx';

const wb = XLSX.readFile('/Users/marekbodynek/Downloads/Bake of/Bake Of Gorica/Test/Gorica Pri Slivnici Configuration.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

console.log('Testing parser logic...\n');

// Show first 15 rows with all columns to understand structure
console.log('📄 FILE STRUCTURE (first 15 rows):');
console.log('='.repeat(120));
for (let i = 0; i < Math.min(15, jsonData.length); i++) {
  const row = jsonData[i];
  console.log(`Row ${i}:`);
  console.log(`  A-D (Products): [${row[0]}, ${row[1]}, ${row[2]}, ${row[3]}]`);
  console.log(`  E (unused): [${row[4]}]`);
  console.log(`  F-G (should be empty): [${row[5]}, ${row[6]}]`);
  console.log(`  G-H (Ovens): [${row[6]}, ${row[7]}]`);
  console.log(`  I (unused): [${row[8]}]`);
  console.log(`  J-K (Programs): [${row[9]}, ${row[10]}]`);
  console.log(`  L-T (Hours/Waves): [${row.slice(11, 20).join(', ')}]`);
  console.log('-'.repeat(120));
}

const products = [];
const programs = new Set();
const ovenCapacities = [];
const detectedProgramDurations = {};

for (let i = 0; i < jsonData.length; i++) {
  const row = jsonData[i];

  // Parse oven configuration from columns 5-6 (F-G)
  if (i >= 2 && i <= 10) {
    const ovenNumber = parseInt(row[5]);
    const ovenTrays = parseInt(row[6]);
    if (ovenNumber && ovenTrays && !isNaN(ovenNumber) && !isNaN(ovenTrays)) {
      if (!ovenCapacities[ovenNumber - 1]) {
        ovenCapacities[ovenNumber - 1] = ovenTrays;
        console.log(`🔧 Detected Oven ${ovenNumber}: ${ovenTrays} trays`);
      }
    }
  }

  // Parse program durations from columns 8-9 (I-J)
  if (i >= 2) {
    const programName = String(row[8] || '').trim();
    const duration = parseInt(row[9]);
    if (programName && duration && !isNaN(duration)) {
      const programMatch = programName.match(/program\s*(\d+)/i);
      if (programMatch) {
        const programNum = parseInt(programMatch[1]);
        if (!detectedProgramDurations[programNum]) {
          detectedProgramDurations[programNum] = duration;
          console.log(`⏱️ Detected Program ${programNum}: ${duration} minutes`);
        }
      }
    }
  }

  // Parse product data
  if (i >= 4) {
    const eanCode = String(row[0] || '').trim();
    const name = String(row[1] || '').trim();
    const program = parseInt(row[2]);
    const unitsOnTray = parseInt(row[3]);

    if (eanCode.toLowerCase().includes('oven') || eanCode.toLowerCase().includes('program')) {
      break;
    }

    if (!eanCode || !name || !program || !unitsOnTray) {
      continue;
    }

    products.push({
      sku: eanCode,
      name: name,
      program: program,
      unitsPerTray: unitsOnTray
    });

    programs.add(program);
  }
}

console.log('\n📦 Products loaded:', products.length);
console.log('\nFirst 5 products:');
products.slice(0, 5).forEach(p => {
  console.log(`  ${p.sku}: ${p.name} (Program ${p.program}, ${p.unitsPerTray}/tray)`);
});

console.log('\n🔧 Ovens:', ovenCapacities);
console.log('⏱️ Program durations:', detectedProgramDurations);
