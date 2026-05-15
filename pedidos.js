// ============================================
// PEDIDOS.JS - GESTIÓN DE PEDIDOS v2.0
// ============================================

let pedidosData = [];
let filtroEstado = 'todos';

// ============================================
// CONSULTA CLIENTE (desde landing)
// ============================================

async function consultarPedido() {
    const codigo = document.getElementById('consultaCodigo').value.trim();
    const telefono = document.getElementById('consultaTelefono').value.trim();
    const resultadoDiv = document.getElementById('resultadoConsulta');

    if (!codigo || !telefono) {
        resultadoDiv.innerHTML = '<div class="alert alert-danger"><span class="alert-icon">⚠️</span><div>Ingresa código de pedido y teléfono</div></div>';
        return;
    }

    resultadoDiv.innerHTML = '<div class="loading"><div class="spinner"></div><p>Buscando pedido...</p></div>';

    try {
        let pedidos = [];
        let busquedaPorCodigo = false;

        if (codigo.toUpperCase().startsWith('PED-')) {
            busquedaPorCodigo = true;
            const { data, error } = await db
                .from('pedidos')
                .select('*, clientes(*)')
                .eq('codigo', codigo)
                .maybeSingle();

            if (error) throw error;
            if (data) pedidos = [data];
        } else {
            const { data: pedidosData, error: pedidosError } = await db
                .from('pedidos')
                .select('*, clientes(*)')
                .eq('clientes.telefono', telefono)
                .ilike('clientes.nombre', `%${codigo}%`);

            if (pedidosError) throw pedidosError;
            pedidos = pedidosData || [];
        }

        if (pedidos.length === 0) {
            resultadoDiv.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔍</div>
                    <div class="empty-state-title">No se encontraron pedidos</div>
                    <div class="empty-state-desc">Verifica el código y teléfono, o realiza un nuevo pedido</div>
                    <a href="tienda.html" class="btn btn-primary">🛒 Ir a la Tienda</a>
                </div>
            `;
            return;
        }

        if (busquedaPorCodigo && pedidos[0]?.clientes?.telefono !== telefono) {
            resultadoDiv.innerHTML = '<div class="alert alert-danger"><span class="alert-icon">❌</span><div>Teléfono incorrecto para este pedido</div></div>';
            return;
        }

        let html = '<div style="display:flex; flex-direction:column; gap:1rem;">';

        for (const pedido of pedidos) {
            const { data: detalles } = await db
                .from('detalle_pedido')
                .select('*')
                .eq('pedido_id', pedido.id);

            html += renderPedidoCliente(pedido, detalles || []);
        }

        html += '</div>';
        resultadoDiv.innerHTML = html;

    } catch (err) {
        console.error('Error consulta:', err);
        resultadoDiv.innerHTML = `<div class="alert alert-danger"><span class="alert-icon">❌</span><div>Error: ${err.message}</div></div>`;
    }
}

function renderPedidoCliente(pedido, detalles) {
    const estadoColor = {
        'pendiente': 'var(--warning)',
        'en_proceso': 'var(--info)',
        'terminado': 'var(--success)',
        'entregado': 'var(--primary-500)',
        'rechazado': 'var(--danger)',
        'rechazado_definitivo': 'var(--danger)',
        'cotizado': '#ec4899',
        'cancelado_por_cliente': 'var(--danger)'
    };

    const estadoText = {
        'pendiente': '⏳ Pendiente de asignación',
        'en_proceso': '🔧 En proceso de fabricación',
        'terminado': '✅ Terminado - Listo para retirar',
        'entregado': '📦 Entregado',
        'rechazado': '❌ Rechazado temporalmente',
        'rechazado_definitivo': '🚫 Cancelado definitivamente',
        'cotizado': '💰 Esperando tu aprobación',
        'cancelado_por_cliente': '🚫 Cancelado por el cliente'
    };

    let detallesHtml = '';
    if (detalles.length > 0) {
        detallesHtml = `
            <div style="margin-top:1rem; padding-top:1rem; border-top:1px solid var(--border-light);">
                <div style="font-weight:600; font-size:0.875rem; margin-bottom:0.5rem; color:var(--text-secondary);">📦 Productos:</div>
                ${detalles.map(d => `
                    <div style="display:flex; justify-content:space-between; padding:0.4rem 0; font-size:0.875rem; border-bottom:1px solid var(--border-light);">
                        <span>${d.cantidad} x ${d.descripcion}</span>
                        <span style="font-weight:600;">${formatMoney(d.subtotal)}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    let accionesHtml = '';
    if (pedido.estado === 'cotizado' && pedido.precio_asignado_manual) {
        accionesHtml = `
            <div style="margin-top:1rem; padding:1rem; background:var(--info-light); border-radius:var(--radius-sm);">
                <div style="font-weight:700; margin-bottom:0.5rem;">💰 Precio cotizado: ${formatMoney(pedido.precio_asignado_manual)}</div>
                <div style="display:flex; gap:0.5rem;">
                    <button class="btn btn-success btn-sm" onclick="aceptarCotizacion(${pedido.id}, '${pedido.codigo}')">✅ Aceptar</button>
                    <button class="btn btn-danger btn-sm" onclick="cancelarCotizacion(${pedido.id}, '${pedido.codigo}')">❌ Cancelar</button>
                </div>
            </div>
        `;
    }

    if (pedido.estado === 'rechazado_definitivo') {
        return `
            <div class="card" style="border-left:4px solid ${estadoColor[pedido.estado] || 'var(--danger)'};">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem;">
                    <div>
                        <div style="font-size:1.25rem; font-weight:800; color:var(--text-primary);">📋 ${pedido.codigo}</div>
                        <div class="text-muted text-sm">${formatDate(pedido.created_at)}</div>
                    </div>
                    <span class="badge badge-rechazado_definitivo">${estadoText[pedido.estado]}</span>
                </div>
                <div class="alert alert-danger" style="margin:0.75rem 0;">
                    <strong>Motivo de cancelación:</strong> ${pedido.motivo_rechazo_definitivo || 'No especificado'}
                </div>
                ${detallesHtml}
                <div style="margin-top:1rem;">
                    <a href="tienda.html" class="btn btn-primary btn-sm">🛒 Hacer nuevo pedido</a>
                </div>
            </div>
        `;
    }

    return `
        <div class="card" style="border-left:4px solid ${estadoColor[pedido.estado] || 'var(--primary-500)'};">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem;">
                <div>
                    <div style="font-size:1.25rem; font-weight:800; color:var(--text-primary);">📋 ${pedido.codigo}</div>
                    <div class="text-muted text-sm">${formatDate(pedido.created_at)}</div>
                </div>
                <span class="badge badge-${pedido.estado}">${estadoText[pedido.estado] || pedido.estado}</span>
            </div>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:0.75rem; margin:0.75rem 0; font-size:0.875rem;">
                <div><span class="text-muted">Cliente:</span> <strong>${pedido.clientes?.nombre || 'N/A'}</strong></div>
                <div><span class="text-muted">Teléfono:</span> <strong>${pedido.clientes?.telefono || 'N/A'}</strong></div>
                ${pedido.tipo_entrega ? `<div><span class="text-muted">Entrega:</span> <strong>${formatearEntrega(pedido.tipo_entrega)}</strong></div>` : ''}
                ${pedido.fecha_estimada_entrega ? `<div><span class="text-muted">Entrega estimada:</span> <strong>${formatDateShort(pedido.fecha_estimada_entrega)}</strong></div>` : ''}
            </div>
            ${detallesHtml}
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1rem; padding-top:1rem; border-top:1px solid var(--border-light);">
                <div style="font-size:1.25rem; font-weight:800; color:var(--success);">${formatMoney(pedido.total)}</div>
                ${pedido.estado === 'terminado' ? '<button class="btn btn-success btn-sm" onclick="alert("📞 Contáctanos para coordinar la entrega")">📦 Solicitar retiro</button>' : ''}
            </div>
            ${accionesHtml}
        </div>
    `;
}

function formatearEntrega(tipo) {
    const map = {
        'retiro_taller': '🏭 Retiro en taller',
        'envio_domicilio': '🚚 Envío a domicilio',
        'entrega_tienda': '🏪 Entrega en tienda'
    };
    return map[tipo] || tipo;
}

// ============================================
// GESTIÓN ADMIN
// ============================================

async function cargarPedidos() {
    if (!verificarSesion() || !esAdmin()) return;

    const container = document.getElementById('vistaDinamica');
    container.innerHTML = `
        <div class="card animate-fade-in">
            <div class="card-header">
                <div>
                    <div class="card-title">📋 Gestión de Pedidos</div>
                    <div class="card-subtitle">Administra todos los pedidos del sistema</div>
                </div>
                <button class="btn btn-primary btn-sm" onclick="refrescarListaPedidos()">🔄 Refrescar</button>
            </div>

            <div class="filtros-bar">
                <span class="text-muted text-sm" style="font-weight:600;">🔍 Filtrar:</span>
                <button class="filtro-btn active" data-estado="todos" onclick="aplicarFiltro('todos')">Todos</button>
                <button class="filtro-btn" data-estado="pendiente" onclick="aplicarFiltro('pendiente')">⏳ Pendientes</button>
                <button class="filtro-btn" data-estado="en_proceso" onclick="aplicarFiltro('en_proceso')">🔧 En proceso</button>
                <button class="filtro-btn" data-estado="terminado" onclick="aplicarFiltro('terminado')">✅ Terminados</button>
                <button class="filtro-btn" data-estado="entregado" onclick="aplicarFiltro('entregado')">📦 Entregados</button>
                <button class="filtro-btn" data-estado="rechazado" onclick="aplicarFiltro('rechazado')">❌ Rechazados</button>
                <button class="filtro-btn" data-estado="cotizado" onclick="aplicarFiltro('cotizado')">💰 Cotizados</button>
            </div>

            <div id="listaPedidos">
                <div class="loading"><div class="spinner"></div><p>Cargando pedidos...</p></div>
            </div>
        </div>
    `;

    await refrescarListaPedidos();
}

function aplicarFiltro(estado) {
    filtroEstado = estado;

    document.querySelectorAll('.filtro-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.estado === estado) btn.classList.add('active');
    });

    refrescarListaPedidos();
}

async function refrescarListaPedidos() {
    const listaDiv = document.getElementById('listaPedidos');
    if (!listaDiv) return;
    listaDiv.innerHTML = '<div class="loading"><div class="spinner"></div><p>Cargando...</p></div>';

    try {
        let query = db
            .from('pedidos')
            .select('*, clientes(nombre, telefono, direccion)')
            .order('created_at', { ascending: false });

        if (filtroEstado !== 'todos') {
            query = query.eq('estado', filtroEstado);
        }

        const { data, error } = await query;
        if (error) throw error;

        pedidosData = data || [];

        if (pedidosData.length === 0) {
            listaDiv.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <div class="empty-state-title">No hay pedidos</div>
                    <div class="empty-state-desc">No se encontraron pedidos con el filtro seleccionado</div>
                </div>
            `;
            return;
        }

        const { data: rechazosList } = await db.from('rechazos_trabajadores').select('pedido_id');
        const rechazoCountMap = {};
        (rechazosList || []).forEach(r => {
            rechazoCountMap[r.pedido_id] = (rechazoCountMap[r.pedido_id] || 0) + 1;
        });

        let html = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Cliente</th>
                            <th>Total</th>
                            <th>Estado</th>
                            <th>Rechazos</th>
                            <th>Entrega</th>
                            <th>Fecha</th>
                            <th style="width:120px;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        for (const p of pedidosData) {
            const rechazoCount = rechazoCountMap[p.id] || 0;
            const entregaText = formatearEntrega(p.tipo_entrega) || 'N/A';

            html += `
                <tr>
                    <td><strong>${p.codigo}</strong></td>
                    <td>
                        <div style="font-weight:600;">${p.clientes?.nombre || 'N/A'}</div>
                        <div class="text-muted text-xs">${p.clientes?.telefono || ''}</div>
                    </td>
                    <td><strong class="text-success">${formatMoney(p.total)}</strong>
                        ${p.precio_asignado_manual ? `<br><span class="text-muted text-xs">Cotizado: ${formatMoney(p.precio_asignado_manual)}</span>` : ''}
                    </td>
                    <td>
                        <select class="form-control" style="width:130px; font-size:0.75rem; padding:0.35rem;" onchange="cambiarEstadoPedido(${p.id}, this.value)">
                            <option value="pendiente" ${p.estado === 'pendiente' ? 'selected' : ''}>⏳ Pendiente</option>
                            <option value="en_proceso" ${p.estado === 'en_proceso' ? 'selected' : ''}>🔧 En proceso</option>
                            <option value="terminado" ${p.estado === 'terminado' ? 'selected' : ''}>✅ Terminado</option>
                            <option value="entregado" ${p.estado === 'entregado' ? 'selected' : ''}>📦 Entregado</option>
                            <option value="rechazado" ${p.estado === 'rechazado' ? 'selected' : ''}>❌ Rechazado</option>
                            <option value="cotizado" ${p.estado === 'cotizado' ? 'selected' : ''}>💰 Cotizado</option>
                        </select>
                        ${p.rechazo_definitivo ? '<br><span class="text-danger text-xs">CANCELADO</span>' : ''}
                    </td>
                    <td style="text-align:center;">
                        ${rechazoCount > 0 ? `<span class="text-danger" style="cursor:pointer; text-decoration:underline; font-size:0.8rem;" onclick="verMotivosRechazo(${p.id}, '${p.codigo}')">👀 ${rechazoCount}</span>` : '<span class="text-muted">0</span>'}
                    </td>
                    <td class="text-xs">${entregaText}</td>
                    <td class="text-muted text-xs">${formatDateShort(p.created_at)}</td>
                    <td>
                        <div style="display:flex; flex-direction:column; gap:0.25rem;">
                            <button class="btn btn-info btn-sm" style="padding:0.3rem 0.5rem; font-size:0.7rem;" onclick="verDetallePedido(${p.id})">👁️ Ver</button>
                            ${p.estado === 'pendiente' && p.requiere_cotizacion ? `<button class="btn btn-warning btn-sm" style="padding:0.3rem 0.5rem; font-size:0.7rem;" onclick="asignarPrecioEspecial(${p.id}, '${p.codigo}')">💰 Asignar</button>` : ''}
                            ${p.estado === 'pendiente' && !p.rechazo_definitivo ? `<button class="btn btn-danger btn-sm" style="padding:0.3rem 0.5rem; font-size:0.7rem;" onclick="rechazarDefinitivo(${p.id}, '${p.codigo}')">🚫 Cancelar</button>` : ''}
                            ${p.estado === 'terminado' ? `<button class="btn btn-success btn-sm" style="padding:0.3rem 0.5rem; font-size:0.7rem;" onclick="generarPDFPedido(${p.id})">📄 PDF</button>` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }

        html += `</tbody></table></div>`;
        listaDiv.innerHTML = html;

    } catch (err) {
        console.error('Error cargando pedidos:', err);
        listaDiv.innerHTML = `<div class="alert alert-danger"><span class="alert-icon">❌</span><div>Error: ${err.message}</div></div>`;
    }
}

async function cambiarEstadoPedido(id, nuevoEstado) {
    try {
        const updates = { estado: nuevoEstado };
        if (nuevoEstado === 'terminado') {
            updates.fecha_terminado = new Date().toISOString();
        }

        const { error } = await db.from('pedidos').update(updates).eq('id', id);
        if (error) throw error;

        Toast.success('Estado actualizado correctamente');
        await refrescarListaPedidos();
    } catch (err) {
        Toast.error('Error: ' + err.message);
    }
}

async function asignarPrecioEspecial(id, codigo) {
    const precio = prompt(`💰 Asignar precio al pedido ${codigo}

Ingresa el precio final en Bolivianos:`);
    if (!precio || parseFloat(precio) <= 0) {
        Toast.warning('Ingresa un precio válido');
        return;
    }

    const precioNum = parseFloat(precio);
    if (!confirm(`¿Asignar Bs ${precioNum.toFixed(2)} al pedido ${codigo}?`)) return;

    try {
        const { error } = await db.from('pedidos').update({ 
            precio_asignado_manual: precioNum,
            estado: 'cotizado',
            total: precioNum
        }).eq('id', id);

        if (error) throw error;
        Toast.success(`Precio asignado: ${formatMoney(precioNum)}`);
        await refrescarListaPedidos();
    } catch (err) {
        Toast.error('Error: ' + err.message);
    }
}

async function aceptarCotizacion(id, codigo) {
    if (!confirm(`¿Aceptar el precio para ${codigo}?`)) return;
    try {
        const { error } = await db.from('pedidos').update({ estado: 'en_proceso' }).eq('id', id);
        if (error) throw error;
        Toast.success('Pedido aceptado. Iniciando fabricación.');
        mostrarVista('pedidos');
    } catch (err) {
        Toast.error('Error: ' + err.message);
    }
}

async function cancelarCotizacion(id, codigo) {
    if (!confirm(`¿Cancelar el pedido ${codigo}?`)) return;
    try {
        const { error } = await db.from('pedidos').update({ estado: 'cancelado_por_cliente' }).eq('id', id);
        if (error) throw error;
        Toast.info('Pedido cancelado');
        mostrarVista('pedidos');
    } catch (err) {
        Toast.error('Error: ' + err.message);
    }
}

async function rechazarDefinitivo(id, codigo) {
    const motivo = prompt(`🚫 Cancelar pedido ${codigo}

Motivo de la cancelación (visible para el cliente):`);
    if (!motivo || !motivo.trim()) {
        Toast.warning('Debes ingresar un motivo');
        return;
    }

    if (!confirm(`¿Cancelar DEFINITIVAMENTE ${codigo}?
Motivo: ${motivo}`)) return;

    try {
        await db.from('pedidos').update({ 
            estado: 'rechazado_definitivo',
            rechazo_definitivo: true,
            motivo_rechazo_definitivo: motivo.trim()
        }).eq('id', id);

        Toast.success(`Pedido ${codigo} cancelado`);
        await refrescarListaPedidos();
    } catch (err) {
        Toast.error('Error: ' + err.message);
    }
}

async function verMotivosRechazo(pedidoId, codigo) {
    try {
        const { data: rechazos } = await db
            .from('rechazos_trabajadores')
            .select('*, usuarios(nombre)')
            .eq('pedido_id', pedidoId);

        if (!rechazos || rechazos.length === 0) {
            Toast.info('No hay rechazos registrados');
            return;
        }

        let mensaje = `👀 RECHAZOS - ${codigo}
${'='.repeat(40)}
`;
        rechazos.forEach((r, i) => {
            mensaje += `${i+1}. 👷 ${r.usuarios?.nombre || 'Trabajador'}
   💬 ${r.motivo}
   📅 ${formatDate(r.fecha_rechazo)}
${'-'.repeat(40)}
`;
        });
        alert(mensaje);
    } catch (err) {
        Toast.error('Error: ' + err.message);
    }
}

async function verDetallePedido(id) {
    try {
        const { data: pedido } = await db.from('pedidos').select('*, clientes(*)').eq('id', id).single();
        const { data: detalles } = await db.from('detalle_pedido').select('*').eq('pedido_id', id);

        let detallesLista = (detalles || []).map(d => 
            `- ${d.cantidad} x ${d.descripcion} = ${formatMoney(d.subtotal)}`
        ).join('\n') || 'Sin productos';

        let infoExtra = '';
        if (pedido.tipo_entrega) infoExtra += `\n🚚 Entrega: ${formatearEntrega(pedido.tipo_entrega)}`;
        if (pedido.direccion_envio) infoExtra += `\n📍 Dirección: ${pedido.direccion_envio}`;
        if (pedido.estado === 'rechazado' && pedido.motivo_rechazo) {
            infoExtra += `\n\n❌ MOTIVO RECHAZO:\n${pedido.motivo_rechazo}`;
        }
        if (pedido.estado === 'cotizado' && pedido.precio_asignado_manual) {
            infoExtra += `\n\n💰 PRECIO COTIZADO: ${formatMoney(pedido.precio_asignado_manual)}`;
        }

        alert(`📋 PEDIDO ${pedido.codigo}
${'='.repeat(40)}
👤 ${pedido.clientes?.nombre}
📞 ${pedido.clientes?.telefono}
📊 ${formatearEstado(pedido.estado)}
💵 ${formatMoney(pedido.total)}${infoExtra}
${'='.repeat(40)}
📦 PRODUCTOS:
${detallesLista}`);
    } catch (err) {
        Toast.error('Error: ' + err.message);
    }
}

function generarPDFPedido(id) {
    Toast.info('Generando PDF... (funcionalidad en desarrollo)');
}

// Exponer funciones globales
window.consultarPedido = consultarPedido;
window.cargarPedidos = cargarPedidos;
window.aplicarFiltro = aplicarFiltro;
window.refrescarListaPedidos = refrescarListaPedidos;
window.cambiarEstadoPedido = cambiarEstadoPedido;
window.asignarPrecioEspecial = asignarPrecioEspecial;
window.aceptarCotizacion = aceptarCotizacion;
window.cancelarCotizacion = cancelarCotizacion;
window.rechazarDefinitivo = rechazarDefinitivo;
window.verMotivosRechazo = verMotivosRechazo;
window.verDetallePedido = verDetallePedido;
window.generarPDFPedido = generarPDFPedido;
