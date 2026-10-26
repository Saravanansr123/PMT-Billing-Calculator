import * as XLSX from 'xlsx';

const ws = XLSX.utils.aoa_to_sheet([
  ['Project', 'Training Non-Billable'],
  ['conveyor samples', 40 / 24],
  ['Avala', 536 / 24]
]);
ws['B2'].z = '[h]:mm';
ws['B3'].z = '[h]:mm';

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

const readWb = XLSX.read(buf, { type: 'buffer' }); // without cellDates: true!
const readSheet = readWb.Sheets['Sheet1'];

const jsonRawFalse = XLSX.utils.sheet_to_json(readSheet, { header: 1, raw: false });
console.log('raw: false row 1:', jsonRawFalse[1]);
console.log('raw: false row 2:', jsonRawFalse[2]);
