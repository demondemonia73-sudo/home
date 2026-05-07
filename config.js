// ============================================
// CONFIGURACIÓN GLOBAL DEL SISTEMA
// ============================================

const CONFIG = {
    SUPABASE_URL: 'https://iyanyiihgjnnlcjapnge.supabase.co',
    SUPABASE_ANON_KEY: 'sb_publishable_gxx8Bo4xtnPcCHWTooE3fA_yE9j1cIz',
    APP_NAME: 'TallerTotal Manager',
    APP_VERSION: '1.0.0'
};

// Cliente global de Supabase
const db = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
});

// Estado global de la aplicación
const AppState = {
    currentUser: null,
    currentUserRole: null,
    currentUserName: null,
    isLoggedIn: false
};

console.log('✅ Configuración cargada');
console.log('db disponible?', typeof db === 'object' ? '✅ Sí' : '❌ No');
