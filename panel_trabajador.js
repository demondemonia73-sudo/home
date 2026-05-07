// ============================================
// PANEL DEL TRABAJADOR
// ============================================

let pedidosDisponibles = [];
let misPedidos = [];
let filtroEstado = 'todos';
let areasTrabajador = [];

// Cargar panel del trabajador
async function cargarPanelTrabajador() {
    if (!verificarSesion() || esAdmin()) return;
    
    console.log('👨‍🔧 Cargando panel de trabajador:', AppState.currentUser.nombre);
    
    // Obtener áreas del trabajador
    await cargarAreasTrabajador();
    
    const tabsContent = document.getElementById('tabsContent');
    tabsContent.innerHTML = `
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
                <h2 style="margin: 0;">👨‍🔧 Mi Panel de Trabajo</h2>
                <button id="btnRefrescar" class="btn btn-primary">🔄 Refrescar</button>
            </div>
            
            <!-- Pestañas internas del trabajador -->
            <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap;">
                <button id="btnMisPedidos" class="tab-btn-interno active" data-tab="mis">📋 Mis Pedidos</button>
                <button id="btnPedidosDisponibles" class="tab-btn-interno" data-tab="disponibles">📦 Pedidos Disponibles</button>
            </div>
            
            <!-- Lista de pedidos -->
            <div id="listaPedidosTrabajador">
                <div class="loading">Cargando pedidos...</div>
            </div>
        </div>
    `;
    
    // Estilos para pestañas internas
    const style = document.createElement('style');
    style.textContent = `
        .tab-btn-interno {
            background: #e0e0e0;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            transition: all 0.3s;
        }
        .tab-btn-interno.active {
            background: #1a73e8;
            color: white;
        }
    `;
    document.head.appendChild(style);
    
    // Asignar eventos
    document.getElementById('btnRefrescar').onclick = () => cargarVistaActual();
    document.getElementById('btnMisPedidos').onclick = () => cambiarVista('mis');
    document.getElementById('btnPedidosDisponibles').onclick = () => cambiarVista('disponibles');
    
    let vistaActual = 'mis';
    
    function cambiarVista(vista) {
        vistaActual = vista;
        document.querySelectorAll('.tab-btn-interno').forEach(btn => btn.classList.remove('active'));
        if (vista === 'mis') {
            document.getElementById('btnMisPedidos').classList.add('active');
            cargarMisPedidos();
        } else {
            document.getElementById('btnPedidosDisponibles').classList.add('active');
            cargarPedidosDisponibles();
        }
    }
    
    async function cargarVistaActual() {
        if (vistaActual === 'mis') {
            await cargarMisPedidos();
        } else {
            await cargarPedidosDisponibles();
        }
    }
    
    await cargarMisPedidos();
}

async function cargarAreasTrabajador() {
    try {
        const { data, error } = await db
            .from('usuario_areas')
            .select('area_id, areas(nombre, icono)')
            .eq('usuario_id', AppState.currentUser.id);
        
        if (error) throw error;
        
        areasTrabajador = data?.map(item => ({
            id: item.area_id,
            nombre: item.areas?.nombre,
            icono: item.areas?.icono
        })) || [];
        
        console.log('Áreas del trabajador:', areasTrabajador);
    } catch (err) {
        console.error('Error cargando áreas:', err);
    }
}

async function cargarPedidosDisponibles() {
    const container = document.getElementById('listaPedidosTrabajador');
    container.innerHTML = '<div class="loading">Cargando pedidos disponibles...</div>';
    
    try {
        // Obtener IDs de las áreas del trabajador
        const areasIds = areasTrabajador.map(a => a.id);
        
        if (areasIds.length === 0) {
            container.innerHTML = '<div class="alert alert-info" style="text-align: center;">No tienes áreas asignadas. Contacta al administrador.</div>';
            return;
        }
        
        // Buscar pedidos pendientes de las áreas del trabajador
        const { data, error } = await db
            .from('pedidos')
            .select('*, clientes(nombre, telefono), detalle_pedido(*)')
            .eq('estado', 'pendiente')
            .in('categoria_id', areasIds)
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        pedidosDisponibles = data || [];
        
        if (pedidosDisponibles.length === 0) {
            container.innerHTML = '<div class="alert alert-info" style="text-align: center;">No hay pedidos disponibles en tus áreas.</div>';
            return;
        }
        
        let html = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Cliente</th>
                            <th>Productos</th>
                            <th>Total</th>
                            <th>Fecha</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        for (const p of pedidosDisponibles) {
            const detalles = p.detalle_pedido || [];
            const productosHtml = detalles.map(d => `
                <div style="font-size: 0.75rem;">${d.cantidad} x ${d.descripcion.substring(0, 50)}</div>
            `).join('');
            
            html += `
                <tr>
                    <td><strong>${p.codigo}</strong></td>
                    <td>${p.clientes?.nombre || 'N/A'}<br><small>${p.clientes?.telefono || ''}</small></td>
                    <td>${productosHtml || 'Sin productos'}</td>
                    <td><strong style="color: #28a745;">Bs ${p.total.toFixed(2)}</strong></td>
                    <td><small>${new Date(p.created_at).toLocaleDateString()}</small></td>
                    <td>
                        <button class="btn btn-success" style="padding: 0.3rem 0.6rem;" onclick="tomarPedido(${p.id}, '${p.codigo}')">📋 Tomar Pedido</button>
                    </td>
                </tr>
            `;
        }
        
        html += `</tbody></table></div>`;
        container.innerHTML = html;
        
    } catch (err) {
        container.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
    }
}

async function cargarMisPedidos() {
    const container = document.getElementById('listaPedidosTrabajador');
    container.innerHTML = '<div class="loading">Cargando mis pedidos...</div>';
    
    try {
        // Buscar pedidos asignados al trabajador
        let query = db
            .from('pedidos')
            .select('*, clientes(nombre, telefono), detalle_pedido(*)')
            .eq('asignado_a', AppState.currentUser.id);
        
        if (filtroEstado !== 'todos') {
            query = query.eq('estado', filtroEstado);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });
        
        if (error) throw error;
        
        misPedidos = data || [];
        
        if (misPedidos.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info" style="text-align: center;">
                    No tienes pedidos asignados.
                    <div style="margin-top: 1rem;">
                        <button class="btn btn-primary" onclick="cargarPedidosDisponibles()">📦 Ver pedidos disponibles</button>
                    </div>
                </div>
            `;
            return;
        }
        
        // Filtros de estado para el trabajador
        let filtrosHtml = `
            <div style="background: #f8f9fa; padding: 0.8rem; border-radius: 8px; margin-bottom: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
                <strong>📌 Filtrar:</strong>
                <button id="filtroTodos" class="btn-filtro-trabajador" data-estado="todos" style="padding: 0.2rem 0.6rem; border-radius: 15px; border: none; cursor: pointer; background: #1a73e8; color: white;">Todos</button>
                <button id="filtroAsignado" class="btn-filtro-trabajador" data-estado="asignado" style="padding: 0.2rem 0.6rem; border-radius: 15px; border: 1px solid #ddd; cursor: pointer;">📋 Asignados</button>
                <button id="filtroProgreso" class="btn-filtro-trabajador" data-estado="en_progreso" style="padding: 0.2rem 0.6rem; border-radius: 15px; border: 1px solid #ddd; cursor: pointer;">⚙️ En progreso</button>
                <button id="filtroTerminado" class="btn-filtro-trabajador" data-estado="terminado" style="padding: 0.2rem 0.6rem; border-radius: 15px; border: 1px solid #ddd; cursor: pointer;">✅ Terminados</button>
            </div>
        `;
        
        let html = filtrosHtml + `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Cliente</th>
                            <th>Productos</th>
                            <th>Total</th>
                            <th>Estado</th>
                            <th>Fecha Estimada</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        for (const p of misPedidos) {
            const detalles = p.detalle_pedido || [];
            const productosHtml = detalles.map(d => `
                <div style="font-size: 0.75rem; border-bottom: 1px solid #eee; padding: 2px 0;">
                    ${d.cantidad} x ${d.descripcion.substring(0, 40)}${d.descripcion.length > 40 ? '...' : ''}
                </div>
            `).join('');
            
            const estadoOptions = {
                'pendiente': '⏳ Pendiente',
                'asignado': '📋 Asignado',
                'en_progreso': '⚙️ En progreso',
                'terminado': '✅ Terminado',
                'entregado': '📦 Entregado'
            };
            
            html += `
                <tr>
                    <td><strong>${p.codigo}</strong></td>
                    <td>${p.clientes?.nombre || 'N/A'}<br><small>${p.clientes?.telefono || ''}</small></td>
                    <td>${productosHtml || 'Sin productos'}</td>
                    <td><strong style="color: #28a745;">Bs ${p.total.toFixed(2)}</strong></td>
                    <td>
                        <select id="estado-${p.id}" class="form-control" style="width: 120px; padding: 0.2rem;" onchange="cambiarEstadoPedidoTrabajador(${p.id}, this.value)">
                            <option value="asignado" ${p.estado === 'asignado' ? 'selected' : ''}>📋 Asignado</option>
                            <option value="en_progreso" ${p.estado === 'en_progreso' ? 'selected' : ''}>⚙️ En progreso</option>
                            <option value="terminado" ${p.estado === 'terminado' ? 'selected' : ''}>✅ Terminado</option>
                        </select>
                    </td>
                    <td>
                        ${p.fecha_estimada_entrega ? new Date(p.fecha_estimada_entrega).toLocaleDateString() : 'Sin fecha'}
                        <button class="btn" style="background: #17a2b8; padding: 0.2rem 0.4rem; font-size: 0.7rem; margin-left: 0.3rem;" onclick="agregarFechaEstimada(${p.id})">📅</button>
                    </td>
                    <td>
                        <button class="btn" style="background: #ffc107; color: #333; padding: 0.3rem 0.5rem; margin-bottom: 0.2rem;" onclick="verDetallePedidoTrabajador(${p.id})">👁️ Ver</button>
                        ${p.estado === 'terminado' ? `<button class="btn btn-success" style="padding: 0.3rem 0.5rem;" onclick="generarReciboPedido(${p.id})">📄 Recibo</button>` : ''}
                    </td>
                </td>
            `;
        }
        
        html += `</tbody></table></div>`;
        container.innerHTML = html;
        
        // Asignar eventos de filtros
        document.getElementById('filtroTodos')?.addEventListener('click', () => aplicarFiltroTrabajador('todos'));
        document.getElementById('filtroAsignado')?.addEventListener('click', () => aplicarFiltroTrabajador('asignado'));
        document.getElementById('filtroProgreso')?.addEventListener('click', () => aplicarFiltroTrabajador('en_progreso'));
        document.getElementById('filtroTerminado')?.addEventListener('click', () => aplicarFiltroTrabajador('terminado'));
        
    } catch (err) {
        container.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
    }
}

function aplicarFiltroTrabajador(estado) {
    filtroEstado = estado;
    
    document.querySelectorAll('.btn-filtro-trabajador').forEach(btn => {
        btn.style.background = '#f0f0f0';
        btn.style.color = '#333';
        btn.style.border = '1px solid #ddd';
    });
    
    const btnMap = {
        'todos': 'filtroTodos',
        'asignado': 'filtroAsignado',
        'en_progreso': 'filtroProgreso',
        'terminado': 'filtroTerminado'
    };
    
    const btnActivo = document.getElementById(btnMap[estado]);
    if (btnActivo) {
        btnActivo.style.background = '#1a73e8';
        btnActivo.style.color = 'white';
        btnActivo.style.border = 'none';
    }
    
    cargarMisPedidos();
}

async function tomarPedido(id, codigo) {
    if (!confirm(`¿Tomar el pedido ${codigo}?\n\nPasará a estar bajo tu responsabilidad.`)) return;
    
    try {
        const fechaEstimada = prompt('📅 Fecha estimada de entrega (DD/MM/YYYY):', new Date().toLocaleDateString());
        let fechaFormateada = null;
        
        if (fechaEstimada) {
            const partes = fechaEstimada.split('/');
            if (partes.length === 3) {
                fechaFormateada = `${partes[2]}-${partes[1]}-${partes[0]}`;
            }
        }
        
        const { error } = await db
            .from('pedidos')
            .update({ 
                asignado_a: AppState.currentUser.id,
                estado: 'asignado',
                fecha_asignacion: new Date(),
                fecha_estimada_entrega: fechaFormateada
            })
            .eq('id', id);
        
        if (error) throw error;
        
        alert(`✅ Pedido ${codigo} asignado a ti`);
        await cargarPedidosDisponibles();
        await cargarMisPedidos();
        
    } catch (err) {
        alert('❌ Error: ' + err.message);
    }
}

async function agregarFechaEstimada(id) {
    const fechaEstimada = prompt('📅 Fecha estimada de entrega (DD/MM/YYYY):', new Date().toLocaleDateString());
    
    if (!fechaEstimada) return;
    
    const partes = fechaEstimada.split('/');
    if (partes.length !== 3) {
        alert('Formato inválido. Usa DD/MM/YYYY');
        return;
    }
    
    const fechaFormateada = `${partes[2]}-${partes[1]}-${partes[0]}`;
    
    try {
        const { error } = await db
            .from('pedidos')
            .update({ fecha_estimada_entrega: fechaFormateada })
            .eq('id', id);
        
        if (error) throw error;
        
        alert('✅ Fecha estimada actualizada');
        await cargarMisPedidos();
        
    } catch (err) {
        alert('❌ Error: ' + err.message);
    }
}

async function cambiarEstadoPedidoTrabajador(id, nuevoEstado) {
    try {
        const { error } = await db
            .from('pedidos')
            .update({ estado: nuevoEstado })
            .eq('id', id);
        
        if (error) throw error;
        
        if (nuevoEstado === 'terminado') {
            await db.from('pedidos').update({ fecha_terminado: new Date() }).eq('id', id);
            alert('✅ Pedido marcado como terminado. Puedes generar el recibo de entrega.');
        }
        
        await cargarMisPedidos();
        
    } catch (err) {
        alert('❌ Error: ' + err.message);
    }
}

async function verDetallePedidoTrabajador(id) {
    const { data: pedido } = await db
        .from('pedidos')
        .select('*, clientes(nombre, telefono, direccion)')
        .eq('id', id)
        .single();
    
    const { data: detalles } = await db
        .from('detalle_pedido')
        .select('*')
        .eq('pedido_id', id);
    
    let detallesLista = detalles?.map(d => `- ${d.cantidad} x ${d.descripcion} = Bs ${d.subtotal.toFixed(2)}`).join('\n') || 'Sin productos';
    
    alert(`📄 PEDIDO ${pedido.codigo}\n━━━━━━━━━━━━━━━━━━━━━━\nCliente: ${pedido.clientes?.nombre}\nTeléfono: ${pedido.clientes?.telefono}\nDirección: ${pedido.clientes?.direccion || 'N/A'}\nEstado: ${pedido.estado}\nTotal: Bs ${pedido.total}\n━━━━━━━━━━━━━━━━━━━━━━\nProductos:\n${detallesLista}`);
}

function generarReciboPedido(id) {
    alert(`📄 Generando recibo de entrega del pedido #${id}...\n(Funcionalidad en desarrollo - Próximamente con PDF)`);
}

// Exponer funciones globalmente
window.tomarPedido = tomarPedido;
window.agregarFechaEstimada = agregarFechaEstimada;
window.cambiarEstadoPedidoTrabajador = cambiarEstadoPedidoTrabajador;
window.verDetallePedidoTrabajador = verDetallePedidoTrabajador;
window.generarReciboPedido = generarReciboPedido;
window.cargarPedidosDisponibles = cargarPedidosDisponibles;
