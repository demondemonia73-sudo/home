// ============================================
// MÓDULO DE DASHBOARD
// ============================================

async function cargarDashboard() {
    const tabsContent = document.getElementById('tabsContent');
    tabsContent.innerHTML = '<div class="card loading">Cargando datos...</div>';
    
    try {
        const [pedidosRes, clientesRes] = await Promise.all([
            db.from('pedidos').select('*'),
            db.from('clientes').select('*')
        ]);
        
        const pedidosData = pedidosRes.data || [];
        const clientesData = clientesRes.data || [];
        
        const pendientes = pedidosData.filter(p => p.estado === 'pendiente').length;
        const enProceso = pedidosData.filter(p => p.estado === 'en_proceso').length;
        const terminados = pedidosData.filter(p => p.estado === 'terminado').length;
        
        const html = `
            <div class="stats-grid">
                <div class="stat-card" style="border-top-color: var(--primary-color);">
                    <h3>📦 Pedidos Pendientes</h3>
                    <p style="color: var(--primary-color);">${pendientes}</p>
                </div>
                <div class="stat-card" style="border-top-color: var(--warning-color);">
                    <h3>⚙️ En Proceso</h3>
                    <p style="color: var(--warning-color);">${enProceso}</p>
                </div>
                <div class="stat-card" style="border-top-color: var(--success-color);">
                    <h3>✅ Terminados</h3>
                    <p style="color: var(--success-color);">${terminados}</p>
                </div>
                <div class="stat-card" style="border-top-color: var(--info-color);">
                    <h3>👥 Clientes Registrados</h3>
                    <p style="color: var(--info-color);">${clientesData.length}</p>
                </div>
            </div>
            <div class="card">
                <h3>📋 Últimos Pedidos</h3>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr><th>Código</th><th>Cliente</th><th>Estado</th><th>Total</th><th>Fecha</th></tr>
                        </thead>
                        <tbody id="ultimosPedidosTabla"></tbody>
                    </table>
                </div>
            </div>
        `;
        
        tabsContent.innerHTML = html;
        
        // 🔧 CORREGIDO: 'clientes' en lugar de 'clients'
        const { data: pedidos, error } = await db
            .from('pedidos')
            .select('*, clientes(nombre)')
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (error) {
            console.error('Error cargando pedidos:', error);
            document.getElementById('ultimosPedidosTabla').innerHTML = '<tr><td colspan="5">Error cargando pedidos</td></tr>';
            return;
        }
        
        const tbody = document.getElementById('ultimosPedidosTabla');
        if (pedidos && pedidos.length > 0) {
            tbody.innerHTML = pedidos.map(p => `
                <tr>
                    <td><strong>${p.codigo}</strong></td>
                    <td>${p.clientes?.nombre || 'N/A'}</td>
                    <td><span class="badge badge-${p.estado}">${p.estado}</span></td>
                    <td>$${p.total}</td>
                    <td>${new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay pedidos registrados</td></tr>';
        }
        
    } catch (err) {
        console.error('Error en dashboard:', err);
        tabsContent.innerHTML = `<div class="alert alert-danger">Error al cargar dashboard: ${err.message}</div>`;
    }
}
