// src/app/api/whatsapp/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { handleWebhookEvent } from '@/lib/webhooks/events';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Verification failed', { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("📥 MENSAJE ENTRANTE RECIBIDO:", JSON.stringify(body, null, 2));

    // Conectamos el motor real que guarda en Supabase
    await handleWebhookEvent(body);

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error("❌ Error guardando en Supabase:", error);
    return new NextResponse('OK', { status: 200 });
  }
}
