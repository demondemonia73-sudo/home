// ============================================
// DASHBOARD.JS - PANEL DE CONTROL v2.0
// ============================================

async function cargarDashboard() {
    if (!verificarSesion() || !esAdmin()) return;

    const container = document.getElementById('vistaDinamica');
    container.innerHTML = `
        <div class="stats-grid animate-fade-in">
            <div class="stat-card primary">
                <div class="stat-header">
                    <div>
                        <div class="stat-label">Pedidos Pendientes</div>
                        <div class="stat-value" id="statPendientes">-</div>
                    </div>
                    <div class="stat-icon primary">⏳</div>
                </div>
                <div class="stat-change positive">Esperando asignación</div>
            </div>
            <div class="stat-card warning">
                <div class="stat-header">
                    <div>
                        <div class="stat-label">En Proceso</div>
                        <div class="stat-value" id="statProceso">-</div>
                    </div>
                    <div class="stat-icon warning">🔧</div>
                </div>
                <div class="stat-change positive">Trabajando</div>
            </div>
            <div class="stat-card success">
                <div class="stat-header">
                    <div>
                        <div class="stat-label">Terminados</div>
                        <div class="stat-value" id="statTerminados">-</div>
                    </div>
                    <div class="stat-icon success">✅</div>
                </div>
                <div class="stat-change positive">Listos para entrega</div>
            </div>
            <div class="stat-card info">
                <div class="stat-header">
                    <div>
                        <div class="stat-label">Total Clientes</div>
                        <div class="stat-value" id="statClientes">-</div>
                    </div>
                    <div class="stat-icon info">👥</div>
                </div>
                <div class="stat-change positive">Registrados</div>
            </div>
        </div>

        <div class="grid grid-cols-2" style="gap:1.5rem;">
            <div class="card animate-fade-in">
                <div class="card-header">
                    <div class="card-title">📋 Últimos Pedidos</div>
                    <button class="btn btn-ghost btn-sm" onclick="mostrarVista('pedidos')">Ver todos →</button>
                </div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Cliente</th>
                                <th>Estado</th>
                                <th>Total</th>
                                <th>Fecha</th>
                            </tr>
                        </thead>
                        <tbody id="tablaUltimosPedidos">
                            <tr><td colspan="5" class="text-center" style="padding:2rem;"><div class="spinner"></div></td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="card animate-fade-in">
                <div class="card-header">
                    <div class="card-title">📊 Resumen por Estado</div>
                </div>
                <div id="resumenEstados" style="padding:1rem;">
                    <div class="loading"><div class="spinner"></div></div>
                </div>
            </div>
        </div>
    `;

    await cargarDatosDashboard();
}

async function cargarDatosDashboard() {
    try {
        const [pedidosRes, clientesRes] = await Promise.all([
            db.from('pedidos').select('*').order('created_at', { ascending: false }),
            db.from('clientes').select('*')
        ]);

        const pedidos = pedidosRes.data || [];
        const clientes = clientesRes.data || [];

        const pendientes = pedidos.filter(p => p.estado === 'pendiente').length;
        const enProceso = pedidos.filter(p => p.estado === 'en_proceso' || p.estado === 'asignado').length;
        const terminados = pedidos.filter(p => p.estado === 'terminado').length;

        document.getElementById('statPendientes').textContent = pendientes;
        document.getElementById('statProceso').textContent = enProceso;
        document.getElementById('statTerminados').textContent = terminados;
        document.getElementById('statClientes').textContent = clientes.length;

        const ultimos = pedidos.slice(0, 8);
        const tbody = document.getElementById('tablaUltimosPedidos');

        if (ultimos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted" style="padding:2rem;">No hay pedidos registrados</td></tr>';
        } else {
            const clienteIds = [...new Set(ultimos.map(p => p.cliente_id))];
            const { data: clientesData } = await db.from('clientes').select('id, nombre').in('id', clienteIds);
            const clientesMap = {};
            (clientesData || []).forEach(c => clientesMap[c.id] = c.nombre);

            tbody.innerHTML = ultimos.map(p => `
                <tr>
                    <td><strong>${p.codigo}</strong></td>
                    <td>${clientesMap[p.cliente_id] || 'N/A'}</td>
                    <td><span class="badge badge-${p.estado}">${formatearEstado(p.estado)}</span></td>
                    <td><strong>${formatMoney(p.total)}</strong></td>
                    <td class="text-muted">${formatDateShort(p.created_at)}</td>
                </tr>
            `).join('');
        }

        const estados = ['pendiente', 'en_proceso', 'terminado', 'entregado', 'rechazado', 'cotizado'];
        const resumenContainer = document.getElementById('resumenEstados');
        const totalPedidos = pedidos.length || 1;

        resumenContainer.innerHTML = estados.map(est => {
            const count = pedidos.filter(p => p.estado === est).length;
            const porcentaje = Math.round((count / totalPedidos) * 100);
            const colores = {
                pendiente: 'var(--warning)',
                en_proceso: 'var(--info)',
                terminado: 'var(--success)',
                entregado: 'var(--primary-500)',
                rechazado: 'var(--danger)',
                cotizado: '#ec4899'
            };
            return `
                <div style="margin-bottom:1rem;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.25rem; font-size:0.875rem;">
                        <span>${formatearEstado(est)}</span>
                        <span class="font-semibold">${count} (${porcentaje}%)</span>
                    </div>
                    <div style="background:var(--border-color); border-radius:var(--radius-full); height:8px; overflow:hidden;">
                        <div style="background:${colores[est]}; width:${porcentaje}%; height:100%; border-radius:var(--radius-full); transition:width 1s ease;"></div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error('Error cargando dashboard:', err);
        Toast.error('Error al cargar el dashboard');
    }
}

function formatearEstado(estado) {
    const map = {
        'pendiente': '⏳ Pendiente',
        'en_proceso': '🔧 En proceso',
        'asignado': '📌 Asignado',
        'en_progreso': '🔧 En progreso',
        'terminado': '✅ Terminado',
        'entregado': '📦 Entregado',
        'rechazado': '❌ Rechazado',
        'rechazado_definitivo': '🚫 Cancelado',
        'cotizado': '💰 Cotizado',
        'cancelado_por_cliente': '🚫 Cancelado'
    };
    return map[estado] || estado;
}

window.cargarDashboard = cargarDashboard;
window.formatearEstado = formatearEstado;
