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
    
    // ============================================
    // ASIGNAR EVENTOS (con verificación de existencia)
    // ============================================
    
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const consultarBtn = document.getElementById('consultarBtn');
    const nuevoPedidoBtn = document.getElementById('nuevoPedidoBtn');
    const mostrarLoginBtn = document.getElementById('mostrarLoginBtn');
    const cerrarModalBtn = document.getElementById('cerrarModalBtn');
    
    if (loginBtn) loginBtn.onclick = login;
    if (logoutBtn) logoutBtn.onclick = logout;
    if (consultarBtn) consultarBtn.onclick = () => {
        if (typeof consultarPedido === 'function') {
            consultarPedido();
        } else {
            console.error('consultarPedido no está definida');
            alert('Error: Función no cargada correctamente. Recarga la página.');
        }
    };
    if (nuevoPedidoBtn) nuevoPedidoBtn.onclick = () => {
        if (typeof mostrarNuevoPedidoForm === 'function') {
            mostrarNuevoPedidoForm();
        } else {
            window.location.href = 'tienda.html';
        }
    };
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
    
    // ============================================
    // CONFIGURAR TABS (solo si existe cargarDashboard)
    // ============================================
    const tabs = document.querySelectorAll('.tab-btn');
    if (tabs.length > 0) {
        const tabModules = {
            'dashboard': typeof cargarDashboard === 'function' ? cargarDashboard : () => console.warn('cargarDashboard no definida'),
            'pedidos': typeof cargarPedidos === 'function' ? cargarPedidos : () => console.warn('cargarPedidos no definida'),
            'productos': typeof cargarProductos === 'function' ? cargarProductos : () => console.warn('cargarProductos no definida'),
            'clientes': typeof cargarClientes === 'function' ? cargarClientes : () => console.warn('cargarClientes no definida'),
            'trabajadores': typeof cargarTrabajadores === 'function' ? cargarTrabajadores : () => console.warn('cargarTrabajadores no definida'),
            'reportes': typeof cargarReportes === 'function' ? cargarReportes : () => console.warn('cargarReportes no definida')
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
