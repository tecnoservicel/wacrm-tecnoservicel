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
    console.log("📥 MENSAJE ENTRANTE DE WHATSAPP:", JSON.stringify(body, null, 2));
    return new NextResponse('OK', { status: 200 });
  } catch (error: any) {
    console.error("❌ Error procesando webhook:", error);
    return new NextResponse('OK', { status: 200 });
  }
}
