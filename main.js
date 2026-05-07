// ============================================
// PUNTO DE ENTRADA PRINCIPAL
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log(`🚀 Iniciando ${CONFIG.APP_NAME} v${CONFIG.APP_VERSION}`);
    
    const connected = await verificarConexion();
    if (!connected) {
        console.warn('⚠️ No se pudo conectar con Supabase.');
    }
    
    // ============================================
    // ASIGNAR EVENTOS
    // ============================================
    
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const mostrarLoginBtn = document.getElementById('mostrarLoginBtn');
    const cerrarModalBtn = document.getElementById('cerrarModalBtn');
    const consultarBtn = document.getElementById('consultarBtn');
    const nuevoPedidoBtn = document.getElementById('nuevoPedidoBtn');
    
    if (loginBtn) loginBtn.onclick = () => login();
    if (logoutBtn) logoutBtn.onclick = () => logout();
    if (mostrarLoginBtn) mostrarLoginBtn.onclick = () => mostrarLogin();
    if (cerrarModalBtn) cerrarModalBtn.onclick = () => cerrarModalLogin();
    
    if (consultarBtn) {
        consultarBtn.onclick = () => {
            if (typeof window.consultarPedido === 'function') {
                window.consultarPedido();
            } else {
                console.error('consultarPedido no está definida');
                alert('Error: Función no disponible. Recarga la página.');
            }
        };
    }
    
    if (nuevoPedidoBtn) {
        nuevoPedidoBtn.onclick = () => {
            if (typeof window.mostrarNuevoPedidoForm === 'function') {
                window.mostrarNuevoPedidoForm();
            } else {
                window.location.href = 'tienda.html';
            }
        };
    }
    
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.onclick = function(e) {
            if (e.target === modal) {
                cerrarModalLogin();
            }
        };
    }
    
    // ============================================
    // EXPONER FUNCIONES GLOBALES PARA auth.js
    // ============================================
    window.cargarPanelTrabajador = cargarPanelTrabajador;
    window.cargarDashboard = cargarDashboard;
    window.cargarPedidos = cargarPedidos;
    window.cargarProductos = cargarProductos;
    window.cargarClientes = cargarClientes;
    window.cargarTrabajadores = cargarTrabajadores;
    window.cargarReportes = cargarReportes;
    window.cargarTiposCorrea = cargarTiposCorrea;
    
    // ============================================
    // CONFIGURAR TABS (solo admin)
    // ============================================
    const tabs = document.querySelectorAll('.tab-btn');
    if (tabs.length > 0) {
        const tabModules = {
            'dashboard': typeof window.cargarDashboard === 'function' ? window.cargarDashboard : () => console.warn('cargarDashboard no definida'),
            'pedidos': typeof window.cargarPedidos === 'function' ? window.cargarPedidos : () => console.warn('cargarPedidos no definida'),
            'productos': typeof window.cargarProductos === 'function' ? window.cargarProductos : () => console.warn('cargarProductos no definida'),
            'clientes': typeof window.cargarClientes === 'function' ? window.cargarClientes : () => console.warn('cargarClientes no definida'),
            'trabajadores': typeof window.cargarTrabajadores === 'function' ? window.cargarTrabajadores : () => console.warn('cargarTrabajadores no definida'),
            'reportes': typeof window.cargarReportes === 'function' ? window.cargarReportes : () => console.warn('cargarReportes no definida'),
            'tiposCorrea': typeof window.cargarTiposCorrea === 'function' ? window.cargarTiposCorrea : () => console.warn('cargarTiposCorrea no definida')
        };
        
        tabs.forEach(btn => {
            btn.onclick = () => {
                const tab = btn.dataset.tab;
                tabs.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const moduleFn = tabModules[tab];
                if (moduleFn) moduleFn();
                else console.warn(`Módulo ${tab} no disponible`);
            };
        });
    }
    
    console.log('✅ Sistema inicializado correctamente');
});

// Exponer funciones globales
window.mostrarLogin = mostrarLogin;
window.cerrarModalLogin = cerrarModalLogin;
