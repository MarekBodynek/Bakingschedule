const XLSX = require('xlsx');

const wb = XLSX.readFile('/Users/marekbodynek/Downloads/Bake of/Bake Of Gorica/SLIVNICA bakeoff-box plate program.xlsx');
console.log('Sheets:', wb.SheetNames);
console.log();

wb.SheetNames.forEach(sheetName => {
  console.log(`\n=== Sheet: ${sheetName} ===`);
  const ws = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  console.log(`Rows: ${data.length}`);
  console.log('\nFirst 15 rows:');
  data.slice(0, 15).forEach((row, idx) => {
    console.log(`Row ${idx + 1}:`, JSON.stringify(row));
  });
});
