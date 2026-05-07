// ============================================
// MÓDULO DE CLIENTES (ADMIN)
// ============================================

let clientesData = [];
let filtroCliente = 'todos';

async function cargarClientes() {
    if (!verificarSesion()) return;
    
    const tabsContent = document.getElementById('tabsContent');
    tabsContent.innerHTML = `
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
                <h2 style="margin: 0;">👥 Gestión de Clientes</h2>
                <button id="btnRefrescarClientes" class="btn btn-primary">🔄 Refrescar</button>
            </div>
            
            <!-- Buscador -->
            <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                    <div style="flex: 2;">
                        <label>🔍 Buscar cliente</label>
                        <input type="text" id="buscadorCliente" class="form-control" placeholder="Nombre, teléfono o email...">
                    </div>
                    <div style="flex: 1;">
                        <label>📌 Filtrar por tipo</label>
                        <select id="filtroTipoCliente" class="form-control">
                            <option value="todos">Todos</option>
                            <option value="frecuente">Clientes frecuentes</option>
                            <option value="ocasional">Clientes ocasionales</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <!-- Lista de clientes -->
            <div id="listaClientes">
                <div class="loading">Cargando clientes...</div>
            </div>
        </div>
    `;
    
    // Asignar eventos
    document.getElementById('btnRefrescarClientes').onclick = () => refrescarListaClientes();
    document.getElementById('buscadorCliente').onkeyup = () => refrescarListaClientes();
    document.getElementById('filtroTipoCliente').onchange = () => refrescarListaClientes();
    
    await refrescarListaClientes();
}

async function refrescarListaClientes() {
    const listaDiv = document.getElementById('listaClientes');
    listaDiv.innerHTML = '<div class="loading">Cargando...</div>';
    
    const busqueda = document.getElementById('buscadorCliente')?.value.toLowerCase() || '';
    const filtroTipo = document.getElementById('filtroTipoCliente')?.value || 'todos';
    
    try {
        // Obtener clientes
        let query = db.from('clientes').select('*').order('created_at', { ascending: false });
        
        let { data: clientes, error } = await query;
        
        if (error) throw error;
        
        clientesData = clientes || [];
        
        // Filtrar por búsqueda
        if (busqueda) {
            clientesData = clientesData.filter(c => 
                c.nombre?.toLowerCase().includes(busqueda) ||
                c.telefono?.includes(busqueda) ||
                c.email?.toLowerCase().includes(busqueda)
            );
        }
        
        // Filtrar por tipo
        if (filtroTipo === 'frecuente') {
            clientesData = clientesData.filter(c => c.es_frecuente === true);
        } else if (filtroTipo === 'ocasional') {
            clientesData = clientesData.filter(c => c.es_frecuente !== true);
        }
        
        if (clientesData.length === 0) {
            listaDiv.innerHTML = '<div class="alert alert-info" style="text-align: center;">No hay clientes registrados</div>';
            return;
        }
        
        // Obtener estadísticas de pedidos por cliente
        const { data: pedidos } = await db.from('pedidos').select('cliente_id, total');
        
        let html = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Cliente</th>
                            <th>Teléfono</th>
                            <th>Email</th>
                            <th>Dirección</th>
                            <th>Pedidos</th>
                            <th>Total gastado</th>
                            <th>Tipo</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        for (const c of clientesData) {
            // Contar pedidos del cliente
            const pedidosCliente = pedidos?.filter(p => p.cliente_id === c.id) || [];
            const totalGastado = pedidosCliente.reduce((sum, p) => sum + (p.total || 0), 0);
            
            html += `
                <tr>
                    <td>${c.id}</td>
                    <td><strong>${c.nombre || 'N/A'}</strong></td>
                    <td>${c.telefono || 'N/A'}</td>
                    <td>${c.email || 'N/A'}</td>
                    <td><small>${c.direccion || 'N/A'}</small></td>
                    <td style="text-align: center;">${pedidosCliente.length}</td>
                    <td><strong style="color: #28a745;">Bs ${totalGastado.toFixed(2)}</strong></td>
                    <td>
                        <span class="badge ${c.es_frecuente ? 'badge-frecuente' : 'badge-ocasional'}" 
                              style="background: ${c.es_frecuente ? '#17a2b8' : '#6c757d'}; color: white; padding: 3px 8px; border-radius: 12px;">
                            ${c.es_frecuente ? '⭐ Frecuente' : '📝 Ocasional'}
                        </span>
                    </td>
                    <td>
                        <div style="display: flex; gap: 5px;">
                            <button class="btn" style="background: #17a2b8; padding: 0.3rem 0.6rem;" onclick="verHistorialCliente(${c.id})">📜 Historial</button>
                            <button class="btn" style="background: #ffc107; color: #333; padding: 0.3rem 0.6rem;" onclick="editarCliente(${c.id})">✏️</button>
                            <button class="btn" style="background: #28a745; padding: 0.3rem 0.6rem;" onclick="toggleFrecuente(${c.id}, ${!c.es_frecuente})">⭐</button>
                        </div>
                    </td>
                </tr>
            `;
        }
        
        html += `
                    </tbody>
                </table>
            </div>
            <div style="margin-top: 1rem; padding: 0.75rem; background: #e7f3ff; border-radius: 8px; text-align: center;">
                <small>📊 Total de clientes: ${clientesData.length} | Total gastado: Bs ${clientesData.reduce((sum, c) => {
                    const pedidosCliente = pedidos?.filter(p => p.cliente_id === c.id) || [];
                    return sum + pedidosCliente.reduce((s, p) => s + (p.total || 0), 0);
                }, 0).toFixed(2)}
                </small>
            </div>
        `;
        
        listaDiv.innerHTML = html;
        
    } catch (err) {
        console.error('Error cargando clientes:', err);
        listaDiv.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
    }
}

async function verHistorialCliente(clienteId) {
    try {
        const { data: cliente } = await db
            .from('clientes')
            .select('*')
            .eq('id', clienteId)
            .single();
        
        const { data: pedidos } = await db
            .from('pedidos')
            .select('*, detalle_pedido(*)')
            .eq('cliente_id', clienteId)
            .order('created_at', { ascending: false });
        
        let pedidosHtml = '';
        if (pedidos && pedidos.length > 0) {
            pedidosHtml = pedidos.map(p => `
                <div style="border: 1px solid #ddd; border-radius: 8px; padding: 10px; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between;">
                        <strong>📄 ${p.codigo}</strong>
                        <span class="badge badge-${p.estado}">${p.estado}</span>
                    </div>
                    <div style="font-size: 0.85rem; color: #666;">
                        Fecha: ${new Date(p.created_at).toLocaleString()}<br>
                        Total: <strong style="color: #28a745;">Bs ${p.total.toFixed(2)}</strong>
                    </div>
                    <details>
                        <summary style="cursor: pointer; color: #1a73e8;">📋 Ver productos</summary>
                        <div style="margin-top: 5px; padding-left: 10px;">
                            ${p.detalle_pedido?.map(d => `
                                <div style="display: flex; justify-content: space-between; padding: 3px 0;">
                                    <span>${d.cantidad} x ${d.descripcion}</span>
                                    <span>Bs ${d.subtotal?.toFixed(2) || 0}</span>
                                </div>
                            `).join('') || 'Sin productos'}
                        </div>
                    </details>
                </div>
            `).join('');
        } else {
            pedidosHtml = '<p class="text-muted">No tiene pedidos registrados</p>';
        }
        
        // Mostrar en modal
        const modalHtml = `
            <div id="modalHistorial" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 2000;">
                <div style="background: white; padding: 1.5rem; border-radius: 12px; width: 90%; max-width: 600px; max-height: 80vh; overflow-y: auto;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h3 style="margin: 0;">📜 Historial de ${cliente.nombre}</h3>
                        <button onclick="document.getElementById('modalHistorial').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <p><strong>📞 Teléfono:</strong> ${cliente.telefono || 'N/A'}</p>
                        <p><strong>📧 Email:</strong> ${cliente.email || 'N/A'}</p>
                        <p><strong>📍 Dirección:</strong> ${cliente.direccion || 'N/A'}</p>
                    </div>
                    <h4>🛒 Pedidos realizados (${pedidos?.length || 0})</h4>
                    ${pedidosHtml}
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
    } catch (err) {
        alert('Error al cargar historial: ' + err.message);
    }
}

async function editarCliente(clienteId) {
    try {
        const { data: cliente } = await db
            .from('clientes')
            .select('*')
            .eq('id', clienteId)
            .single();
        
        const modalHtml = `
            <div id="modalEditarCliente" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 2000;">
                <div style="background: white; padding: 1.5rem; border-radius: 12px; width: 90%; max-width: 500px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h3 style="margin: 0;">✏️ Editar Cliente</h3>
                        <button onclick="document.getElementById('modalEditarCliente').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
                    </div>
                    <div class="form-group">
                        <label>Nombre</label>
                        <input type="text" id="editNombre" class="form-control" value="${cliente.nombre || ''}">
                    </div>
                    <div class="form-group">
                        <label>Teléfono</label>
                        <input type="text" id="editTelefono" class="form-control" value="${cliente.telefono || ''}">
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="editEmail" class="form-control" value="${cliente.email || ''}">
                    </div>
                    <div class="form-group">
                        <label>Dirección</label>
                        <textarea id="editDireccion" class="form-control" rows="2">${cliente.direccion || ''}</textarea>
                    </div>
                    <div class="button-group">
                        <button onclick="guardarCliente(${clienteId})" class="btn btn-primary">💾 Guardar</button>
                        <button onclick="document.getElementById('modalEditarCliente').remove()" class="btn btn-danger">Cancelar</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

async function guardarCliente(clienteId) {
    const nombre = document.getElementById('editNombre')?.value.trim();
    const telefono = document.getElementById('editTelefono')?.value.trim();
    const email = document.getElementById('editEmail')?.value.trim();
    const direccion = document.getElementById('editDireccion')?.value.trim();
    
    if (!nombre || !telefono) {
        alert('⚠️ Nombre y teléfono son obligatorios');
        return;
    }
    
    try {
        const { error } = await db
            .from('clientes')
            .update({
                nombre: nombre,
                telefono: telefono,
                email: email || null,
                direccion: direccion || null
            })
            .eq('id', clienteId);
        
        if (error) throw error;
        
        alert('✅ Cliente actualizado');
        document.getElementById('modalEditarCliente')?.remove();
        await refrescarListaClientes();
        
    } catch (err) {
        alert('❌ Error: ' + err.message);
    }
}

async function toggleFrecuente(clienteId, hacerFrecuente) {
    try {
        const { error } = await db
            .from('clientes')
            .update({ es_frecuente: hacerFrecuente })
            .eq('id', clienteId);
        
        if (error) throw error;
        
        alert(hacerFrecuente ? '✅ Cliente marcado como frecuente' : '✅ Cliente marcado como ocasional');
        await refrescarListaClientes();
        
    } catch (err) {
        alert('❌ Error: ' + err.message);
    }
}

// Exponer funciones globalmente
window.verHistorialCliente = verHistorialCliente;
window.editarCliente = editarCliente;
window.guardarCliente = guardarCliente;
window.toggleFrecuente = toggleFrecuente;
