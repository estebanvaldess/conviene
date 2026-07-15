import { mapTenderStatus } from './status-map';
import { isNaturalPersonRut, normalizeRut } from './rut';
import type { IngestStore, MercadoPublicoClient, Source } from './types';

const ALERT_AT = 7_000;
const CUT_P2_AT = 8_500;
const MAX_ATTEMPTS = 3;

export type IngestResult = { p1: PhaseResult; p2: PhaseResult; stoppedP2: boolean };
type PhaseResult = { req: number; ok: number; fail: number };

const empty = (): PhaseResult => ({ req: 0, ok: 0, fail: 0 });
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runDailyIngest(params: { client: MercadoPublicoClient; store: IngestStore; runDate: string; throttleMs?: number }): Promise<IngestResult> {
  const started = Date.now();
  const p1 = empty();
  const p2 = empty();
  let stoppedP2 = false;

  try {
    const poCodes = await guardedRequest(params.store, params.runDate, p1, 'api_oc', 'list:purchase_orders', () => params.client.listPurchaseOrderCodes(params.runDate), params.throttleMs) ?? [];
    for (const code of poCodes) {
      const po = await guardedRequest(params.store, params.runDate, p1, 'api_oc', code, () => params.client.getPurchaseOrder(code), params.throttleMs);
      if (po) await params.store.upsertPurchaseOrder({ ...po, supplierRut: normalizeRut(po.supplierRut), supplierIsNaturalPerson: isNaturalPersonRut(po.supplierRut) });
    }
  } catch {
    p1.fail += 1;
  }
  await params.store.insertRun({ run_date: params.runDate, source: 'api_oc', req_count: p1.req, ok_count: p1.ok, fail_count: p1.fail, duration_ms: Date.now() - started });

  if ((await params.store.countApiRequests(params.runDate)) >= CUT_P2_AT) {
    stoppedP2 = true;
    await params.store.insertEvent({ type: 'guardrail_alert', payload: { threshold: CUT_P2_AT, action: 'stop_p2' } });
  } else {
    const p2Start = Date.now();
    try {
      const tenderCodes = await guardedRequest(params.store, params.runDate, p2, 'api_tenders', 'list:tenders', () => params.client.listTenderCodes(params.runDate), params.throttleMs) ?? [];
      for (const code of tenderCodes) {
        if ((await params.store.countApiRequests(params.runDate)) >= CUT_P2_AT) {
          stoppedP2 = true;
          await params.store.insertEvent({ type: 'guardrail_alert', payload: { threshold: CUT_P2_AT, action: 'stop_p2', code } });
          await params.store.queueRetry(code, 'api_tenders', 0, tomorrowClt());
          break;
        }
        const tender = await guardedRequest(params.store, params.runDate, p2, 'api_tenders', code, () => params.client.getTender(code), params.throttleMs);
        if (!tender) continue;
        const canonicalStatus = mapTenderStatus(tender.status);
        if (canonicalStatus === 'unknown') await params.store.insertEvent({ type: 'unknown_status_seen', payload: { code, status: tender.status } });
        await params.store.upsertTender({ ...tender, canonicalStatus, itemsText: buildItemsText(tender.items) });
      }
    } catch {
      p2.fail += 1;
    }
    await params.store.insertRun({ run_date: params.runDate, source: 'api_tenders', req_count: p2.req, ok_count: p2.ok, fail_count: p2.fail, duration_ms: Date.now() - p2Start });
  }
  return { p1, p2, stoppedP2 };
}

async function guardedRequest<T>(store: IngestStore, runDate: string, phase: PhaseResult, source: Source, code: string, fn: () => Promise<T>, throttleMs = 500): Promise<T | null> {
  await sleep(throttleMs);
  phase.req += 1;
  await store.insertEvent({ type: 'api_request', payload: { source, code, runDate } });
  const count = await store.countApiRequests(runDate);
  if (count === ALERT_AT) await store.insertEvent({ type: 'guardrail_alert', payload: { threshold: ALERT_AT, action: 'alert' } });
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const result = await fn();
      phase.ok += 1;
      return result;
    } catch (error) {
      if (!isRetryable(error) || attempt === MAX_ATTEMPTS) {
        phase.fail += 1;
        await store.queueRetry(code, source, attempt, nextRetry(attempt));
        await store.insertEvent({ type: 'ingest_retry_queued', payload: { source, code, attempts: attempt } });
        return null;
      }
      await sleep(100 * 2 ** (attempt - 1));
    }
  }
  return null;
}

function isRetryable(error: unknown): boolean {
  const status = typeof error === 'object' && error && 'status' in error ? Number((error as { status: unknown }).status) : 0;
  return status === 429 || status >= 500;
}
function nextRetry(attempt: number): Date { return new Date(Date.now() + 60_000 * 2 ** attempt); }
function tomorrowClt(): Date { return new Date(Date.now() + 24 * 60 * 60 * 1000); }
export function buildItemsText(items: { productName?: string; specText?: string }[] = []): string { return items.map((i) => `${i.productName ?? ''} ${i.specText ?? ''}`.trim()).filter(Boolean).join(' '); }
