// ============================================
// CLIENTES.JS - GESTIÓN DE CLIENTES v2.0
// ============================================

let clientesData = [];

async function cargarClientes() {
    if (!verificarSesion() || !esAdmin()) return;

    const container = document.getElementById('vistaDinamica');
    container.innerHTML = `
        <div class="card animate-fade-in">
            <div class="card-header">
                <div>
                    <div class="card-title">👥 Gestión de Clientes</div>
                    <div class="card-subtitle">Administra tus clientes y su historial</div>
                </div>
                <button class="btn btn-primary btn-sm" onclick="refrescarListaClientes()">🔄 Refrescar</button>
            </div>

            <div style="display:flex; gap:1rem; margin-bottom:1.5rem; flex-wrap:wrap;">
                <div style="flex:2; min-width:200px;">
                    <input type="text" id="buscadorCliente" class="form-control" placeholder="🔍 Buscar por nombre, teléfono o email..." onkeyup="refrescarListaClientes()">
                </div>
                <div style="flex:1; min-width:150px;">
                    <select id="filtroTipoCliente" class="form-control" onchange="refrescarListaClientes()">
                        <option value="todos">Todos los clientes</option>
                        <option value="frecuente">⭐ Clientes frecuentes</option>
                        <option value="ocasional">👤 Clientes ocasionales</option>
                    </select>
                </div>
            </div>

            <div id="listaClientes">
                <div class="loading"><div class="spinner"></div><p>Cargando clientes...</p></div>
            </div>
        </div>
    `;

    await refrescarListaClientes();
}

async function refrescarListaClientes() {
    const listaDiv = document.getElementById('listaClientes');
    if (!listaDiv) return;
    listaDiv.innerHTML = '<div class="loading"><div class="spinner"></div><p>Cargando...</p></div>';

    const busqueda = document.getElementById('buscadorCliente')?.value.toLowerCase() || '';
    const filtroTipo = document.getElementById('filtroTipoCliente')?.value || 'todos';

    try {
        const { data: clientes, error } = await db.from('clientes').select('*').order('created_at', { ascending: false });
        if (error) throw error;

        clientesData = clientes || [];

        if (busqueda) {
            clientesData = clientesData.filter(c => 
                c.nombre?.toLowerCase().includes(busqueda) ||
                c.telefono?.includes(busqueda) ||
                c.email?.toLowerCase().includes(busqueda)
            );
        }

        if (filtroTipo === 'frecuente') {
            clientesData = clientesData.filter(c => c.es_frecuente === true);
        } else if (filtroTipo === 'ocasional') {
            clientesData = clientesData.filter(c => c.es_frecuente !== true);
        }

        if (clientesData.length === 0) {
            listaDiv.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <div class="empty-state-title">No hay clientes</div>
                    <div class="empty-state-desc">Los clientes se registran automáticamente al hacer pedidos</div>
                </div>
            `;
            return;
        }

        const { data: pedidos } = await db.from('pedidos').select('cliente_id, total');

        let html = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Cliente</th>
                            <th>Contacto</th>
                            <th>Pedidos</th>
                            <th>Total gastado</th>
                            <th>Tipo</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        for (const c of clientesData) {
            const pedidosCliente = pedidos?.filter(p => p.cliente_id === c.id) || [];
            const totalGastado = pedidosCliente.reduce((sum, p) => sum + (p.total || 0), 0);

            html += `
                <tr>
                    <td>
                        <div style="display:flex; align-items:center; gap:0.75rem;">
                            <div class="user-avatar" style="width:36px; height:36px; font-size:0.875rem;">${c.nombre?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) || '??'}</div>
                            <div>
                                <div style="font-weight:600;">${c.nombre || 'N/A'}</div>
                                <div class="text-muted text-xs">${c.direccion || 'Sin dirección'}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="text-sm">${c.telefono || 'N/A'}</div>
                        <div class="text-muted text-xs">${c.email || ''}</div>
                    </td>
                    <td style="text-align:center;">
                        <span style="font-weight:700; font-size:1.1rem;">${pedidosCliente.length}</span>
                    </td>
                    <td>
                        <span style="font-weight:700; color:var(--success);">${formatMoney(totalGastado)}</span>
                    </td>
                    <td>
                        <span class="badge" style="background:${c.es_frecuente ? 'var(--info-light)' : 'var(--border-color)'}; color:${c.es_frecuente ? 'var(--info)' : 'var(--text-muted)'};">
                            ${c.es_frecuente ? '⭐ Frecuente' : '👤 Ocasional'}
                        </span>
                    </td>
                    <td>
                        <div style="display:flex; gap:0.25rem;">
                            <button class="btn btn-info btn-sm" style="padding:0.3rem 0.6rem; font-size:0.7rem;" onclick="verHistorialCliente(${c.id})">📋</button>
                            <button class="btn btn-warning btn-sm" style="padding:0.3rem 0.6rem; font-size:0.7rem;" onclick="editarCliente(${c.id})">✏️</button>
                            <button class="btn btn-secondary btn-sm" style="padding:0.3rem 0.6rem; font-size:0.7rem;" onclick="toggleFrecuente(${c.id}, ${!c.es_frecuente})" title="${c.es_frecuente ? 'Quitar de frecuentes' : 'Marcar como frecuente'}">⭐</button>
                        </div>
                    </td>
                </tr>
            `;
        }

        const totalGeneral = clientesData.reduce((sum, c) => {
            const pc = pedidos?.filter(p => p.cliente_id === c.id) || [];
            return sum + pc.reduce((s, p) => s + (p.total || 0), 0);
        }, 0);

        html += `
                    </tbody>
                </table>
            </div>
            <div style="margin-top:1rem; padding:0.75rem; background:var(--primary-50); border-radius:var(--radius-sm); text-align:center;">
                <span class="text-sm text-muted">📊 ${clientesData.length} clientes | Total facturado: ${formatMoney(totalGeneral)}</span>
            </div>
        `;

        listaDiv.innerHTML = html;
    } catch (err) {
        console.error('Error:', err);
        listaDiv.innerHTML = `<div class="alert alert-danger"><span class="alert-icon">❌</span><div>Error: ${err.message}</div></div>`;
    }
}

async function verHistorialCliente(clienteId) {
    try {
        const { data: cliente } = await db.from('clientes').select('*').eq('id', clienteId).single();
        const { data: pedidos } = await db.from('pedidos').select('*, detalle_pedido(*)').eq('cliente_id', clienteId).order('created_at', { ascending: false });

        let pedidosHtml = '';
        if (pedidos && pedidos.length > 0) {
            pedidosHtml = pedidos.map(p => `
                <div style="border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:1rem; margin-bottom:0.75rem; background:var(--bg-body);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                        <strong style="color:var(--text-primary);">📋 ${p.codigo}</strong>
                        <span class="badge badge-${p.estado}">${formatearEstado(p.estado)}</span>
                    </div>
                    <div class="text-muted text-sm" style="margin-bottom:0.5rem;">
                        ${formatDate(p.created_at)} · <strong class="text-success">${formatMoney(p.total)}</strong>
                    </div>
                    <details>
                        <summary style="cursor:pointer; color:var(--primary-500); font-size:0.8rem; font-weight:600;">📦 Ver productos (${p.detalle_pedido?.length || 0})</summary>
                        <div style="margin-top:0.5rem; padding-left:0.5rem;">
                            ${p.detalle_pedido?.map(d => `
                                <div style="display:flex; justify-content:space-between; padding:0.25rem 0; font-size:0.8rem; border-bottom:1px solid var(--border-light);">
                                    <span>${d.cantidad} x ${d.descripcion}</span>
                                    <span>${formatMoney(d.subtotal)}</span>
                                </div>
                            `).join('') || '<span class="text-muted">Sin productos</span>'}
                        </div>
                    </details>
                </div>
            `).join('');
        } else {
            pedidosHtml = '<p class="text-muted text-center">No tiene pedidos registrados</p>';
        }

        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.innerHTML = `
            <div class="modal-content modal-lg">
                <div class="modal-header">
                    <div class="modal-title">📋 Historial de ${cliente.nombre}</div>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:1rem; margin-bottom:1rem; padding:1rem; background:var(--bg-body); border-radius:var(--radius-sm);">
                        <div><span class="text-muted text-xs">Teléfono</span><div style="font-weight:600;">${cliente.telefono || 'N/A'}</div></div>
                        <div><span class="text-muted text-xs">Email</span><div style="font-weight:600;">${cliente.email || 'N/A'}</div></div>
                        <div><span class="text-muted text-xs">Dirección</span><div style="font-weight:600;">${cliente.direccion || 'N/A'}</div></div>
                        <div><span class="text-muted text-xs">Tipo</span><div style="font-weight:600;">${cliente.es_frecuente ? '⭐ Frecuente' : '👤 Ocasional'}</div></div>
                    </div>
                    <h4 style="margin-bottom:1rem; font-size:1rem;">📦 Pedidos realizados (${pedidos?.length || 0})</h4>
                    <div style="max-height:400px; overflow-y:auto;">${pedidosHtml}</div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    } catch (err) {
        Toast.error('Error: ' + err.message);
    }
}

async function editarCliente(clienteId) {
    try {
        const { data: cliente } = await db.from('clientes').select('*').eq('id', clienteId).single();

        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <div class="modal-title">✏️ Editar Cliente</div>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Nombre</label>
                        <input type="text" id="editNombre" class="form-control" value="${cliente.nombre || ''}">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Teléfono</label>
                            <input type="text" id="editTelefono" class="form-control" value="${cliente.telefono || ''}">
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="editEmail" class="form-control" value="${cliente.email || ''}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Dirección</label>
                        <textarea id="editDireccion" class="form-control" rows="2">${cliente.direccion || ''}</textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
                    <button class="btn btn-primary" onclick="guardarCliente(${clienteId})">💾 Guardar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    } catch (err) {
        Toast.error('Error: ' + err.message);
    }
}

async function guardarCliente(clienteId) {
    const nombre = document.getElementById('editNombre')?.value.trim();
    const telefono = document.getElementById('editTelefono')?.value.trim();
    const email = document.getElementById('editEmail')?.value.trim();
    const direccion = document.getElementById('editDireccion')?.value.trim();

    if (!nombre || !telefono) {
        Toast.warning('Nombre y teléfono son obligatorios');
        return;
    }

    try {
        const { error } = await db.from('clientes').update({
            nombre, telefono, email: email || null, direccion: direccion || null
        }).eq('id', clienteId);

        if (error) throw error;
        Toast.success('Cliente actualizado');
        document.querySelector('.modal-overlay.active')?.remove();
        await refrescarListaClientes();
    } catch (err) {
        Toast.error('Error: ' + err.message);
    }
}

async function toggleFrecuente(clienteId, hacerFrecuente) {
    try {
        const { error } = await db.from('clientes').update({ es_frecuente: hacerFrecuente }).eq('id', clienteId);
        if (error) throw error;
        Toast.success(hacerFrecuente ? 'Cliente marcado como frecuente' : 'Cliente marcado como ocasional');
        await refrescarListaClientes();
    } catch (err) {
        Toast.error('Error: ' + err.message);
    }
}

window.cargarClientes = cargarClientes;
window.refrescarListaClientes = refrescarListaClientes;
window.verHistorialCliente = verHistorialCliente;
window.editarCliente = editarCliente;
window.guardarCliente = guardarCliente;
window.toggleFrecuente = toggleFrecuente;
