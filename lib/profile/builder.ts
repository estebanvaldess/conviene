import { PROFILE_COPY } from '@/lib/copy/profile-onboarding';
import type { CompanyProfile, LookupOutput, ProfileTier } from './types';

type POItem = { onu_code?: string | null; onu_category?: string | null; product_name?: string | null; spec_text?: string | null; total?: number | null };
type PO = { code: string; buyer_org_code?: string | null; buyer_org_name?: string | null; buyer_region?: string | null; total?: number | null; created_at_mp?: string | null; cancelled_at?: string | null; items?: POItem[] };
export type ProfileStore = { findPurchaseOrders(rut: string): Promise<PO[]>; findOpenTenders?(profile: CompanyProfile): Promise<{ name: string; product: string; count: number }[]>; upsertCompany?(row: { rut: string; tier: ProfileTier; profile: CompanyProfile; oc_count_24m: number; is_natural_person: boolean }): Promise<void>; insertEvent?(event: { type: string; session_id?: string; payload?: Record<string, unknown> }): Promise<void> };

export function assignTier(count: number, isNaturalPerson: boolean): ProfileTier { if (count >= 8) return 'pleno'; if (count >= 3) return 'delgado'; return isNaturalPerson ? 'persona_natural' : 'declarativo'; }
export function buildProfile(orders: PO[], now = new Date()): { profile: CompanyProfile; oc_count_24m: number; tierBase: number } {
  const cutoff = new Date(now); cutoff.setMonth(cutoff.getMonth() - 24);
  const recent = orders.filter(o => !o.cancelled_at && o.created_at_mp && new Date(o.created_at_mp) >= cutoff);
  const rubros = new Map<string, { code: string; name: string; frequency: number; amount: number }>();
  const compradores = new Map<string, { code: string; name: string; n_oc: number; last_contact: string | null }>();
  const regiones = new Map<string, number>(); const totals: number[] = []; const words = new Map<string, number>();
  for (const po of recent) {
    if (typeof po.total === 'number') totals.push(po.total);
    if (po.buyer_region) regiones.set(po.buyer_region, (regiones.get(po.buyer_region) ?? 0) + 1);
    if (po.buyer_org_code) { const c = compradores.get(po.buyer_org_code) ?? { code: po.buyer_org_code, name: po.buyer_org_name ?? po.buyer_org_code, n_oc: 0, last_contact: null }; c.n_oc++; if (!c.last_contact || (po.created_at_mp && po.created_at_mp > c.last_contact)) c.last_contact = po.created_at_mp ?? null; compradores.set(po.buyer_org_code, c); }
    for (const item of po.items ?? []) { const code = (item.onu_code ?? '').slice(0, 6) || (item.onu_code ?? '').slice(0, 4); if (code) { const r = rubros.get(code) ?? { code, name: item.onu_category ?? code, frequency: 0, amount: 0 }; r.frequency++; r.amount += Number(item.total ?? po.total ?? 0); rubros.set(code, r); } for (const w of `${item.product_name ?? ''} ${item.spec_text ?? ''}`.toLowerCase().split(/[^a-záéíóúñ0-9]+/).filter(w => w.length > 3 && !STOP.has(w))) words.set(w, (words.get(w) ?? 0) + 1); }
  }
  const profile: CompanyProfile = { rubros: [...rubros.values()].sort((a,b)=>b.frequency-a.frequency).slice(0,10), compradores: [...compradores.values()].sort((a,b)=>b.n_oc-a.n_oc), regiones: [...regiones.entries()].map(([name, frequency])=>({name, frequency})).sort((a,b)=>b.frequency-a.frequency), rango_montos: percentileRange(totals), keywords_fts: [...words.entries()].sort((a,b)=>b[1]-a[1]).slice(0,20).map(([w])=>w) };
  if (recent.length === 0 && orders.length > 0) profile.stale_history = true;
  return { profile, oc_count_24m: recent.length, tierBase: recent.length || (orders.length ? 3 : 0) };
}
export async function lookupProfile(store: ProfileStore, params: { rut: string; is_natural_person: boolean; session_id?: string; persist: boolean }): Promise<LookupOutput> {
  await store.insertEvent?.({ type: 'rut_submitted', session_id: params.session_id, payload: { rut: params.rut, is_natural_person: params.is_natural_person } });
  const orders = await store.findPurchaseOrders(params.rut).catch(() => []);
  const { profile, oc_count_24m, tierBase } = buildProfile(orders); const tier = assignTier(tierBase, params.is_natural_person);
  if (params.persist) await store.upsertCompany?.({ rut: params.rut, tier, profile, oc_count_24m, is_natural_person: params.is_natural_person });
  const candidates = await store.findOpenTenders?.(profile).catch(() => []) ?? [];
  if (params.is_natural_person && !params.persist) return { n_matches_hoy: candidates.length, rubros_genericos: profile.rubros.slice(0,3).map(r => r.name) };
  return { tier, oc_count_24m, rubros_top3: profile.rubros.slice(0,3).map(r=>r.name), regiones: profile.regiones.map(r=>r.name), rango_montos: profile.rango_montos, n_compradores: profile.compradores.length, n_matches_hoy: candidates.length, teaser: { n_matches_hoy: candidates.length, top2: candidates.slice(0,2).map(c => ({ nombre_tender: c.name, linea_justificacion: PROFILE_COPY.errors.teaserLine.replace('{producto}', c.product).replace('{n}', String(c.count)) })) } };
}
const STOP = new Set(['para','como','este','esta','estos','estas','desde','sobre','entre','segun','según','compra','servicio']);
function percentileRange(values: number[]): [number, number] | null { if (!values.length) return null; const s=[...values].sort((a,b)=>a-b); const p=(q:number)=>s[Math.min(s.length-1, Math.max(0, Math.floor((s.length-1)*q)))]; return [p(.1), p(.9)]; }
