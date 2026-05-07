// ============================================
// MÓDULO DE REPORTES PDF
// ============================================

async function cargarReportes() {
    if (!verificarSesion()) return;
    
    const tabsContent = document.getElementById('tabsContent');
    tabsContent.innerHTML = `
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
                <h2 style="margin: 0;">📄 Generación de Reportes</h2>
            </div>
            
            <!-- Filtros de fecha -->
            <div style="background: #f8f9fa; padding: 1rem; border-radius: 12px; margin-bottom: 1.5rem;">
                <h3>📅 Filtros de fecha</h3>
                <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                    <div style="flex: 1;">
                        <label>Desde</label>
                        <input type="date" id="fechaDesde" class="form-control">
                    </div>
                    <div style="flex: 1;">
                        <label>Hasta</label>
                        <input type="date" id="fechaHasta" class="form-control">
                    </div>
                    <div style="display: flex; align-items: end; gap: 0.5rem;">
                        <button id="btnReportePedidos" class="btn btn-primary">📋 Reporte General de Pedidos</button>
                        <button id="btnReporteGanancias" class="btn btn-success">💰 Reporte de Ganancias</button>
                    </div>
                </div>
            </div>
            
            <!-- Lista de pedidos recientes -->
            <div id="listaPedidosReporte">
                <div class="loading">Cargando pedidos...</div>
            </div>
        </div>
    `;
    
    document.getElementById('btnReportePedidos').onclick = () => generarReportePedidos();
    document.getElementById('btnReporteGanancias').onclick = () => generarReporteGanancias();
    
    await cargarPedidosReporte();
}

async function cargarPedidosReporte() {
    const container = document.getElementById('listaPedidosReporte');
    container.innerHTML = '<div class="loading">Cargando...</div>';
    
    try {
        const { data, error } = await db
            .from('pedidos')
            .select('*, clientes(nombre, telefono), detalle_pedido(*)')
            .order('created_at', { ascending: false })
            .limit(20);
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            container.innerHTML = '<div class="alert alert-info">No hay pedidos registrados</div>';
            return;
        }
        
        let html = `
            <h3>📋 Últimos Pedidos</h3>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Cliente</th>
                            <th>Total</th>
                            <th>Estado</th>
                            <th>Fecha</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        for (const p of data) {
            html += `
                <tr>
                    <td><strong>${p.codigo}</strong></td>
                    <td>${p.clientes?.nombre || 'N/A'}\(br><small>${p.clientes?.telefono || ''}</small></td>
                    <td>Bs ${p.total.toFixed(2)}</strong></td>
                    <td><span class="badge badge-${p.estado}">${p.estado}</span></td>
                    <td>${new Date(p.created_at).toLocaleDateString()}</small></td>
                    <td>
                        <button class="btn" style="background: #17a2b8; padding: 0.3rem 0.6rem;" onclick="generarReciboCliente(${p.id}, '${p.codigo}')">📄 Recibo</button>
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

async function generarReciboCliente(pedidoId, codigo) {
    try {
        const { data: pedido, error } = await db
            .from('pedidos')
            .select('*, clientes(*)')
            .eq('id', pedidoId)
            .single();
        
        if (error) throw error;
        
        const { data: detalles } = await db
            .from('detalle_pedido')
            .select('*')
            .eq('pedido_id', pedidoId);
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Encabezado
        doc.setFontSize(18);
        doc.setTextColor(26, 115, 232);
        doc.text('TALLERTOTAL MANAGER', 14, 20);
        
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text('RECIBO DE ENTREGA / RETIRO', 14, 30);
        doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 40);
        doc.text(`Código de pedido: ${pedido.codigo}`, 14, 50);
        
        // Datos del cliente
        doc.setFontSize(11);
        doc.setTextColor(80, 80, 80);
        doc.text('DATOS DEL CLIENTE', 14, 65);
        doc.setFontSize(10);
        doc.text(`Nombre: ${pedido.clientes?.nombre || 'N/A'}`, 14, 75);
        doc.text(`Teléfono: ${pedido.clientes?.telefono || 'N/A'}`, 14, 82);
        doc.text(`Dirección: ${pedido.clientes?.direccion || 'N/A'}`, 14, 89);
        
        // Productos
        doc.text('PRODUCTOS / SERVICIOS', 14, 105);
        
        const tableData = detalles?.map(d => [
            d.cantidad,
            d.descripcion && d.descripcion.length > 40 ? d.descripcion.substring(0, 40) + '...' : d.descripcion || '',
            `Bs ${d.precio_unitario?.toFixed(2) || '0.00'}`,
            `Bs ${d.subtotal?.toFixed(2) || '0.00'}`
        ]) || [];
        
        doc.autoTable({
            startY: 110,
            head: [['Cantidad', 'Descripción', 'Precio unitario', 'Subtotal']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [26, 115, 232], textColor: [255, 255, 255] }
        });
        
        const finalY = doc.lastAutoTable.finalY + 10;
        
        // Total
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`TOTAL: Bs ${pedido.total?.toFixed(2) || '0.00'}`, 14, finalY);
        
        // Adelanto si aplica
        if (pedido.adelanto_monto > 0) {
            doc.text(`Adelanto: Bs ${pedido.adelanto_monto?.toFixed(2)}`, 14, finalY + 10);
            doc.text(`Saldo pendiente: Bs ${(pedido.total - pedido.adelanto_monto).toFixed(2)}`, 14, finalY + 20);
        }
        
        // Espacio para firma
        doc.setDrawColor(0, 0, 0);
        doc.line(14, finalY + 45, 100, finalY + 45);
        doc.setFontSize(9);
        doc.text('Firma del cliente', 14, finalY + 52);
        
        doc.line(110, finalY + 45, 196, finalY + 45);
        doc.text('Firma del trabajador', 110, finalY + 52);
        
        // Nota
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('Documento válido como comprobante de entrega. El cliente confirma recepción conforme.', 14, finalY + 70);
        
        doc.save(`recibo_${codigo}.pdf`);
        
    } catch (err) {
        alert('Error al generar recibo: ' + err.message);
    }
}

async function generarReportePedidos() {
    const desde = document.getElementById('fechaDesde').value;
    const hasta = document.getElementById('fechaHasta').value;
    
    try {
        let query = db.from('pedidos').select('*, clientes(nombre, telefono), detalle_pedido(*)');
        
        if (desde) {
            query = query.gte('created_at', `${desde}T00:00:00`);
        }
        if (hasta) {
            query = query.lte('created_at', `${hasta}T23:59:59`);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            alert('No hay pedidos en el rango de fechas seleccionado');
            return;
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape' });
        
        doc.setFontSize(16);
        doc.setTextColor(26, 115, 232);
        doc.text('TALLERTOTAL MANAGER - REPORTE DE PEDIDOS', 14, 15);
        
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 25);
        if (desde || hasta) {
            doc.text(`Período: ${desde || 'inicio'} al ${hasta || 'actual'}`, 14, 32);
        }
        
        const tableData = data.map(p => [
            p.codigo,
            p.clientes?.nombre || 'N/A',
            p.clientes?.telefono || 'N/A',
            `Bs ${p.total?.toFixed(2)}`,
            p.estado,
            new Date(p.created_at).toLocaleDateString()
        ]);
        
        doc.autoTable({
            startY: 40,
            head: [['Código', 'Cliente', 'Teléfono', 'Total', 'Estado', 'Fecha']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [26, 115, 232], textColor: [255, 255, 255] }
        });
        
        const totalGral = data.reduce((sum, p) => sum + (p.total || 0), 0);
        const finalY = doc.lastAutoTable.finalY + 10;
        
        doc.setFontSize(11);
        doc.text(`📊 RESUMEN: ${data.length} pedidos | Total general: Bs ${totalGral.toFixed(2)}`, 14, finalY);
        
        doc.save(`reporte_pedidos_${new Date().toISOString().slice(0, 10)}.pdf`);
        
    } catch (err) {
        alert('Error al generar reporte: ' + err.message);
    }
}

async function generarReporteGanancias() {
    const desde = document.getElementById('fechaDesde').value;
    const hasta = document.getElementById('fechaHasta').value;
    
    try {
        let query = db.from('pedidos').select('*, detalle_pedido(*)').eq('estado', 'entregado');
        
        if (desde) {
            query = query.gte('created_at', `${desde}T00:00:00`);
        }
        if (hasta) {
            query = query.lte('created_at', `${hasta}T23:59:59`);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const totalIngresos = data?.reduce((sum, p) => sum + (p.total || 0), 0) || 0;
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(16);
        doc.setTextColor(26, 115, 232);
        doc.text('TALLERTOTAL MANAGER - REPORTE DE GANANCIAS', 14, 15);
        
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 25);
        
        doc.setFontSize(12);
        doc.text(`📊 Total de pedidos entregados: ${data?.length || 0}`, 14, 45);
        doc.text(`💰 Ingresos totales: Bs ${totalIngresos.toFixed(2)}`, 14, 55);
        
        doc.save(`reporte_ganancias_${new Date().toISOString().slice(0, 10)}.pdf`);
        
    } catch (err) {
        alert('Error al generar reporte: ' + err.message);
    }
}

// Exponer funciones globales
window.generarReciboCliente = generarReciboCliente;
window.generarReportePedidos = generarReportePedidos;
window.generarReporteGanancias = generarReporteGanancias;
window.cargarReportes = cargarReportes;
