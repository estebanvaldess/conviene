import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ ok: true, message: 'Cron wiring ready; inject MercadoPublicoClient and IngestStore in deployment.' });
}
