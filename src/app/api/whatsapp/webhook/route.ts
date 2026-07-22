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
    const contactInfo = value?.contacts?.[0];

    if (!message) {
      return new NextResponse('OK', { status: 200 });
    }

    const phone = message.from;
    const messageText = message.text?.body || '[Mensaje multimedia]';
    const messageId = message.id;
    const senderName = contactInfo?.profile?.name || phone;

    console.log(`💬 Procesando mensaje de ${senderName} (${phone}): "${messageText}"`);

    // --- 1. Obtener usuario dueño del CRM ---
    let defaultUserId = null;
    try {
      const { data: authData } = await supabase.auth.admin.listUsers();
      if (authData?.users?.length > 0) {
        defaultUserId = authData.users[0].id;
      }
    } catch (e) {
      console.error("⚠️ Error obteniendo usuario de Auth:", e);
    }

    if (!defaultUserId) {
      console.error("❌ No se encontró usuario en Supabase Auth.");
      return new NextResponse('OK', { status: 200 });
    }

    // --- 2. Obtener account_id desde 'profiles' ---
    let accountId = null;
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('user_id', defaultUserId)
      .single();

    if (profileError) {
      console.error("❌ Error al obtener perfil:", profileError);
      return new NextResponse('OK', { status: 200 });
    }

    accountId = profile?.account_id;
    if (!accountId) {
      console.error("❌ El usuario no tiene account_id asignado.");
      return new NextResponse('OK', { status: 200 });
    }

    console.log(`✅ Account ID obtenido: ${accountId}`);

    // --- 3. Buscar o crear contacto ---
    let contactId = null;
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();

    if (existingContact) {
      contactId = existingContact.id;
    } else {
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          phone: phone,
          name: senderName,
          user_id: defaultUserId,
          account_id: accountId
        })
        .select('id')
        .single();

      if (contactError) {
        console.error("❌ Error al crear contacto:", contactError);
      } else if (newContact) {
        contactId = newContact.id;
      }
    }

    if (!contactId) {
      console.error("❌ No se pudo obtener o crear el contacto.");
      return new NextResponse('OK', { status: 200 });
    }

    // --- 4. Buscar o crear conversación ---
    let conversationId = null;
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('contact_id', contactId)
      .maybeSingle();

    if (existingConv) {
      conversationId = existingConv.id;
    } else {
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          contact_id: contactId,
          user_id: defaultUserId,
          account_id: accountId,
          status: 'open',
          last_message_text: messageText,
          last_message_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (convError) {
        console.error("❌ Error al crear conversación:", convError);
      } else if (newConv) {
        conversationId = newConv.id;
      }
    }

    // --- 5. Guardar mensaje (con valores válidos según restricciones) ---
    if (conversationId) {
      const { error: msgError } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        message_id: messageId,
        content_text: messageText,
        content_type: 'text',          // ✅ permitido
        status: 'delivered',           // ✅ permitido
        sender_type: 'customer'        // ✅ permitido
        // NOTA: NO incluir account_id porque no existe en messages
      });

      if (msgError) {
        console.error("❌ Error al guardar el mensaje:", msgError);
      } else {
        console.log("✅ ¡Mensaje guardado y sincronizado con éxito en el CRM!");

        await supabase
          .from('conversations')
          .update({
            last_message_text: messageText,
            last_message_at: new Date().toISOString()
          })
          .eq('id', conversationId);
      }
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error: any) {
    console.error("❌ Error general procesando webhook:", error);
    return new NextResponse('OK', { status: 200 });
  }
}
