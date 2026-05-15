// ============================================
// MAIN.JS - NÚCLEO DE TALLERTOTAL MANAGER v2.0
// ============================================

let vistaActual = 'consulta';
let modulosCargados = {};

// Inicialización principal
document.addEventListener('DOMContentLoaded', async function() {
    console.log(`🚀 Iniciando ${CONFIG.APP_NAME} v${CONFIG.APP_VERSION}`);

    // Inicializar tema
    ThemeManager.init();

    // Verificar conexión
    const connected = await verificarConexion();
    if (!connected) {
        console.warn('⚠️ No se pudo conectar con Supabase.');
        Toast.warning('Conexión limitada con el servidor');
    }

    // Verificar sesión previa
    await checkSession();

    // Configurar navegación
    setupNavigation();

    console.log('✅ Sistema inicializado correctamente');
});

// ============================================
// NAVEGACIÓN Y VISTAS
// ============================================

function mostrarVista(vista) {
    vistaActual = vista;

    // Actualizar navegación activa
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.tab === vista) {
            item.classList.add('active');
        }
    });

    // Ocultar todas las vistas
    document.getElementById('vistaConsulta').classList.add('hidden');
    document.getElementById('vistaDinamica').classList.add('hidden');

    // Mostrar vista correspondiente
    const titulos = {
        'consulta': { title: 'Consultar Pedido', breadcrumb: 'Inicio / Cliente' },
        'dashboard': { title: 'Dashboard', breadcrumb: 'Admin / Dashboard' },
        'pedidos': { title: 'Gestión de Pedidos', breadcrumb: 'Admin / Pedidos' },
        'productos': { title: 'Gestión de Productos', breadcrumb: 'Admin / Productos' },
        'clientes': { title: 'Gestión de Clientes', breadcrumb: 'Admin / Clientes' },
        'trabajadores': { title: 'Gestión de Trabajadores', breadcrumb: 'Admin / Trabajadores' },
        'reportes': { title: 'Reportes', breadcrumb: 'Admin / Reportes' },
        'tiposCorrea': { title: 'Tipos de Correa', breadcrumb: 'Admin / Tipos de Correa' },
        'panelTrabajador': { title: 'Mi Panel de Trabajo', breadcrumb: 'Trabajador / Panel' }
    };

    const info = titulos[vista] || { title: vista, breadcrumb: vista };
    document.getElementById('pageTitle').textContent = info.title;
    document.getElementById('breadcrumb').textContent = info.breadcrumb;

    if (vista === 'consulta') {
        document.getElementById('vistaConsulta').classList.remove('hidden');
    } else {
        document.getElementById('vistaDinamica').classList.remove('hidden');
        cargarModulo(vista);
    }

    // Cerrar sidebar en móvil
    if (window.innerWidth <= 1024) {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('mobileOverlay').classList.remove('active');
    }
}

async function cargarModulo(vista) {
    const container = document.getElementById('vistaDinamica');
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Cargando módulo...</p></div>';

    try {
        switch(vista) {
            case 'dashboard':
                if (typeof cargarDashboard === 'function') await cargarDashboard();
                break;
            case 'pedidos':
                if (typeof cargarPedidos === 'function') await cargarPedidos();
                break;
            case 'productos':
                if (typeof cargarProductos === 'function') await cargarProductos();
                break;
            case 'clientes':
                if (typeof cargarClientes === 'function') await cargarClientes();
                break;
            case 'trabajadores':
                if (typeof cargarTrabajadores === 'function') await cargarTrabajadores();
                break;
            case 'reportes':
                if (typeof cargarReportes === 'function') await cargarReportes();
                break;
            case 'tiposCorrea':
                if (typeof cargarTiposCorrea === 'function') await cargarTiposCorrea();
                break;
            case 'panelTrabajador':
                if (typeof cargarPanelTrabajador === 'function') await cargarPanelTrabajador();
                break;
            default:
                container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">❓</div><div class="empty-state-title">Módulo no encontrado</div></div>';
        }
    } catch (err) {
        console.error('Error cargando módulo:', err);
        container.innerHTML = `<div class="alert alert-danger"><span class="alert-icon">❌</span><div><strong>Error al cargar el módulo</strong><br>${err.message}</div></div>`;
    }
}

function setupNavigation() {
    document.querySelectorAll('.nav-item[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            mostrarVista(tab);
        });
    });
}

// ============================================
// SIDEBAR MÓVIL
// ============================================

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobileOverlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
}

// ============================================
// MODAL LOGIN
// ============================================

function mostrarLogin() {
    document.getElementById('loginModal').classList.add('active');
    document.getElementById('loginError').classList.add('hidden');
    document.getElementById('loginEmail').focus();
}

function cerrarModalLogin() {
    document.getElementById('loginModal').classList.remove('active');
}

// Cerrar modal al hacer click fuera
document.addEventListener('click', function(e) {
    const modal = document.getElementById('loginModal');
    if (e.target === modal) {
        cerrarModalLogin();
    }
});

// ============================================
// SESIÓN Y AUTENTICACIÓN
// ============================================

async function checkSession() {
    const savedUser = localStorage.getItem('ttm-user');
    if (savedUser) {
        try {
            const userData = JSON.parse(savedUser);
            const { data, error } = await db
                .from('usuarios')
                .select('*')
                .eq('id', userData.id)
                .eq('activo', true)
                .single();

            if (data && !error) {
                AppState.currentUser = data;
                AppState.currentUserRole = data.rol;
                AppState.currentUserName = data.nombre;
                AppState.isLoggedIn = true;
                actualizarUIAutenticado();
                return;
            }
        } catch (err) {
            console.error('Error verificando sesión:', err);
        }
        localStorage.removeItem('ttm-user');
    }
    actualizarUIAnonimo();
}

function actualizarUIAutenticado() {
    const navAdmin = document.getElementById('navAdmin');
    const navTrabajador = document.getElementById('navTrabajador');
    const navCliente = document.getElementById('navCliente');

    if (AppState.isAdmin()) {
        navAdmin.classList.remove('hidden');
        navTrabajador.classList.add('hidden');
        navCliente.classList.add('hidden');
        mostrarVista('dashboard');
    } else if (AppState.isWorker()) {
        navAdmin.classList.add('hidden');
        navTrabajador.classList.remove('hidden');
        navCliente.classList.add('hidden');
        mostrarVista('panelTrabajador');
    }

    const userCard = document.getElementById('userCard');
    const userAvatar = document.getElementById('userAvatar');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const userRoleDisplay = document.getElementById('userRoleDisplay');

    userCard.style.display = 'flex';
    userAvatar.textContent = AppState.getInitials();
    userNameDisplay.textContent = AppState.currentUserName;
    userRoleDisplay.textContent = AppState.isAdmin() ? 'Administrador' : 'Trabajador';

    document.getElementById('loginBtnSidebar').classList.add('hidden');
    document.getElementById('logoutBtnSidebar').classList.remove('hidden');
}

function actualizarUIAnonimo() {
    const navAdmin = document.getElementById('navAdmin');
    const navTrabajador = document.getElementById('navTrabajador');
    const navCliente = document.getElementById('navCliente');

    navAdmin.classList.add('hidden');
    navTrabajador.classList.add('hidden');
    navCliente.classList.remove('hidden');

    document.getElementById('userCard').style.display = 'none';
    document.getElementById('loginBtnSidebar').classList.remove('hidden');
    document.getElementById('logoutBtnSidebar').classList.add('hidden');

    mostrarVista('consulta');
}

// ============================================
// EXPONER FUNCIONES GLOBALES
// ============================================

window.mostrarVista = mostrarVista;
window.mostrarLogin = mostrarLogin;
window.cerrarModalLogin = cerrarModalLogin;
window.toggleSidebar = toggleSidebar;
window.cargarModulo = cargarModulo;
