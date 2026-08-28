// DuoBull Health Check Edge Function
// Veritabanı bağlantısını ve servis durumunu kontrol eder

import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // JWT doğrulaması (config.toml'da verify_jwt = true ile korunuyor)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Yetkilendirme gerekli" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Supabase client oluştur
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Veritabanı bağlantısını test et
    const { error } = await supabase.from("app_cache_state").select("version").limit(1);
    
    if (error) {
      return new Response(
        JSON.stringify({ 
          status: "error",
          message: "Veritabanı bağlantısı başarısız",
          timestamp: new Date().toISOString()
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Başarılı health check
    return new Response(
      JSON.stringify({ 
        status: "ok",
        message: "Tüm servisler çalışıyor",
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        status: "error",
        message: "Beklenmeyen hata",
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
