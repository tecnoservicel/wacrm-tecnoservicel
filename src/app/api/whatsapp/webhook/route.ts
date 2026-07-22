import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];
    const contact = value?.contacts?.[0];

    if (message) {
      const phone = message.from;
      const messageText = message.text?.body || '[Mensaje multimedia]';
      const messageId = message.id;
      const senderName = contact?.profile?.name || phone;

      console.log(`💬 Procesando mensaje de ${senderName} (${phone}): "${messageText}"`);

      // Inserción usando las columnas exactas de tu esquema ('content_text' y 'message_id')
      const { error } = await supabase.from('messages').insert({
        message_id: messageId,
        content_text: messageText,
        content_type: 'text',
        status: 'received',
        sender_type: 'contact'
      });

      if (error) {
        console.error("❌ Error al guardar en Supabase:", error);
      } else {
        console.log("✅ ¡Mensaje guardado en Supabase con éxito!");
      }
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error: any) {
    console.error("❌ Error procesando webhook:", error);
    return new NextResponse('OK', { status: 200 });
  }
}
