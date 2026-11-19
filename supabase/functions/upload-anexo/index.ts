// Supabase Edge Function: Upload de anexos para Google Drive
// Requer secrets: GDRIVE_CLIENT_EMAIL, GDRIVE_PRIVATE_KEY, GDRIVE_FOLDER_ID

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.js/@supabase/supabase-js@2";

// Configurações do Google Drive via Service Account
const GDRIVE_CLIENT_EMAIL = Deno.env.get("GDRIVE_CLIENT_EMAIL");
const GDRIVE_PRIVATE_KEY = Deno.env.get("GDRIVE_PRIVATE_KEY")?.replace(/\\n/g, "\n");
const GDRIVE_FOLDER_ID = Deno.env.get("GDRIVE_FOLDER_ID");

// Interface para o arquivo retornado
interface AnexoResult {
  id: string;
  nome: string;
  tamanho: number;
  tipo: string;
  url: string;
  driveId: string;
}

// Função para criar JWT e obter access token do Google
async function getGoogleAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  // Cria JWT para autenticação
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: GDRIVE_CLIENT_EMAIL,
    scope: "https://www.googleapis.com/auth/drive.file",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedClaim = btoa(JSON.stringify(claim));
  const signatureInput = `${encodedHeader}.${encodedClaim}`;

  // Assina com a chave privada
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToBuffer(GDRIVE_PRIVATE_KEY!),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signatureInput)
  );
  
  const jwt = `${signatureInput}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;

  // Troca JWT por access token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error(`Falha ao obter access token: ${JSON.stringify(tokenData)}`);
  }

  return tokenData.access_token;
}

// Converte PEM para buffer
function pemToBuffer(pem: string): ArrayBuffer {
  const b64 = pem.split("\n")
    .filter(line => !line.startsWith("-----"))
    .join("");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Upload de arquivo para Google Drive
async function uploadToDrive(
  accessToken: string,
  file: File,
  folderId: string
): Promise<AnexoResult> {
  const fileBuffer = await file.arrayBuffer();

  // Metadata do arquivo
  const metadata = {
    name: file.name,
    parents: [folderId],
  };

  // Upload do arquivo
  const uploadResponse = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "multipart/related; boundary=foo_bar_baz",
      },
      body: `--foo_bar_baz\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--foo_bar_baz\r\nContent-Type: ${file.type || "application/octet-stream"}\r\n\r\n`,
    }
  );

  // Para simplificar, vamos usar upload resumido
  const simpleUpload = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files?uploadType=media`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": file.type || "application/octet-stream",
        "X-Upload-Content-Type": file.type || "application/octet-stream",
      },
      body: fileBuffer,
    }
  );

  const fileData = await simpleUpload.json();
  const fileId = fileData.id;

  if (!fileId) {
    throw new Error(`Falha no upload: ${JSON.stringify(fileData)}`);
  }

  // Define permissão pública (anyoneWithLink)
  await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role: "reader",
        type: "anyone",
      }),
    }
  );

  // URL pública para download
  const publicUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

  return {
    id: fileId,
    nome: file.name,
    tamanho: file.size,
    tipo: file.type || "application/octet-stream",
    url: publicUrl,
    driveId: fileId,
  };
}

serve(async (req) => {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  try {
    // Verifica autenticação do Supabase
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    // Verifica se usuário é admin ou editor
    const { data: profile } = await supabase
      .schema("blog")
      .from("profiles")
      .select("papel")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "editor"].includes(profile.papel)) {
      return new Response(
        JSON.stringify({ error: "Sem permissão" }),
        { status: 403, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    // Verifica configurações do Google Drive
    if (!GDRIVE_CLIENT_EMAIL || !GDRIVE_PRIVATE_KEY || !GDRIVE_FOLDER_ID) {
      return new Response(
        JSON.stringify({ 
          error: "Configuração do Google Drive incompleta. Contate o administrador." 
        }),
        { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    // Recebe arquivo do form data
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "Nenhum arquivo enviado" }),
        { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    // Valida tamanho (máx 50MB)
    if (file.size > 50 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "Arquivo muito grande (máx 50MB)" }),
        { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    // Obtém access token do Google
    const accessToken = await getGoogleAccessToken();

    // Upload para Drive
    const anexo = await uploadToDrive(accessToken, file, GDRIVE_FOLDER_ID);

    return new Response(
      JSON.stringify({ 
        success: true, 
        anexo 
      }),
      { status: 200, headers: { ...headers, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro no upload:", error);
    return new Response(
      JSON.stringify({ 
        error: "Erro interno", 
        details: error instanceof Error ? error.message : String(error) 
      }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }
});
