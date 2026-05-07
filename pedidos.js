// ============================================
// MÓDULO DE PEDIDOS
// ============================================

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

// Placeholders para otros módulos
async function cargarPedidos() { 
    document.getElementById('tabsContent').innerHTML = `
        <div class="card">
            <h3>📦 Módulo de Gestión de Pedidos</h3>
            <p>Esta funcionalidad estará disponible en la próxima actualización.</p>
            <p class="text-muted">Podrás: crear, editar, eliminar y dar seguimiento a todos los pedidos.</p>
        </div>
    `;
}

async function cargarProductos() { 
    document.getElementById('tabsContent').innerHTML = `
        <div class="card">
            <h3>🛒 Módulo de Inventario</h3>
            <p>Esta funcionalidad estará disponible en la próxima actualización.</p>
            <p class="text-muted">Podrás: gestionar productos, control de stock, precios y más.</p>
        </div>
    `;
}

async function cargarClientes() { 
    document.getElementById('tabsContent').innerHTML = `
        <div class="card">
            <h3>👥 Módulo de Clientes</h3>
            <p>Esta funcionalidad estará disponible en la próxima actualización.</p>
            <p class="text-muted">Podrás: gestionar clientes, ver historial de compras y más.</p>
        </div>
    `;
}

async function cargarTrabajadores() { 
    document.getElementById('tabsContent').innerHTML = `
        <div class="card">
            <h3>👨‍🔧 Módulo de Trabajadores</h3>
            <p>Esta funcionalidad estará disponible en la próxima actualización.</p>
            <p class="text-muted">Podrás: gestionar empleados, asignar tareas y controlar rendimiento.</p>
        </div>
    `;
}

async function cargarReportes() { 
    document.getElementById('tabsContent').innerHTML = `
        <div class="card">
            <h3>📄 Módulo de Reportes</h3>
            <p>Esta funcionalidad estará disponible en la próxima actualización.</p>
            <p class="text-muted">Podrás: generar reportes PDF, análisis de ventas y más.</p>
        </div>
    `;
}
