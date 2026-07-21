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
  try {
    // 1. Recibimos el JSON real que envía Meta
    const body = await request.json();
    
    // 2. Lo imprimimos en la consola de Vercel para poder verlo
    console.log("👉 MENSAJE RECIBIDO DE META:", JSON.stringify(body, null, 2));

    // TODO: Aquí conectaremos la función de inserción a Supabase
    // ejemplo: await guardarMensajeEnSupabase(body);

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error("❌ Error leyendo el webhook:", error);
    return new NextResponse('Error', { status: 500 });
  }
}
