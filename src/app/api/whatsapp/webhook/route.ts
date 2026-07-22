import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Inicializar cliente de Supabase para guardar los mensajes
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

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

    // Extraer de forma segura los datos que manda Meta
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];
    const contact = value?.contacts?.[0];

    if (message) {
      const phone = message.from; // Número del cliente
      const messageText = message.text?.body || '[Mensaje multimedia]';
      const senderName = contact?.profile?.name || phone;

      console.log(`💬 Mensaje detectado de ${senderName} (${phone}): "${messageText}"`);

      // Aquí puedes registrar el evento o insertar en la base de datos de Supabase
      // Ejemplo de inserción de respaldo si la tabla de mensajes está activa:
      /*
      await supabase.from('messages').insert({
        phone_number: phone,
        body: messageText,
        direction: 'inbound',
        created_at: new Date().toISOString()
      });
      */
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error: any) {
    console.error("❌ Error procesando webhook:", error);
    return new NextResponse('OK', { status: 200 });
  }
}
