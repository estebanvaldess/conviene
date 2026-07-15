import { isNaturalPersonRut, normalizeRut } from './rut';
import type { PurchaseOrderInput } from './types';

export const REQUIRED_BACKFILL_COLUMNS = ['codigo', 'rut_proveedor'] as const;
export type BackfillValidation = { ok: boolean; missing: string[]; columns: string[] };

export function validateBackfillHeader(headerLine: string): BackfillValidation {
  const columns = parseCsvLine(headerLine).map((c) => c.trim().toLowerCase());
  const missing = REQUIRED_BACKFILL_COLUMNS.filter((required) => !columns.includes(required));
  return { ok: missing.length === 0, missing: [...missing], columns };
}

export function parsePurchaseOrderDump(csv: string): PurchaseOrderInput[] {
  const [header, ...rows] = csv.split(/\r?\n/).filter(Boolean);
  const validation = validateBackfillHeader(header ?? '');
  if (!validation.ok) throw new Error(`Columnas pendientes de validar por dueño: ${validation.missing.join(', ')}`);
  const columns = validation.columns;
  return rows.map((row) => {
    const values = parseCsvLine(row);
    const get = (name: string) => values[columns.indexOf(name)] ?? '';
    const supplierRut = normalizeRut(get('rut_proveedor'));
    return { code: get('codigo'), supplierRut, items: [], raw: { source: 'datos_abiertos', row: Object.fromEntries(columns.map((c, i) => [c, values[i] ?? ''])), supplier_is_natural_person: isNaturalPersonRut(supplierRut) } };
  }).filter((po) => po.code && po.supplierRut);
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') quoted = !quoted;
    else if (char === ';' && !quoted) { out.push(current); current = ''; }
    else current += char;
  }
  out.push(current);
  return out;
}
