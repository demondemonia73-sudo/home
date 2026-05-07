// ============================================
// PUNTO DE ENTRADA PRINCIPAL
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log(`🚀 Iniciando ${CONFIG.APP_NAME} v${CONFIG.APP_VERSION}`);
    
    // Verificar conexión
    const connected = await verificarConexion();
    if (!connected) {
        console.warn('⚠️ No se pudo conectar con Supabase.');
    }
    
    // Asignar eventos a los botones
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const consultarBtn = document.getElementById('consultarBtn');
    const nuevoPedidoBtn = document.getElementById('nuevoPedidoBtn');
    const mostrarLoginBtn = document.getElementById('mostrarLoginBtn');
    const cerrarModalBtn = document.getElementById('cerrarModalBtn');
    
    if (loginBtn) loginBtn.onclick = login;
    if (logoutBtn) logoutBtn.onclick = logout;
    if (consultarBtn) consultarBtn.onclick = consultarPedido;
    if (nuevoPedidoBtn) nuevoPedidoBtn.onclick = mostrarNuevoPedidoForm;
    if (mostrarLoginBtn) mostrarLoginBtn.onclick = mostrarLogin;
    if (cerrarModalBtn) cerrarModalBtn.onclick = cerrarModalLogin;
    
    // Cerrar modal si se clickea fuera del contenido
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.onclick = function(e) {
            if (e.target === modal) {
                cerrarModalLogin();
            }
        };
    }
    
    // Configurar navegación por tabs
    const tabs = document.querySelectorAll('.tab-btn');
        const tabModules = {
        'dashboard': cargarDashboard,
        'pedidos': cargarPedidos,
        'productos': cargarProductos, 
        'clientes': cargarClientes,
        'trabajadores': cargarTrabajadores,
        'reportes': cargarReportes
    };
    
    tabs.forEach(btn => {
        btn.onclick = () => {
            const tab = btn.dataset.tab;
            tabs.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const moduleFn = tabModules[tab];
            if (moduleFn) moduleFn();
        };
    });
    
    console.log('✅ Sistema inicializado correctamente');
});
