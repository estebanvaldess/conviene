export const CANONICAL_TENDER_STATUSES = ['open', 'closed', 'awarded', 'deserted', 'revoked', 'suspended', 'unknown'] as const;
export type CanonicalTenderStatus = (typeof CANONICAL_TENDER_STATUSES)[number];

const STATUS_MAP: Record<string, CanonicalTenderStatus> = {
  '5': 'open', publicada: 'open', abierta: 'open', recepcion: 'open',
  '6': 'closed', cerrada: 'closed', cierre: 'closed',
  '7': 'awarded', adjudicada: 'awarded',
  '8': 'deserted', desierta: 'deserted',
  '15': 'revoked', revocada: 'revoked',
  '16': 'suspended', suspendida: 'suspended',
};

export function mapTenderStatus(input: unknown): CanonicalTenderStatus {
  if (input === null || input === undefined) return 'unknown';
  const key = String(input).trim().toLowerCase();
  return STATUS_MAP[key] ?? 'unknown';
}
