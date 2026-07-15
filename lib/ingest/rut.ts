export function normalizeRut(value: string): string {
  return value.replace(/\./g, '').replace(/\s+/g, '').toUpperCase();
}
export function isNaturalPersonRut(value: string): boolean {
  const normalized = normalizeRut(value);
  const body = normalized.split('-')[0]?.replace(/\D/g, '');
  return Boolean(body) && Number(body) < 50_000_000;
}
export function hashRut(value: string): string {
  let hash = 0;
  for (const char of normalizeRut(value)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash.toString(16).padStart(8, '0');
}
