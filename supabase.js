const SUPABASE_URL = "https://upqjiwliadhlhcewqoou.supabase.co";

// Nota: Esta es tu llave pública (anon key). Es seguro usarla en el frontend.
const SUPABASE_KEY = "sb_publishable_cnPfojHJI5L9S70QSs2a8g_IjRcxmVE";

// EXPLICITAMENTE asignamos el cliente a "window" para que proyecto.jsx lo pueda leer
window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
