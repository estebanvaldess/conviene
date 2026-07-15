import { readFileSync } from 'node:fs';
const file = process.argv[2];
if (!file) throw new Error('Uso: node scripts/validate-backfill-header.mjs <csv-con-cabecera>');
const header = readFileSync(file, 'utf8').split(/\r?\n/)[0] ?? '';
console.log(header.split(';').map((c, i) => `${i + 1}\t${c}`).join('\n'));
