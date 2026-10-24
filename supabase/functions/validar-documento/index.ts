import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"
import {
  DOCUMENTO_EMPTY_ERROR_MESSAGE,
  parseMaxDocumentoBytes,
  validarDocumentoBytes,
} from "../_shared/documentoValidation.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return json({ error: "Usa POST para validar el archivo." }, 405)
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  const authHeader = req.headers.get("Authorization") ?? ""

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const token = authHeader.replace(/Bearer /i, "")
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token)

  if (userError || !user) {
    return json(
      { error: "Inicia sesión e inténtalo de nuevo." },
      401,
    )
  }

  const form = await req.formData()
  const archivo = form.get("archivo")
  if (!(archivo instanceof File)) {
    return json({ error: DOCUMENTO_EMPTY_ERROR_MESSAGE }, 400)
  }

  const bytes = new Uint8Array(await archivo.arrayBuffer())
  const result = validarDocumentoBytes({
    bytes,
    fileName: archivo.name,
    maxBytes: parseMaxDocumentoBytes(Deno.env.get("MAX_DOCUMENTO_BYTES")),
  })

  if (!result.ok) {
    return json({ error: result.error, code: result.code }, 400)
  }

  return json({
    ok: true,
    mime: result.mime,
    extension: result.extension,
    kind: result.kind,
  })
})
