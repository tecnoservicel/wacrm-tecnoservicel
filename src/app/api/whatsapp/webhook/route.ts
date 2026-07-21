// src/app/api/whatsapp/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  // Comparar con el token configurado en variables de entorno
  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Verification failed', { status: 403 });
}

export async function POST(request: NextRequest) {
  // Aquí se procesarán los mensajes entrantes
  // (por ahora solo respondemos 200 para que Meta no reintente)
  return new NextResponse('OK', { status: 200 });
}