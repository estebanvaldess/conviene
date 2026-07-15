export function normalizeRut(value: string): string { return value.replace(/\./g, '').replace(/\s+/g, '').toUpperCase(); }
export function validateRut(value: string): boolean {
  const rut = normalizeRut(value); const m = rut.match(/^(\d{1,8})-([0-9K])$/); if (!m) return false;
  let sum = 0, mul = 2; for (const d of [...m[1]].reverse()) { sum += Number(d) * mul; mul = mul === 7 ? 2 : mul + 1; }
  const dv = 11 - (sum % 11); const expected = dv === 11 ? '0' : dv === 10 ? 'K' : String(dv); return expected === m[2];
}
