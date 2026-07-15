import { hashRut } from './rut';
import type { EventRow } from './types';

export function anonymizeOldLeadEvents(events: EventRow[], now = new Date()): EventRow[] {
  const cutoff = addMonths(now, -12).getTime();
  return events.map((event) => {
    if (event.user_id || !event.created_at || new Date(event.created_at).getTime() >= cutoff || !event.payload || typeof event.payload.rut !== 'string') return event;
    const { rut, ...rest } = event.payload;
    void rut;
    return { ...event, payload: { ...rest, rut_hash: hashRut(event.payload.rut) } };
  });
}

export function summarizeOldEvents(events: EventRow[], now = new Date()): { kept: EventRow[]; summary: Record<string, number> } {
  const cutoff = addMonths(now, -24).getTime();
  const summary: Record<string, number> = {};
  const kept: EventRow[] = [];
  for (const event of events) {
    if (!event.created_at || new Date(event.created_at).getTime() >= cutoff) kept.push(event);
    else {
      const month = event.created_at.slice(0, 7) + '-01';
      summary[`${month}:${event.type}`] = (summary[`${month}:${event.type}`] ?? 0) + 1;
    }
  }
  return { kept, summary };
}
function addMonths(date: Date, months: number): Date { const copy = new Date(date); copy.setMonth(copy.getMonth() + months); return copy; }
