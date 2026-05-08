// ============================================
// MÓDULO DE PEDIDOS (ADMIN + CONSULTA CLIENTE)
// ============================================

let pedidosData = [];
let filtroEstado = 'todos';

// ============================================
// CONSULTA DE PEDIDO (CLIENTE - desde index.html)
// ============================================

async function consultarPedido() {
    const codigo = document.getElementById('consultaCodigo').value.trim();
    const telefono = document.getElementById('consultaTelefono').value.trim();
    const resultadoDiv = document.getElementById('resultadoConsulta');
    
    if (!codigo || !telefono) {
        resultadoDiv.innerHTML = '<div class="alert alert-danger">Ingresa código y teléfono</div>';
        return;
    }
    
    try {
        const { data: pedido, error } = await db
            .from('pedidos')
            .select('*, clientes(*)')
            .eq('codigo', codigo)
            .maybeSingle();
        
        if (error || !pedido) {
            resultadoDiv.innerHTML = '<div class="alert alert-danger">Pedido no encontrado</div>';
            return;
        }
        
        if (pedido.clientes?.telefono !== telefono) {
            resultadoDiv.innerHTML = '<div class="alert alert-danger">Teléfono incorrecto</div>';
            return;
        }
        
        // PEDIDO ENTREGADO - NO SE MUESTRA DETALLE
        if (pedido.estado === 'entregado') {
            resultadoDiv.innerHTML = `
                <div class="card" style="margin-top: 1rem; border-left: 4px solid #6c757d;">
                    <h3>📄 Pedido ${pedido.codigo}</h3>
                    <p><strong>👤 Cliente:</strong> ${pedido.clientes?.nombre || 'N/A'}</p>
                    <p><strong>📅 Fecha:</strong> ${new Date(pedido.created_at).toLocaleString()}</p>
                    <p><strong>📌 Estado:</strong> <span class="badge" style="background: #6c757d; color: white;">📦 Entregado</span></p>
                    <p><strong>⚠️ Este pedido ya fue entregado y no requiere acciones.</strong></p>
                    <p><strong>💰 Total:</strong> <strong style="color: #28a745;">Bs ${pedido.total.toFixed(2)}</strong></p>
                    <button class="btn btn-primary" onclick="window.location.href='tienda.html'">🛒 Hacer nuevo pedido</button>
                </div>
            `;
            return;
        }
        
        const { data: detalles } = await db
            .from('detalle_pedido')
            .select('*')
            .eq('pedido_id', pedido.id);
        
        let detallesHtml = '<h4>📋 Detalle del pedido:</h4><ul>';
        if (detalles && detalles.length > 0) {
            detalles.forEach(d => {
                detallesHtml += `<li>${d.cantidad} x ${d.descripcion} - Bs ${d.subtotal.toFixed(2)}</li>`;
            });
        } else {
            detallesHtml += '<li>Sin productos registrados</li>';
        }
        detallesHtml += '</ul>';
        
        // Mostrar mensaje especial si el pedido fue rechazado
        if (pedido.estado === 'rechazado') {
            resultadoDiv.innerHTML = `
                <div class="card" style="margin-top: 1rem; border-left: 4px solid #dc3545;">
                    <h3>📄 Pedido ${pedido.codigo}</h3>
                    <p><strong>👤 Cliente:</strong> ${pedido.clientes?.nombre || 'N/A'}</p>
                    <p><strong>📅 Fecha:</strong> ${new Date(pedido.created_at).toLocaleString()}</p>
                    <p><strong>📌 Estado:</strong> <span class="badge" style="background: #dc3545; color: white;">❌ Rechazado</span></p>
                    <p><strong>⚠️ Motivo del rechazo:</strong> ${pedido.motivo_rechazo || 'No especificado'}</p>
                    <p><strong>📅 Fecha de rechazo:</strong> ${pedido.fecha_rechazo ? new Date(pedido.fecha_rechazo).toLocaleString() : 'N/A'}</p>
                    ${detallesHtml}
                    <p><strong>💰 Total:</strong> <strong style="color: #28a745;">Bs ${pedido.total.toFixed(2)}</strong></p>
                    <button class="btn btn-primary" onclick="window.location.href='tienda.html'">🛒 Hacer nuevo pedido</button>
                </div>
            `;
            return;
        }
        
        // Mostrar cotización si el pedido está en estado 'cotizado'
        if (pedido.estado === 'cotizado' && pedido.precio_asignado_manual) {
            resultadoDiv.innerHTML = `
                <div class="card" style="margin-top: 1rem; border-left: 4px solid #ffc107;">
                    <h3>📄 Pedido ${pedido.codigo}</h3>
                    <p><strong>👤 Cliente:</strong> ${pedido.clientes?.nombre || 'N/A'}</p>
                    <p><strong>📅 Fecha:</strong> ${new Date(pedido.created_at).toLocaleString()}</p>
                    <p><strong>📌 Estado:</strong> <span class="badge" style="background: #ffc107; color: #333;">💰 Cotizado</span></p>
                    ${detallesHtml}
                    <p><strong>💰 Precio cotizado:</strong> <strong style="color: #28a745;">Bs ${pedido.precio_asignado_manual.toFixed(2)}</strong></p>
                    <div style="display: flex; gap: 1rem; margin-top: 1rem; flex-wrap: wrap;">
                        <button class="btn btn-success" onclick="aceptarCotizacion(${pedido.id}, '${pedido.codigo}')">✅ Aceptar pedido</button>
                        <button class="btn btn-danger" onclick="cancelarCotizacion(${pedido.id}, '${pedido.codigo}')">❌ Cancelar pedido</button>
                    </div>
                </div>
            `;
            return;
        }
        
        const estadoText = {
            'pendiente': '⏳ Pendiente - Esperando asignación',
            'en_proceso': '⚙️ En proceso - Estamos trabajando en tu pedido',
            'terminado': '✅ Terminado - Listo para retirar'
        };
        
        let entregaHtml = '';
        if (pedido.tipo_entrega) {
            const entregaText = {
                'retiro_taller': '📦 Retiro en taller',
                'envio_domicilio': '🚚 Envío a domicilio',
                'entrega_tienda': '🏪 Entrega en tienda'
            };
            entregaHtml = `<p><strong>🚚 Entrega:</strong> ${entregaText[pedido.tipo_entrega] || pedido.tipo_entrega}</p>`;
            if (pedido.direccion_envio) {
                entregaHtml += `<p><strong>📍 Dirección de envío:</strong> ${pedido.direccion_envio}</p>`;
            }
        }
        
        resultadoDiv.innerHTML = `
            <div class="card" style="margin-top: 1rem; border-left: 4px solid #1a73e8;">
                <h3>📄 Pedido ${pedido.codigo}</h3>
                <p><strong>👤 Cliente:</strong> ${pedido.clientes?.nombre || 'N/A'}</p>
                <p><strong>📅 Fecha:</strong> ${new Date(pedido.created_at).toLocaleString()}</p>
                <p><strong>📌 Estado:</strong> <span class="badge badge-${pedido.estado}">${estadoText[pedido.estado] || pedido.estado}</span></p>
                ${entregaHtml}
                ${detallesHtml}
                <p><strong>💰 Total:</strong> <strong style="color: #28a745;">Bs ${pedido.total.toFixed(2)}</strong></p>
                ${pedido.estado === 'terminado' ? '<button class="btn btn-success" onclick="alert(\'📞 Contáctanos para coordinar la entrega o retiro\')">📞 Solicitar retiro/entrega</button>' : ''}
            </div>
        `;
        
    } catch (err) {
        resultadoDiv.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
    }
}

function mostrarNuevoPedidoForm() {
    window.location.href = 'tienda.html';
}

// ============================================
// GESTIÓN DE PEDIDOS (ADMIN)
// ============================================

async function cargarPedidos() {
    if (!verificarSesion()) return;
    
    const tabsContent = document.getElementById('tabsContent');
    tabsContent.innerHTML = `
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
                <h2 style="margin: 0;">📦 Gestión de Pedidos</h2>
                <button id="btnRefrescarPedidos" class="btn btn-primary">🔄 Refrescar</button>
            </div>
            
            <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
                <strong>📌 Filtrar por estado:</strong>
                <button id="filtroTodos" class="btn-filtro-pedido" data-estado="todos" style="padding: 0.3rem 0.8rem; border-radius: 20px; border: none; cursor: pointer; background: #1a73e8; color: white;">Todos</button>
                <button id="filtroPendiente" class="btn-filtro-pedido" data-estado="pendiente" style="padding: 0.3rem 0.8rem; border-radius: 20px; border: 1px solid #ddd; cursor: pointer;">⏳ Pendientes</button>
                <button id="filtroProceso" class="btn-filtro-pedido" data-estado="en_proceso" style="padding: 0.3rem 0.8rem; border-radius: 20px; border: 1px solid #ddd; cursor: pointer;">⚙️ En proceso</button>
                <button id="filtroTerminado" class="btn-filtro-pedido" data-estado="terminado" style="padding: 0.3rem 0.8rem; border-radius: 20px; border: 1px solid #ddd; cursor: pointer;">✅ Terminados</button>
                <button id="filtroEntregado" class="btn-filtro-pedido" data-estado="entregado" style="padding: 0.3rem 0.8rem; border-radius: 20px; border: 1px solid #ddd; cursor: pointer;">📦 Entregados</button>
                <button id="filtroRechazado" class="btn-filtro-pedido" data-estado="rechazado" style="padding: 0.3rem 0.8rem; border-radius: 20px; border: 1px solid #ddd; cursor: pointer;">❌ Rechazados</button>
                <button id="filtroCotizado" class="btn-filtro-pedido" data-estado="cotizado" style="padding: 0.3rem 0.8rem; border-radius: 20px; border: 1px solid #ddd; cursor: pointer;">💰 Cotizados</button>
            </div>
            
            <div id="listaPedidos">
                <div class="loading">Cargando pedidos...</div>
            </div>
        </div>
    `;
    
    document.getElementById('filtroTodos').onclick = () => aplicarFiltro('todos');
    document.getElementById('filtroPendiente').onclick = () => aplicarFiltro('pendiente');
    document.getElementById('filtroProceso').onclick = () => aplicarFiltro('en_proceso');
    document.getElementById('filtroTerminado').onclick = () => aplicarFiltro('terminado');
    document.getElementById('filtroEntregado').onclick = () => aplicarFiltro('entregado');
    document.getElementById('filtroRechazado').onclick = () => aplicarFiltro('rechazado');
    document.getElementById('filtroCotizado').onclick = () => aplicarFiltro('cotizado');
    document.getElementById('btnRefrescarPedidos').onclick = () => refrescarListaPedidos();
    
    await refrescarListaPedidos();
}

function aplicarFiltro(estado) {
    filtroEstado = estado;
    
    document.querySelectorAll('.btn-filtro-pedido').forEach(btn => {
        btn.style.background = '#f0f0f0';
        btn.style.color = '#333';
        btn.style.border = '1px solid #ddd';
    });
    
    const btnMap = {
        'todos': 'filtroTodos',
        'pendiente': 'filtroPendiente',
        'en_proceso': 'filtroProceso',
        'terminado': 'filtroTerminado',
        'entregado': 'filtroEntregado',
        'rechazado': 'filtroRechazado',
        'cotizado': 'filtroCotizado'
    };
    
    const btnActivo = document.getElementById(btnMap[estado]);
    if (btnActivo) {
        btnActivo.style.background = '#1a73e8';
        btnActivo.style.color = 'white';
        btnActivo.style.border = 'none';
    }
    
    refrescarListaPedidos();
}

async function refrescarListaPedidos() {
    const listaDiv = document.getElementById('listaPedidos');
    if (!listaDiv) return;
    listaDiv.innerHTML = '<div class="loading">Cargando...</div>';
    
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
            listaDiv.innerHTML = '<div class="alert alert-info" style="text-align: center;">No hay pedidos registrados</div>';
            return;
        }
        
        let html = `
            <div class="table-container">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #1a73e8; color: white;">
                            <th style="padding: 10px; text-align: left;">Código</th>
                            <th style="padding: 10px; text-align: left;">Cliente</th>
                            <th style="padding: 10px; text-align: left;">Teléfono</th>
                            <th style="padding: 10px; text-align: left;">Total</th>
                            <th style="padding: 10px; text-align: left;">Estado</th>
                            <th style="padding: 10px; text-align: left;">Entrega</th>
                            <th style="padding: 10px; text-align: left;">Adelanto</th>
                            <th style="padding: 10px; text-align: left;">Fecha</th>
                            <th style="padding: 10px; text-align: left;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        for (const p of pedidosData) {
            const { data: detalles } = await db.from('detalle_pedido').select('*').eq('pedido_id', p.id);
            
            const entregaText = {
                'retiro_taller': '📦 Taller',
                'envio_domicilio': '🚚 Domicilio',
                'entrega_tienda': '🏪 Tienda'
            };
            const entregaShow = p.tipo_entrega ? entregaText[p.tipo_entrega] || p.tipo_entrega : 'N/A';
            
            html += `
                <tr style="border-bottom: 1px solid #ddd;">
                    <td style="padding: 8px;"><strong>${p.codigo}</strong></td>
                    <td style="padding: 8px;">${p.clientes?.nombre || 'N/A'}<br><small>${p.clientes?.direccion || ''}</small></td>
                    <td style="padding: 8px;">${p.clientes?.telefono || 'N/A'}</td>
                    <td style="padding: 8px;"><strong style="color: #28a745;">Bs ${p.total?.toFixed(2) || '0.00'}</strong>${p.precio_asignado_manual ? `<br><small>Cotizado: Bs ${p.precio_asignado_manual}</small>` : ''}</td>
                    <td style="padding: 8px;">
                        <select id="estado-${p.id}" class="form-control" style="width: 120px; padding: 4px;" onchange="cambiarEstadoPedido(${p.id}, this.value)">
                            <option value="pendiente" ${p.estado === 'pendiente' ? 'selected' : ''}>⏳ Pendiente</option>
                            <option value="en_proceso" ${p.estado === 'en_proceso' ? 'selected' : ''}>⚙️ En proceso</option>
                            <option value="terminado" ${p.estado === 'terminado' ? 'selected' : ''}>✅ Terminado</option>
                            <option value="entregado" ${p.estado === 'entregado' ? 'selected' : ''}>📦 Entregado</option>
                            <option value="rechazado" ${p.estado === 'rechazado' ? 'selected' : ''}>❌ Rechazado</option>
                            <option value="cotizado" ${p.estado === 'cotizado' ? 'selected' : ''}>💰 Cotizado</option>
                        </select>
                    </td>
                    <td style="padding: 8px;">${entregaShow}</td>
                    <td style="padding: 8px;">${p.adelanto_monto > 0 ? `Bs ${p.adelanto_monto}<br><small>${p.adelanto_confirmado ? '✅ Confirmado' : '⏳ Pendiente'}</small>` : 'Sin adelanto'}</td>
                    <td style="padding: 8px;"><small>${new Date(p.created_at).toLocaleDateString()}</small></td>
                    <td style="padding: 8px;">
                        <button class="btn" style="background: #17a2b8; padding: 4px 8px; font-size: 11px;" onclick="verDetallePedido(${p.id})">👁️ Ver</button>
                        ${p.estado === 'pendiente' && p.requiere_cotizacion ? `<button class="btn" style="background: #ffc107; color: #333; padding: 4px 8px; font-size: 11px; margin-top: 4px;" onclick="asignarPrecioEspecial(${p.id}, '${p.codigo}')">💰 Asignar</button>` : ''}
                        ${p.estado === 'pendiente' && !p.requiere_cotizacion ? `<button class="btn" style="background: #dc3545; padding: 4px 8px; font-size: 11px; margin-top: 4px;" onclick="rechazarPedido(${p.id}, '${p.codigo}')">❌ Rechazar</button>` : ''}
                        ${p.estado === 'terminado' ? `<button class="btn btn-success" style="padding: 4px 8px; font-size: 11px; margin-top: 4px;" onclick="generarPDFPedido(${p.id})">📄 Recibo</button>` : ''}
                    </td>
                </tr>
                <tr style="background: #f9f9f9;">
                    <td colspan="9" style="padding: 8px;">
                        <details>
                            <summary style="cursor: pointer; color: #1a73e8;">📋 Ver productos (${detalles?.length || 0})</summary>
                            <div style="margin-top: 8px; padding-left: 16px;">
                                ${detalles?.map(d => `<div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #eee;"><span>${d.cantidad} x ${d.descripcion}</span><span style="color: #28a745;">Bs ${d.subtotal?.toFixed(2) || '0.00'}</span></div>`).join('') || '<span>Sin productos</span>'}
                            </div>
                        </details>
                    </td>
                </tr>
            `;
        }
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        listaDiv.innerHTML = html;
        
    } catch (err) {
        console.error('Error cargando pedidos:', err);
        listaDiv.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
    }
}

async function cambiarEstadoPedido(id, nuevoEstado) {
    try {
        const { error } = await db.from('pedidos').update({ estado: nuevoEstado }).eq('id', id);
        if (error) throw error;
        if (nuevoEstado === 'terminado') {
            await db.from('pedidos').update({ fecha_terminado: new Date() }).eq('id', id);
        }
        alert('✅ Estado actualizado');
        await refrescarListaPedidos();
    } catch (err) {
        alert('❌ Error: ' + err.message);
    }
}

// ============================================
// FUNCIONES PARA PEDIDOS ESPECIALES
// ============================================

async function asignarPrecioEspecial(id, codigo) {
    const precioActual = prompt(`✏️ Asignar precio al pedido especial ${codigo}\n\nIngresa el precio final en Bolivianos (Bs):`);
    
    if (!precioActual || parseFloat(precioActual) <= 0) {
        alert('⚠️ Ingresa un precio válido mayor a 0');
        return;
    }
    
    const precioNum = parseFloat(precioActual);
    
    if (!confirm(`¿Asignar precio de Bs ${precioNum.toFixed(2)} al pedido ${codigo}?\n\nEl cliente podrá aceptar o cancelar.`)) {
        return;
    }
    
    try {
        const { error } = await db
            .from('pedidos')
            .update({ 
                precio_asignado_manual: precioNum,
                estado: 'cotizado',
                total: precioNum
            })
            .eq('id', id);
        
        if (error) throw error;
        
        alert(`✅ Precio asignado: Bs ${precioNum.toFixed(2)}\nEl cliente verá el precio y podrá aceptar o cancelar.`);
        await refrescarListaPedidos();
        
    } catch (err) {
        alert('❌ Error: ' + err.message);
    }
}

async function aceptarCotizacion(id, codigo) {
    if (!confirm(`¿Aceptas el precio para el pedido ${codigo}?\n\nEl pedido entrará en proceso de fabricación.`)) return;
    
    try {
        const { error } = await db
            .from('pedidos')
            .update({ estado: 'en_proceso' })
            .eq('id', id);
        
        if (error) throw error;
        
        alert('✅ Pedido aceptado. Procederemos con la fabricación.');
        location.reload();
        
    } catch (err) {
        alert('❌ Error: ' + err.message);
    }
}

async function cancelarCotizacion(id, codigo) {
    if (!confirm(`¿Cancelar el pedido ${codigo}?\n\nEl producto no se fabricará.`)) return;
    
    try {
        const { error } = await db
            .from('pedidos')
            .update({ estado: 'cancelado_por_cliente' })
            .eq('id', id);
        
        if (error) throw error;
        
        alert('❌ Pedido cancelado');
        location.reload();
        
    } catch (err) {
        alert('❌ Error: ' + err.message);
    }
}

async function rechazarPedido(id, codigo) {
    const motivo = prompt(`❌ ¿Por qué rechazas el pedido ${codigo}?\n\nEscribe el motivo para que el cliente lo vea:`);
    
    if (!motivo || motivo.trim() === '') {
        alert('⚠️ Debes ingresar un motivo para rechazar el pedido');
        return;
    }
    
    if (!confirm(`⚠️ ¿Rechazar el pedido ${codigo}?\n\nMotivo: ${motivo}\n\nEsta acción no se puede deshacer.`)) {
        return;
    }
    
    try {
        const { error } = await db
            .from('pedidos')
            .update({ 
                estado: 'rechazado', 
                motivo_rechazo: motivo.trim(),
                fecha_rechazo: new Date(),
                rechazado_por: AppState?.currentUser?.id || null
            })
            .eq('id', id);
        
        if (error) throw error;
        
        alert(`✅ Pedido ${codigo} rechazado\nMotivo: ${motivo}`);
        await refrescarListaPedidos();
        
    } catch (err) {
        alert('❌ Error al rechazar: ' + err.message);
    }
}

async function verDetallePedido(id) {
    const { data: pedido } = await db.from('pedidos').select('*, clientes(*)').eq('id', id).single();
    const { data: detalles } = await db.from('detalle_pedido').select('*').eq('pedido_id', id);
    let detallesLista = detalles?.map(d => `- ${d.cantidad} x ${d.descripcion} = Bs ${d.subtotal?.toFixed(2) || '0.00'}`).join('\n') || 'Sin productos';
    
    let entregaInfo = '';
    if (pedido.tipo_entrega) {
        const entregaText = {
            'retiro_taller': 'Retiro en taller',
            'envio_domicilio': 'Envío a domicilio',
            'entrega_tienda': 'Entrega en tienda'
        };
        entregaInfo = `\nEntrega: ${entregaText[pedido.tipo_entrega] || pedido.tipo_entrega}`;
        if (pedido.direccion_envio) entregaInfo += `\nDirección: ${pedido.direccion_envio}`;
    }
    
    let rechazoInfo = '';
    if (pedido.estado === 'rechazado' && pedido.motivo_rechazo) {
        rechazoInfo = `\n━━━━━━━━━━━━━━━━━━━━━━\n❌ MOTIVO DEL RECHAZO:\n${pedido.motivo_rechazo}\nFecha: ${new Date(pedido.fecha_rechazo).toLocaleString()}`;
    }
    
    let cotizacionInfo = '';
    if (pedido.estado === 'cotizado' && pedido.precio_asignado_manual) {
        cotizacionInfo = `\n━━━━━━━━━━━━━━━━━━━━━━\n💰 PRECIO COTIZADO: Bs ${pedido.precio_asignado_manual.toFixed(2)}`;
    }
    
    alert(`📄 PEDIDO ${pedido.codigo}\n━━━━━━━━━━━━━━━━━━━━━━\nCliente: ${pedido.clientes?.nombre}\nTeléfono: ${pedido.clientes?.telefono}\nEstado: ${pedido.estado}${entregaInfo}\nTotal: Bs ${pedido.total}${cotizacionInfo}\n━━━━━━━━━━━━━━━━━━━━━━\nProductos:\n${detallesLista}${rechazoInfo}`);
}

function generarPDFPedido(id) {
    alert(`📄 Generando PDF del pedido #${id}...\n(Funcionalidad en desarrollo)`);
}

// Exponer funciones globalmente
window.consultarPedido = consultarPedido;
window.mostrarNuevoPedidoForm = mostrarNuevoPedidoForm;
window.rechazarPedido = rechazarPedido;
window.asignarPrecioEspecial = asignarPrecioEspecial;
window.aceptarCotizacion = aceptarCotizacion;
window.cancelarCotizacion = cancelarCotizacion;
