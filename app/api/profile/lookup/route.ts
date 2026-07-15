import { NextRequest, NextResponse } from 'next/server';
import { PROFILE_COPY } from '@/lib/copy/profile-onboarding';
import { lookupRateLimit } from '@/lib/profile/rate-limit';
import { normalizeRut, validateRut } from '@/lib/profile/rut';
import { lookupProfile, type ProfileStore } from '@/lib/profile/builder';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { rut?: unknown; is_natural_person?: unknown; session_id?: unknown } | null;
  const rut = normalizeRut(String(body?.rut ?? '')); const session_id = String(body?.session_id ?? 'anonymous'); const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!validateRut(rut)) return NextResponse.json({ error: PROFILE_COPY.errors.invalidRut }, { status: 400 });
  if (!lookupRateLimit(ip, session_id)) return NextResponse.json({ error: PROFILE_COPY.errors.lookupRateLimited }, { status: 429 });
  const is_natural_person = Boolean(body?.is_natural_person);
  const store = supabaseProfileStore();
  const persist = !is_natural_person;
  const output = await lookupProfile(store, { rut, is_natural_person, session_id, persist });
  return NextResponse.json(output);
}
function supabaseProfileStore(): ProfileStore {
  const db = getSupabaseAdmin();
  if (!db) return { async findPurchaseOrders() { return []; } };
  return {
    async findPurchaseOrders(rut) {
      const { data } = await db.from('purchase_orders').select('code,buyer_org_code,buyer_org_name,buyer_region,total,created_at_mp,cancelled_at,purchase_order_items(onu_code,onu_category,product_name,spec_text,total)').eq('supplier_rut', rut);
      return (data ?? []).map((po: any) => ({ ...po, items: po.purchase_order_items ?? [] }));
    },
    async findOpenTenders(profile) {
      const codes = profile.rubros.map(r => r.code);
      if (!codes.length) return [];
      const { data } = await db.from('tender_items').select('onu_code,product_name,tenders!inner(name,status,closes_at)').in('onu_code', codes).eq('tenders.status','open').limit(20);
      return (data ?? []).map((row: any) => ({ name: row.tenders?.name ?? row.product_name ?? 'Licitación abierta', product: row.product_name ?? 'este rubro', count: profile.rubros.find(r => r.code === row.onu_code)?.frequency ?? 1 }));
    },
    async upsertCompany(row) { await db.from('companies').upsert({ rut: row.rut, tier: row.tier, profile: row.profile, oc_count_24m: row.oc_count_24m, is_natural_person: row.is_natural_person, profile_built_at: new Date().toISOString() }); },
    async insertEvent(event) { await db.from('events').insert(event); },
  };
}
