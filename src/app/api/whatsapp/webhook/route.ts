import { NextRequest, NextResponse } from 'next/server';

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
    
    // Esto imprime los datos completos de tu mensaje en los Logs de Vercel
    console.log("📥 MENSAJE ENTRANTE DE WHATSAPP:", JSON.stringify(body, null, 2));

    // Respondemos OK a Meta para confirmar la recepción
    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error("❌ Error procesando webhook:", error);
    return new NextResponse('OK', { status: 200 });
  }
}
