import XLSX from 'xlsx';

const wb = XLSX.readFile('/Users/marekbodynek/Downloads/Bake of/Bake Of Gorica/SLIVNICA bakeoff-box plate program.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

console.log('Testing parser logic...\n');

const products = [];
const programs = new Set();
const ovenCapacities = [];
const detectedProgramDurations = {};

for (let i = 0; i < jsonData.length; i++) {
  const row = jsonData[i];

  // Parse oven configuration from columns 6-7
  if (i >= 4) {
    const ovenNumber = parseInt(row[6]);
    const ovenTrays = parseInt(row[7]);
    if (ovenNumber && ovenTrays && !isNaN(ovenNumber) && !isNaN(ovenTrays)) {
      if (!ovenCapacities[ovenNumber - 1]) {
        ovenCapacities[ovenNumber - 1] = ovenTrays;
        console.log(`🔧 Detected Oven ${ovenNumber}: ${ovenTrays} trays`);
      }
    }
  }

  // Parse program durations from columns 9-10
  if (i >= 4) {
    const programName = String(row[9] || '').trim();
    const duration = parseInt(row[10]);
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
