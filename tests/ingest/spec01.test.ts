import test from 'node:test';
import assert from 'node:assert/strict';
import { runDailyIngest, buildItemsText } from '../../lib/ingest/pipeline';
import { mapTenderStatus } from '../../lib/ingest/status-map';
import { isNaturalPersonRut } from '../../lib/ingest/rut';
import { resetRateLimits, validateEventType, rateLimit } from '../../lib/ingest/events';
import { validateBackfillHeader, parsePurchaseOrderDump } from '../../lib/ingest/backfill';
import type { EventRow, IngestStore } from '../../lib/ingest/types';

class MemoryStore implements IngestStore {
  events: EventRow[] = [];
  purchaseOrders = new Map<string, unknown>();
  tenders = new Map<string, unknown>();
  retries = new Map<string, unknown>();
  runs: unknown[] = [];
  constructor(private initialRequests = 0) {}
  async countApiRequests() { return this.initialRequests + this.events.filter((e) => e.type === 'api_request').length; }
  async insertEvent(event: EventRow) { this.events.push(event); }
  async upsertPurchaseOrder(po: { code: string }) { this.purchaseOrders.set(po.code, po); }
  async upsertTender(tender: { code: string }) { this.tenders.set(tender.code, tender); }
  async queueRetry(code: string, source: string, attempts: number) { this.retries.set(`${source}:${code}`, { code, source, attempts }); }
  async insertRun(run: unknown) { this.runs.push(run); }
}

test('cron re-ejecutado mantiene idempotencia por code', async () => {
  const store = new MemoryStore();
  const client = { listPurchaseOrderCodes: async () => ['OC-1'], getPurchaseOrder: async () => ({ code: 'OC-1', supplierRut: '12.345.678-5', raw: {} }), listTenderCodes: async () => ['TEN-1'], getTender: async () => ({ code: 'TEN-1', status: '5', items: [{ productName: 'guantes nitrilo' }], raw: {} }) };
  await runDailyIngest({ client, store, runDate: '2026-07-14', throttleMs: 0 });
  await runDailyIngest({ client, store, runDate: '2026-07-14', throttleMs: 0 });
  assert.equal(store.purchaseOrders.size, 1);
  assert.equal(store.tenders.size, 1);
});

test('429 genera backoff y cola ingest_retry tras 3 intentos', async () => {
  const store = new MemoryStore();
  const error = Object.assign(new Error('too many'), { status: 429 });
  const client = { listPurchaseOrderCodes: async () => ['OC-429'], getPurchaseOrder: async () => { throw error; }, listTenderCodes: async () => [], getTender: async () => { throw error; } };
  await runDailyIngest({ client, store, runDate: '2026-07-14', throttleMs: 0 });
  assert.ok(store.retries.has('api_oc:OC-429'));
  assert.ok(store.events.some((e) => e.type === 'ingest_retry_queued'));
});

test('guardrail 8500 detiene P2 pero permite P1', async () => {
  const store = new MemoryStore(8498);
  const client = { listPurchaseOrderCodes: async () => ['OC-1'], getPurchaseOrder: async () => ({ code: 'OC-1', supplierRut: '76000000-0', raw: {} }), listTenderCodes: async () => ['TEN-NO'], getTender: async () => ({ code: 'TEN-NO', status: '5', raw: {} }) };
  const result = await runDailyIngest({ client, store, runDate: '2026-07-14', throttleMs: 0 });
  assert.equal(store.purchaseOrders.size, 1);
  assert.equal(result.stoppedP2, true);
  assert.equal(store.tenders.size, 0);
  assert.ok(store.events.some((e) => e.type === 'guardrail_alert'));
});

test('RUT persona natural se deriva con umbral menor a 50M', () => {
  assert.equal(isNaturalPersonRut('12.345.678-5'), true);
  assert.equal(isNaturalPersonRut('76.000.000-0'), false);
});

test('migración niega acceso directo cliente al espejo por ausencia de policies', async () => {
  const sql = await import('node:fs').then((fs) => fs.readFileSync('supabase/migrations/202607150001_spec_01_ingesta_espejo.sql', 'utf8'));
  assert.match(sql, /alter table purchase_orders enable row level security/);
  assert.doesNotMatch(sql, /create policy .*purchase_orders/i);
});

test('particiones events del mes actual y próximos tres meses están definidas', async () => {
  const sql = await import('node:fs').then((fs) => fs.readFileSync('supabase/migrations/202607150001_spec_01_ingesta_espejo.sql', 'utf8'));
  assert.equal((sql.match(/ensure_events_partition/g) ?? []).length >= 5, true);
});

test('items_text alimenta FTS con términos que vienen solo desde ítems', () => {
  assert.equal(buildItemsText([{ productName: 'ecógrafo', specText: 'portátil doppler' }]), 'ecógrafo portátil doppler');
});

test('estado MP desconocido queda unknown y emite unknown_status_seen en pipeline', async () => {
  assert.equal(mapTenderStatus('estado-raro'), 'unknown');
  const store = new MemoryStore();
  const client = { listPurchaseOrderCodes: async () => [], getPurchaseOrder: async () => { throw new Error('no'); }, listTenderCodes: async () => ['TEN-X'], getTender: async () => ({ code: 'TEN-X', status: 'estado-raro', raw: {} }) };
  await runDailyIngest({ client, store, runDate: '2026-07-14', throttleMs: 0 });
  assert.ok(store.events.some((e) => e.type === 'unknown_status_seen'));
});

test('POST /api/events: allowlist y rate limit 60/min', () => {
  resetRateLimits();
  assert.equal(validateEventType('fuera_taxonomia'), false);
  assert.equal(validateEventType('card_opened'), true);
  for (let i = 0; i < 60; i += 1) assert.equal(rateLimit('s1', 1_000), true);
  assert.equal(rateLimit('s1', 1_000), false);
});

test('parser backfill valida cabecera y parsea sin ejecutar descarga', () => {
  assert.deepEqual(validateBackfillHeader('codigo;rut_proveedor;region').missing, []);
  const rows = parsePurchaseOrderDump('codigo;rut_proveedor;region\nOC-1;12.345.678-5;RM');
  assert.equal(rows[0]?.code, 'OC-1');
});
