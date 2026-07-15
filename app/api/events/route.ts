import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, validateEventType } from '@/lib/ingest/events';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { type?: unknown; payload?: unknown; session_id?: unknown } | null;
  const type = typeof body?.type === 'string' ? body.type : '';
  if (!validateEventType(type)) return NextResponse.json({ error: 'event_type_not_allowed' }, { status: 400 });
  const sessionId = typeof body?.session_id === 'string' ? body.session_id : request.headers.get('x-forwarded-for') ?? 'anonymous';
  if (!rateLimit(sessionId)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  // Persistencia real: insertar con service role en Supabase cuando las variables estén configuradas.
  return NextResponse.json({ ok: true });
}
