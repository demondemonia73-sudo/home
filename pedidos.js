// ============================================
// MÓDULO DE PEDIDOS (ADMIN)
// ============================================

let pedidosData = [];
let filtroEstado = 'todos';

async function cargarPedidos() {
    if (!verificarSesion()) return;
    
    const tabsContent = document.getElementById('tabsContent');
    tabsContent.innerHTML = `
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
                <h2 style="margin: 0;">📦 Gestión de Pedidos</h2>
                <button id="btnRefrescarPedidos" class="btn btn-primary">🔄 Refrescar</button>
            </div>
            
            <!-- Filtros -->
            <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
                <strong>📌 Filtrar por estado:</strong>
                <button id="filtroTodos" class="btn-filtro-pedido" data-estado="todos" style="padding: 0.3rem 0.8rem; border-radius: 20px; border: none; cursor: pointer; background: #1a73e8; color: white;">Todos</button>
                <button id="filtroPendiente" class="btn-filtro-pedido" data-estado="pendiente" style="padding: 0.3rem 0.8rem; border-radius: 20px; border: 1px solid #ddd; cursor: pointer;">⏳ Pendientes</button>
                <button id="filtroProceso" class="btn-filtro-pedido" data-estado="en_proceso" style="padding: 0.3rem 0.8rem; border-radius: 20px; border: 1px solid #ddd; cursor: pointer;">⚙️ En proceso</button>
                <button id="filtroTerminado" class="btn-filtro-pedido" data-estado="terminado" style="padding: 0.3rem 0.8rem; border-radius: 20px; border: 1px solid #ddd; cursor: pointer;">✅ Terminados</button>
                <button id="filtroEntregado" class="btn-filtro-pedido" data-estado="entregado" style="padding: 0.3rem 0.8rem; border-radius: 20px; border: 1px solid #ddd; cursor: pointer;">📦 Entregados</button>
            </div>
            
            <!-- Lista de pedidos -->
            <div id="listaPedidos">
                <div class="loading">Cargando pedidos...</div>
            </div>
        </div>
    `;
    
    // Asignar eventos de filtros
    document.getElementById('filtroTodos').onclick = () => aplicarFiltro('todos');
    document.getElementById('filtroPendiente').onclick = () => aplicarFiltro('pendiente');
    document.getElementById('filtroProceso').onclick = () => aplicarFiltro('en_proceso');
    document.getElementById('filtroTerminado').onclick = () => aplicarFiltro('terminado');
    document.getElementById('filtroEntregado').onclick = () => aplicarFiltro('entregado');
    document.getElementById('btnRefrescarPedidos').onclick = () => refrescarListaPedidos();
    
    await refrescarListaPedidos();
}

function aplicarFiltro(estado) {
    filtroEstado = estado;
    
    // Actualizar estilos
    document.querySelectorAll('.btn-filtro-pedido').forEach(btn => {
        btn.style.background = '#f0f0f0';
        btn.style.color = '#333';
        btn.style.border = '1px solid #ddd';
    });
    
    const btnActivo = document.getElementById(`filtro${estado === 'todos' ? 'Todos' : estado === 'en_proceso' ? 'Proceso' : estado.charAt(0).toUpperCase() + estado.slice(1)}`);
    if (btnActivo) {
        btnActivo.style.background = '#1a73e8';
        btnActivo.style.color = 'white';
        btnActivo.style.border = 'none';
    }
    
    refrescarListaPedidos();
}

async function refrescarListaPedidos() {
    const listaDiv = document.getElementById('listaPedidos');
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
                <table>
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Cliente</th>
                            <th>Teléfono</th>
                            <th>Total</th>
                            <th>Estado</th>
                            <th>Adelanto</th>
                            <th>Fecha</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        for (const p of pedidosData) {
            // Obtener detalles del pedido
            const { data: detalles } = await db
                .from('detalle_pedido')
                .select('*')
                .eq('pedido_id', p.id);
            
            const estadoOptions = {
                'pendiente': '⏳ Pendiente',
                'en_proceso': '⚙️ En proceso',
                'terminado': '✅ Terminado',
                'entregado': '📦 Entregado'
            };
            
            html += `
                <tr>
                    <td><strong>${p.codigo}</strong></td>
                    <td>${p.clientes?.nombre || 'N/A'}<br><small>${p.clientes?.direccion || ''}</small></td>
                    <td>${p.clientes?.telefono || 'N/A'}</td>
                    <td><strong style="color: #28a745;">$${p.total.toFixed(2)}</strong></td>
                    <td>
                        <select id="estado-${p.id}" class="form-control" style="width: 130px;" onchange="cambiarEstadoPedido(${p.id}, this.value)">
                            <option value="pendiente" ${p.estado === 'pendiente' ? 'selected' : ''}>⏳ Pendiente</option>
                            <option value="en_proceso" ${p.estado === 'en_proceso' ? 'selected' : ''}>⚙️ En proceso</option>
                            <option value="terminado" ${p.estado === 'terminado' ? 'selected' : ''}>✅ Terminado</option>
                            <option value="entregado" ${p.estado === 'entregado' ? 'selected' : ''}>📦 Entregado</option>
                        </select>
                    </td>
                    <td>
                        ${p.adelanto_monto > 0 ? `<span style="color: #17a2b8;">$${p.adelanto_monto}</span><br>
                        <small>${p.adelanto_confirmado ? '✅ Confirmado' : '⏳ Pendiente'}</small>` : 'Sin adelanto'}
                    </td>
                    <td><small>${new Date(p.created_at).toLocaleDateString()}</small></td>
                    <td>
                        <button class="btn" style="background: #17a2b8; padding: 0.3rem 0.6rem;" onclick="verDetallePedido(${p.id})">👁️ Ver</button>
                        ${p.estado === 'terminado' ? `<button class="btn btn-success" style="padding: 0.3rem 0.6rem;" onclick="generarPDFPedido(${p.id})">📄 Recibo</button>` : ''}
                    </td>
                </tr>
                <tr style="background: #f9f9f9;">
                    <td colspan="8">
                        <details>
                            <summary style="cursor: pointer; color: #1a73e8;">📋 Ver productos (${detalles?.length || 0})</summary>
                            <div style="margin-top: 0.5rem; padding-left: 1rem;">
                                ${detalles?.map(d => `
                                    <div style="display: flex; justify-content: space-between; padding: 0.3rem 0; border-bottom: 1px solid #eee;">
                                        <span>${d.cantidad} x ${d.descripcion}</span>
                                        <span style="color: #28a745;">$${d.subtotal.toFixed(2)}</span>
                                    </div>
                                `).join('') || '<span>Sin productos</span>'}
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
        const { error } = await db
            .from('pedidos')
            .update({ estado: nuevoEstado })
            .eq('id', id);
        
        if (error) throw error;
        
        // Si el estado es terminado, registrar fecha
        if (nuevoEstado === 'terminado') {
            await db.from('pedidos').update({ fecha_terminado: new Date() }).eq('id', id);
        }
        
        alert('✅ Estado actualizado');
        await refrescarListaPedidos();
        
    } catch (err) {
        alert('❌ Error: ' + err.message);
    }
}

async function verDetallePedido(id) {
    const { data: pedido, error } = await db
        .from('pedidos')
        .select('*, clientes(*)')
        .eq('id', id)
        .single();
    
    if (error) {
        alert('Error al cargar detalle');
        return;
    }
    
    const { data: detalles } = await db
        .from('detalle_pedido')
        .select('*')
        .eq('pedido_id', id);
    
    let detallesHtml = detalles?.map(d => `
        <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #eee;">
            <span>${d.cantidad} x ${d.descripcion}</span>
            <span style="color: #28a745;">$${d.subtotal.toFixed(2)}</span>
        </div>
    `).join('') || '<p>Sin productos</p>';
    
    alert(`
📄 PEDIDO ${pedido.codigo}
━━━━━━━━━━━━━━━━━━━━━━
Cliente: ${pedido.clientes?.nombre}
Teléfono: ${pedido.clientes?.telefono}
Estado: ${pedido.estado}
Total: $${pedido.total}
━━━━━━━━━━━━━━━━━━━━━━
Productos:
${detalles?.map(d => `- ${d.cantidad} x ${d.descripcion} = $${d.subtotal}`).join('\n')}
    `);
}

function generarPDFPedido(id) {
    alert(`📄 Generando PDF del pedido #${id}...\n(Funcionalidad en desarrollo)`);
}
