// ============================================
// MÓDULO DE PEDIDOS
// ============================================

// Elimino la función mostrarLogin duplicada y uso la de auth.js
// Las demás funciones quedan igual

async function consultarPedido() {
    const codigo = document.getElementById('consultaCodigo').value.trim();
    const telefono = document.getElementById('consultaTelefono').value.trim();
    const resultadoDiv = document.getElementById('resultadoConsulta');
    
    if (!codigo || !telefono) {
        resultadoDiv.innerHTML = '<div class="alert alert-danger">Por favor, ingresa el código y tu número de teléfono</div>';
        return;
    }
    
    try {
        const { data: pedido, error } = await db
            .from('pedidos')
            .select('*, clientes(*)')
            .eq('codigo', codigo)
            .maybeSingle();
        
        if (error || !pedido) {
            resultadoDiv.innerHTML = '<div class="alert alert-danger">Pedido no encontrado. Verifica el código ingresado.</div>';
            return;
        }
        
        if (pedido.clientes?.telefono !== telefono) {
            resultadoDiv.innerHTML = '<div class="alert alert-danger">El número de teléfono no coincide con el registro del pedido.</div>';
            return;
        }
        
        const estadoText = {
            'pendiente': '⏳ Pendiente - Esperando asignación',
            'en_proceso': '⚙️ En proceso - Estamos trabajando en tu pedido',
            'terminado': '✅ Terminado - Listo para retirar',
            'entregado': '📦 Entregado'
        };
        
        resultadoDiv.innerHTML = `
            <div class="card" style="margin-top: 1rem; border-left: 4px solid var(--primary-color);">
                <h3>📄 Pedido ${pedido.codigo}</h3>
                <div style="display: grid; gap: 0.5rem;">
                    <p><strong>👤 Cliente:</strong> ${pedido.clientes.nombre}</p>
                    <p><strong>📅 Fecha:</strong> ${new Date(pedido.created_at).toLocaleString()}</p>
                    <p><strong>📌 Estado:</strong> <span class="badge badge-${pedido.estado}">${estadoText[pedido.estado] || pedido.estado}</span></p>
                    <p><strong>💰 Total:</strong> <strong style="color: var(--success-color);">$${pedido.total}</strong></p>
                    ${pedido.estado === 'terminado' ? '<button class="btn btn-success" onclick="alert(\'📞 Contáctanos para coordinar la entrega o retiro\')">📞 Solicitar retiro/entrega</button>' : ''}
                </div>
            </div>
        `;
        
    } catch (err) {
        resultadoDiv.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
    }
}

function mostrarNuevoPedidoForm() {
    alert('📝 Formulario de nuevo pedido en desarrollo.\nPróximamente podrás realizar pedidos directamente desde aquí.');
}

// ============================================
// MÓDULOS DE ADMIN/TRABAJADOR (con verificación de sesión)
// ============================================

function verificarSesion() {
    if (!AppState.isLoggedIn) {
        alert('⚠️ Debes iniciar sesión para acceder a esta sección.');
        mostrarLogin();
        return false;
    }
    return true;
}

async function cargarPedidos() {
    if (!verificarSesion()) return;
    document.getElementById('tabsContent').innerHTML = `
        <div class="card">
            <h3>📦 Módulo de Gestión de Pedidos</h3>
            <p>Aquí podrás gestionar todos los pedidos del taller.</p>
            <p class="text-muted">Funcionalidades: crear, editar, eliminar y dar seguimiento a pedidos.</p>
            <button class="btn btn-primary" onclick="alert('En desarrollo')">➕ Nuevo Pedido</button>
        </div>
    `;
}

async function cargarProductos() {
    if (!verificarSesion()) return;
    document.getElementById('tabsContent').innerHTML = `
        <div class="card">
            <h3>🛒 Módulo de Inventario</h3>
            <p>Gestión completa de productos y stock.</p>
            <p class="text-muted">Productos: lingotes, poleas, componentes, repuestos.</p>
            <button class="btn btn-primary" onclick="alert('En desarrollo')">➕ Agregar Producto</button>
        </div>
    `;
}

async function cargarClientes() {
    if (!verificarSesion()) return;
    document.getElementById('tabsContent').innerHTML = `
        <div class="card">
            <h3>👥 Módulo de Clientes</h3>
            <p>Gestión de clientes frecuentes (tiendas) y clientes ocasionales.</p>
            <p class="text-muted">Historial de compras, pedidos personalizados, etc.</p>
            <button class="btn btn-primary" onclick="alert('En desarrollo')">➕ Nuevo Cliente</button>
        </div>
    `;
}

async function cargarTrabajadores() {
    if (!verificarSesion()) return;
    document.getElementById('tabsContent').innerHTML = `
        <div class="card">
            <h3>👨‍🔧 Módulo de Trabajadores</h3>
            <p>Gestión de empleados, áreas de trabajo y asignaciones.</p>
            <p class="text-muted">Áreas: Fundición, Torneado, Electricidad, Electrónica, Software, Reparación general, Soldadura.</p>
            <button class="btn btn-primary" onclick="alert('En desarrollo')">➕ Agregar Trabajador</button>
        </div>
    `;
}

async function cargarReportes() {
    if (!verificarSesion()) return;
    document.getElementById('tabsContent').innerHTML = `
        <div class="card">
            <h3>📄 Módulo de Reportes</h3>
            <p>Generación de reportes profesionales en PDF.</p>
            <p class="text-muted">Reportes: ganancias mensuales, pedidos pendientes, productos más vendidos, etc.</p>
            <div class="button-group">
                <button class="btn btn-primary" onclick="alert('En desarrollo')">📊 Reporte de Ventas</button>
                <button class="btn btn-success" onclick="alert('En desarrollo')">📦 Reporte de Inventario</button>
                <button class="btn btn-info" onclick="alert('En desarrollo')">👥 Reporte de Clientes</button>
            </div>
        </div>
    `;
}
