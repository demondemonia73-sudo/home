// ============================================
// CONFIGURACIÓN GLOBAL - TALLERTOTAL MANAGER v2.0
// ============================================

const CONFIG = {
    SUPABASE_URL: 'https://iyanyiihgjnnlcjapnge.supabase.co',
    SUPABASE_ANON_KEY: 'sb_publishable_gxx8Bo4xtnPcCHWTooE3fA_yE9j1cIz',
    APP_NAME: 'TallerTotal Manager',
    APP_VERSION: '2.0.0',
    APP_BUILD: '2026.05.15',
    DEBUG: false
};

// Cliente global de Supabase
const db = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
    auth: { 
        persistSession: true, 
        autoRefreshToken: true,
        detectSessionInUrl: false
    }
});

// Estado global de la aplicación
const AppState = {
    currentUser: null,
    currentUserRole: null,
    currentUserName: null,
    isLoggedIn: false,
    theme: 'light',
    sidebarCollapsed: false,
    notifications: [],

    isAdmin() { return this.isLoggedIn && this.currentUserRole === 'admin'; },
    isWorker() { return this.isLoggedIn && this.currentUserRole === 'trabajador'; },
    getInitials() { 
        return this.currentUserName 
            ? this.currentUserName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)
            : '??';
    }
};

// Sistema de notificaciones Toast
const Toast = {
    container: null,

    init() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
    },

    show(message, type = 'info', duration = 4000) {
        this.init();
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        const toast = document.createElement('div');
        toast.className = `toast alert-${type === 'error' ? 'danger' : type}`;
        toast.innerHTML = `
            <span class="alert-icon">${icons[type] || icons.info}</span>
            <span>${message}</span>
        `;

        this.container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    success(msg) { this.show(msg, 'success'); },
    error(msg) { this.show(msg, 'error'); },
    warning(msg) { this.show(msg, 'warning'); },
    info(msg) { this.show(msg, 'info'); }
};

// Sistema de tema
const ThemeManager = {
    init() {
        const saved = localStorage.getItem('ttm-theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = saved || (prefersDark ? 'dark' : 'light');
        this.set(theme);

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (!localStorage.getItem('ttm-theme')) {
                this.set(e.matches ? 'dark' : 'light');
            }
        });
    },

    set(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        AppState.theme = theme;
        localStorage.setItem('ttm-theme', theme);
        this.updateIcon();
    },

    toggle() {
        const newTheme = AppState.theme === 'light' ? 'dark' : 'light';
        this.set(newTheme);
    },

    updateIcon() {
        const btn = document.getElementById('themeToggleBtn');
        if (btn) {
            btn.innerHTML = AppState.theme === 'dark' ? '🌙' : '☀️';
            btn.title = AppState.theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
        }
    }
};

// Helpers de formato
function formatMoney(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return 'Bs 0.00';
    return 'Bs ' + parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDateShort(dateStr) {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

console.log(`🔧 ${CONFIG.APP_NAME} v${CONFIG.APP_VERSION} configurado`);
