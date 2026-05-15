// ============================================
// PANEL_TRABAJADOR.JS - PANEL DE TRABAJADOR v2.0
// ============================================

let pedidosDisponibles = [];
let misPedidos = [];
let filtroEstadoTrabajador = 'todos';
let areasTrabajador = [];

async function cargarPanelTrabajador() {
    if (!verificarSesion() || esAdmin()) return;

    const container = document.getElementById('vistaDinamica');
    container.innerHTML = `
        <div class="animate-fade-in">
            <!-- Stats del trabajador -->
            <div class="stats-grid" style="grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));">
                <div class="stat-card primary">
                    <div class="stat-header">
                        <div>
                            <div class="stat-label">Mis Pedidos</div>
                            <div class="stat-value" id="statMisPedidos">-</div>
                        </div>
                        <div class="stat-icon primary">📋</div>
                    </div>
                </div>
                <div class="stat-card warning">
                    <div class="stat-header">
                        <div>
                            <div class="stat-label">En Progreso</div>
                            <div class="stat-value" id="statEnProgreso">-</div>
                        </div>
                        <div class="stat-icon warning">🔧</div>
                    </div>
                </div>
                <div class="stat-card success">
                    <div class="stat-header">
                        <div>
                            <div class="stat-label">Terminados</div>
                            <div class="stat-value" id="statTerminadosTra">-</div>
                        </div>
                        <div class="stat-icon success">✅</div>
                    </div>
                </div>
                <div class="stat-card info">
                    <div class="stat-header">
                        <div>
                            <div class="stat-label">Disponibles</div>
                            <div class="stat-value" id="statDisponibles">-</div>
                        </div>
                        <div class="stat-icon info">📦</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">👷 Mi Panel de Trabajo</div>
                        <div class="card-subtitle">Áreas: <span id="areasDisplay">Cargando...</span></div>
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="cargarVistaActual()">🔄 Refrescar</button>
                </div>

                <div class="tabs-pills">
                    <button class="tab-pill active" id="tabMis" onclick="cambiarVistaTrabajador('mis')">📋 Mis Pedidos</button>
                    <button class="tab-pill" id="tabDisp" onclick="cambiarVistaTrabajador('disponibles')">📦 Pedidos Disponibles</button>
                </div>

                <div id="listaPedidosTrabajador">
                    <div class="loading"><div class="spinner"></div><p>Cargando pedidos...</p></div>
                </div>
            </div>
        </div>
    `;

    await cargarAreasTrabajador();
    await cargarEstadisticasTrabajador();
    await cargarMisPedidos();
}

async function cargarAreasTrabajador() {
    try {
        const { data: usuarioAreas, error: e1 } = await db
            .from('usuario_areas')
            .select('area_id')
            .eq('usuario_id', AppState.currentUser.id);

        if (e1) throw e1;

        if (!usuarioAreas || usuarioAreas.length === 0) {
            areasTrabajador = [];
            document.getElementById('areasDisplay').textContent = 'Sin áreas asignadas';
            return;
        }

        const areaIds = usuarioAreas.map(ua => ua.area_id);
        const { data: areas, error: e2 } = await db
            .from('areas')
            .select('id, nombre, icono')
            .in('id', areaIds);

        if (e2) throw e2;
        areasTrabajador = areas || [];

        const nombres = areasTrabajador.map(a => `${a.icono || '🔧'} ${a.nombre}`).join(', ');
        document.getElementById('areasDisplay').textContent = nombres;
    } catch (err) {
        console.error('Error cargando áreas:', err);
        areasTrabajador = [];
    }
}

async function cargarEstadisticasTrabajador() {
    try {
        const { data: todos } = await db.from('pedidos').select('estado').eq('asignado_a', AppState.currentUser.id);
        const { data: disponibles } = await db.from('pedidos').select('id').eq('estado', 'pendiente');

        const mis = todos || [];
        document.getElementById('statMisPedidos').textContent = mis.length;
        document.getElementById('statEnProgreso').textContent = mis.filter(p => p.estado === 'en_progreso' || p.estado === 'asignado').length;
        document.getElementById('statTerminadosTra').textContent = mis.filter(p => p.estado === 'terminado').length;
        document.getElementById('statDisponibles').textContent = (disponibles || []).length;
    } catch (err) {
        console.error('Error stats:', err);
    }
}

let vistaTrabajadorActual = 'mis';

function cambiarVistaTrabajador(vista) {
    vistaTrabajadorActual = vista;
    document.getElementById('tabMis').classList.toggle('active', vista === 'mis');
    document.getElementById('tabDisp').classList.toggle('active', vista === 'disponibles');

    if (vista === 'mis') cargarMisPedidos();
    else cargarPedidosDisponibles();
}

async function cargarVistaActual() {
    await cargarEstadisticasTrabajador();
    if (vistaTrabajadorActual === 'mis') await cargarMisPedidos();
    else await cargarPedidosDisponibles();
}

async function cargarPedidosDisponibles() {
    const container = document.getElementById('listaPedidosTrabajador');
    if (!container) return;
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Cargando disponibles...</p></div>';

    try {
        const areasIds = areasTrabajador.map(a => a.id);

        if (areasIds.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔧</div>
                    <div class="empty-state-title">Sin áreas asignadas</div>
                    <div class="empty-state-desc">Contacta al administrador para que te asigne áreas de trabajo</div>
                </div>
            `;
            return;
        }

        const { data: misRechazos } = await db
            .from('rechazos_trabajadores')
            .select('pedido_id')
            .eq('trabajador_id', AppState.currentUser.id);

        const rechazadosIds = misRechazos?.map(r => r.pedido_id) || [];

        let query = db
            .from('pedidos')
            .select('*, clientes(nombre), detalle_pedido(*)')
            .eq('estado', 'pendiente')
            .in('categoria_id', areasIds)
            .order('created_at', { ascending: true });

        if (rechazadosIds.length > 0) {
            query = query.not('id', 'in', `(${rechazadosIds.join(',')})`);
        }

        const { data, error } = await query;
        if (error) throw error;

        pedidosDisponibles = data || [];

        if (pedidosDisponibles.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📦</div>
                    <div class="empty-state-title">No hay pedidos disponibles</div>
                    <div class="empty-state-desc">No hay pedidos pendientes en tus áreas de trabajo</div>
                </div>
            `;
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
                            <th>Fecha</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        for (const p of pedidosDisponibles) {
            const detalles = p.detalle_pedido || [];
            const productosHtml = detalles.map(d => 
                `<div class="text-xs text-muted">${d.cantidad} x ${d.descripcion?.substring(0, 40) || ''}${d.descripcion?.length > 40 ? '...' : ''}</div>`
            ).join('');

            html += `
                <tr>
                    <td><strong>${p.codigo}</strong></td>
                    <td>${p.clientes?.nombre || 'N/A'}</td>
                    <td>${productosHtml || '<span class="text-muted">Sin productos</span>'}</td>
                    <td class="text-muted text-xs">${formatDateShort(p.created_at)}</td>
                    <td>
                        <div style="display:flex; gap:0.25rem;">
                            <button class="btn btn-success btn-sm" style="padding:0.3rem 0.6rem; font-size:0.7rem;" onclick="tomarPedido(${p.id}, '${p.codigo}')">✅ Tomar</button>
                            <button class="btn btn-warning btn-sm" style="padding:0.3rem 0.6rem; font-size:0.7rem;" onclick="rechazarPedidoTrabajador(${p.id}, '${p.codigo}')">❌</button>
                        </div>
                    </td>
                </tr>
            `;
        }

        html += `</tbody></table></div>`;
        container.innerHTML = html;
    } catch (err) {
        container.innerHTML = `<div class="alert alert-danger"><span class="alert-icon">❌</span><div>Error: ${err.message}</div></div>`;
    }
}

async function cargarMisPedidos() {
    const container = document.getElementById('listaPedidosTrabajador');
    if (!container) return;
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Cargando mis pedidos...</p></div>';

    try {
        let query = db
            .from('pedidos')
            .select('*, clientes(nombre), detalle_pedido(*)')
            .eq('asignado_a', AppState.currentUser.id);

        if (filtroEstadoTrabajador !== 'todos') {
            query = query.eq('estado', filtroEstadoTrabajador);
        }

        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;

        misPedidos = data || [];

        let filtrosHtml = `
            <div class="filtros-bar" style="margin-bottom:1rem;">
                <span class="text-muted text-sm" style="font-weight:600;">🔍 Filtrar:</span>
                <button class="filtro-btn ${filtroEstadoTrabajador === 'todos' ? 'active' : ''}" onclick="aplicarFiltroTrabajador('todos')">Todos</button>
                <button class="filtro-btn ${filtroEstadoTrabajador === 'asignado' ? 'active' : ''}" onclick="aplicarFiltroTrabajador('asignado')">📌 Asignados</button>
                <button class="filtro-btn ${filtroEstadoTrabajador === 'en_progreso' ? 'active' : ''}" onclick="aplicarFiltroTrabajador('en_progreso')">🔧 En progreso</button>
                <button class="filtro-btn ${filtroEstadoTrabajador === 'terminado' ? 'active' : ''}" onclick="aplicarFiltroTrabajador('terminado')">✅ Terminados</button>
            </div>
        `;

        if (misPedidos.length === 0) {
            container.innerHTML = filtrosHtml + `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <div class="empty-state-title">No tienes pedidos asignados</div>
                    <div class="empty-state-desc">Ve a "Pedidos Disponibles" para tomar uno</div>
                    <button class="btn btn-primary" onclick="cambiarVistaTrabajador('disponibles')">📦 Ver disponibles</button>
                </div>
            `;
            return;
        }

        let html = filtrosHtml + `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Cliente</th>
                            <th>Productos</th>
                            <th>Estado</th>
                            <th>Entrega Est.</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        for (const p of misPedidos) {
            const detalles = p.detalle_pedido || [];
            const productosHtml = detalles.map(d => 
                `<div class="text-xs text-muted">${d.cantidad} x ${d.descripcion?.substring(0, 35) || ''}${d.descripcion?.length > 35 ? '...' : ''}</div>`
            ).join('');

            html += `
                <tr>
                    <td><strong>${p.codigo}</strong></td>
                    <td>${p.clientes?.nombre || 'N/A'}</td>
                    <td>${productosHtml || '<span class="text-muted">Sin productos</span>'}</td>
                    <td>
                        <select class="form-control" style="width:130px; font-size:0.75rem; padding:0.35rem;" onchange="cambiarEstadoPedidoTrabajador(${p.id}, this.value)">
                            <option value="asignado" ${p.estado === 'asignado' ? 'selected' : ''}>📌 Asignado</option>
                            <option value="en_progreso" ${p.estado === 'en_progreso' ? 'selected' : ''}>🔧 En progreso</option>
                            <option value="terminado" ${p.estado === 'terminado' ? 'selected' : ''}>✅ Terminado</option>
                        </select>
                    </td>
                    <td>
                        <div style="display:flex; align-items:center; gap:0.5rem;">
                            <span class="text-muted text-xs">${p.fecha_estimada_entrega ? formatDateShort(p.fecha_estimada_entrega) : 'Sin fecha'}</span>
                            <button class="btn btn-info btn-sm" style="padding:0.2rem 0.5rem; font-size:0.7rem;" onclick="agregarFechaEstimada(${p.id})">📅</button>
                        </div>
                    </td>
                    <td>
                        <div style="display:flex; flex-direction:column; gap:0.25rem;">
                            <button class="btn btn-info btn-sm" style="padding:0.3rem 0.6rem; font-size:0.7rem;" onclick="verDetallePedidoTrabajador(${p.id})">👁️ Ver</button>
                            ${p.estado === 'terminado' ? `<button class="btn btn-success btn-sm" style="padding:0.3rem 0.6rem; font-size:0.7rem;" onclick="generarReciboPedido(${p.id})">📄 Recibo</button>` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }

        html += `</tbody></table></div>`;
        container.innerHTML = html;
    } catch (err) {
        container.innerHTML = `<div class="alert alert-danger"><span class="alert-icon">❌</span><div>Error: ${err.message}</div></div>`;
    }
}

function aplicarFiltroTrabajador(estado) {
    filtroEstadoTrabajador = estado;
    cargarMisPedidos();
}

async function rechazarPedidoTrabajador(id, codigo) {
    const motivo = prompt(`❌ ¿Por qué rechazas el pedido ${codigo}?\n\nOtros trabajadores podrán tomarlo.`);
    if (!motivo || !motivo.trim()) { Toast.warning('Debes ingresar un motivo'); return; }

    try {
        await db.from('rechazos_trabajadores').insert([{
            pedido_id: id,
            trabajador_id: AppState.currentUser.id,
            motivo: motivo.trim()
        }]);
        Toast.success(`Pedido ${codigo} rechazado`);
        await cargarPedidosDisponibles();
    } catch (err) {
        Toast.error('Error: ' + err.message);
    }
}

async function tomarPedido(id, codigo) {
    if (!confirm(`¿Tomar el pedido ${codigo}?\nPasará a estar bajo tu responsabilidad.`)) return;

    const fechaEstimada = prompt('📅 Fecha estimada de entrega (DD/MM/YYYY):', new Date().toLocaleDateString());
    let fechaFormateada = null;

    if (fechaEstimada) {
        const partes = fechaEstimada.split('/');
        if (partes.length === 3) fechaFormateada = `${partes[2]}-${partes[1]}-${partes[0]}`;
    }

    try {
        const { error } = await db.from('pedidos').update({
            asignado_a: AppState.currentUser.id,
            estado: 'asignado',
            fecha_asignacion: new Date().toISOString(),
            fecha_estimada_entrega: fechaFormateada
        }).eq('id', id);

        if (error) throw error;
        Toast.success(`Pedido ${codigo} asignado a ti`);
        await cargarVistaActual();
    } catch (err) {
        Toast.error('Error: ' + err.message);
    }
}

async function agregarFechaEstimada(id) {
    const fecha = prompt('📅 Fecha estimada (DD/MM/YYYY):', new Date().toLocaleDateString());
    if (!fecha) return;

    const partes = fecha.split('/');
    if (partes.length !== 3) { Toast.warning('Formato inválido. Usa DD/MM/YYYY'); return; }

    try {
        const { error } = await db.from('pedidos').update({
            fecha_estimada_entrega: `${partes[2]}-${partes[1]}-${partes[0]}`
        }).eq('id', id);
        if (error) throw error;
        Toast.success('Fecha actualizada');
        await cargarMisPedidos();
    } catch (err) {
        Toast.error('Error: ' + err.message);
    }
}

async function cambiarEstadoPedidoTrabajador(id, nuevoEstado) {
    try {
        // Validar que el pedido pertenece a este trabajador
        const { data: pedidoCheck, error: checkError } = await db
            .from('pedidos')
            .select('asignado_a')
            .eq('id', id)
            .single();

        if (checkError) throw checkError;

        if (pedidoCheck.asignado_a !== AppState.currentUser.id) {
            Toast.error('No puedes modificar un pedido que no está asignado a ti');
            return;
        }

        const updates = { estado: nuevoEstado };
        if (nuevoEstado === 'terminado') {
            updates.fecha_terminado = new Date().toISOString();
        }

        const { error } = await db.from('pedidos').update(updates).eq('id', id);
        if (error) throw error;

        if (nuevoEstado === 'terminado') {
            Toast.success('¡Pedido terminado! Puedes generar el recibo.');
        } else {
            Toast.success('Estado actualizado');
        }
        await cargarMisPedidos();
    } catch (err) {
        Toast.error('Error: ' + err.message);
    }
}

async function verDetallePedidoTrabajador(id) {
    try {
        const { data: pedido } = await db.from('pedidos').select('*, clientes(nombre)').eq('id', id).single();
        const { data: detalles } = await db.from('detalle_pedido').select('*').eq('pedido_id', id);

        const lista = (detalles || []).map(d => `- ${d.cantidad} x ${d.descripcion} = ${formatMoney(d.subtotal)}`).join('\n') || 'Sin productos';

        alert(`📋 PEDIDO ${pedido.codigo}\n${'='.repeat(40)}\n👤 ${pedido.clientes?.nombre}\n📊 ${formatearEstado(pedido.estado)}\n${'='.repeat(40)}\n📦 PRODUCTOS:\n${lista}`);
    } catch (err) {
        Toast.error('Error: ' + err.message);
    }
}

function generarReciboPedido(id) {
    Toast.info('Generando recibo... (funcionalidad en desarrollo)');
}

window.cargarPanelTrabajador = cargarPanelTrabajador;
window.cambiarVistaTrabajador = cambiarVistaTrabajador;
window.tomarPedido = tomarPedido;
window.rechazarPedidoTrabajador = rechazarPedidoTrabajador;
window.agregarFechaEstimada = agregarFechaEstimada;
window.cambiarEstadoPedidoTrabajador = cambiarEstadoPedidoTrabajador;
window.verDetallePedidoTrabajador = verDetallePedidoTrabajador;
window.generarReciboPedido = generarReciboPedido;
window.aplicarFiltroTrabajador = aplicarFiltroTrabajador;
