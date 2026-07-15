export type Source = 'api_oc' | 'api_tenders' | 'datos_abiertos';
export type EventRow = { type: string; payload?: Record<string, unknown>; user_id?: string | null; session_id?: string | null; created_at?: string };
export type PurchaseOrderInput = { code: string; supplierRut: string; items?: unknown[]; raw: Record<string, unknown> };
export type TenderInput = { code: string; status: unknown; items?: { productName?: string; specText?: string }[]; raw: Record<string, unknown> };
export type IngestStore = {
  countApiRequests(runDate: string): Promise<number>;
  insertEvent(event: EventRow): Promise<void>;
  upsertPurchaseOrder(po: PurchaseOrderInput & { supplierIsNaturalPerson: boolean }): Promise<void>;
  upsertTender(tender: TenderInput & { canonicalStatus: string; itemsText: string }): Promise<void>;
  queueRetry(code: string, source: Source, attempts: number, nextRetryAt: Date): Promise<void>;
  insertRun(run: { run_date: string; source: Source; req_count: number; ok_count: number; fail_count: number; duration_ms: number; cursor?: string }): Promise<void>;
};
export type MercadoPublicoClient = {
  listPurchaseOrderCodes(date: string): Promise<string[]>;
  getPurchaseOrder(code: string): Promise<PurchaseOrderInput>;
  listTenderCodes(date: string): Promise<string[]>;
  getTender(code: string): Promise<TenderInput>;
};
