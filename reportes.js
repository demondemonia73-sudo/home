// ============================================
// REPORTES.JS - GENERACIÓN DE REPORTES v2.1
// Recibo mejorado: formato ticket 80mm, duplicado (empresa + cliente)
// ============================================

async function cargarReportes() {
    if (!verificarSesion() || !esAdmin()) return;

    const container = document.getElementById('vistaDinamica');
    container.innerHTML = `
        <div class="animate-fade-in">
            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">📊 Generación de Reportes</div>
                        <div class="card-subtitle">Genera reportes PDF de pedidos y ganancias</div>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:1.5rem; margin-bottom:1.5rem;">
                    <div style="background:var(--bg-body); padding:1.5rem; border-radius:var(--radius-md); border:1px solid var(--border-color);">
                        <h4 style="margin-bottom:1rem; font-size:1rem;">📅 Filtros de fecha</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Desde</label>
                                <input type="date" id="fechaDesde" class="form-control">
                            </div>
                            <div class="form-group">
                                <label>Hasta</label>
                                <input type="date" id="fechaHasta" class="form-control">
                            </div>
                        </div>
                        <div style="display:flex; gap:0.5rem; margin-top:1rem; flex-wrap:wrap;">
                            <button class="btn btn-primary flex-1" onclick="generarReportePedidos()">📋 Reporte Pedidos</button>
                            <button class="btn btn-success flex-1" onclick="generarReporteGanancias()">💰 Reporte Ganancias</button>
                        </div>
                    </div>

                    <div style="background:var(--bg-body); padding:1.5rem; border-radius:var(--radius-md); border:1px solid var(--border-color);">
                        <h4 style="margin-bottom:1rem; font-size:1rem;">📈 Estadísticas rápidas</h4>
                        <div id="statsReportes">
                            <div class="loading"><div class="spinner" style="width:24px; height:24px;"></div><p class="text-sm">Cargando...</p></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card" style="margin-top:1.5rem;">
                <div class="card-header">
                    <div class="card-title">📄 Últimos Pedidos para Recibo</div>
                </div>
                <div id="listaPedidosReporte">
                    <div class="loading"><div class="spinner"></div><p>Cargando...</p></div>
                </div>
            </div>
        </div>
    `;

    await cargarStatsReportes();
    await cargarPedidosReporte();
}

async function cargarStatsReportes() {
    try {
        const { data: pedidos } = await db.from('pedidos').select('estado, total');
        const { data: entregados } = await db.from('pedidos').select('total').eq('estado', 'entregado');

        const total = pedidos?.length || 0;
        const ingresos = entregados?.reduce((s, p) => s + (p.total || 0), 0) || 0;
        const pendientes = pedidos?.filter(p => p.estado === 'pendiente').length || 0;

        document.getElementById('statsReportes').innerHTML = `
            <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:1rem; text-align:center;">
                <div>
                    <div style="font-size:1.5rem; font-weight:800; color:var(--primary-500);">${total}</div>
                    <div class="text-muted text-xs">Total pedidos</div>
                </div>
                <div>
                    <div style="font-size:1.5rem; font-weight:800; color:var(--success);">${formatMoney(ingresos)}</div>
                    <div class="text-muted text-xs">Ingresos (entregados)</div>
                </div>
                <div>
                    <div style="font-size:1.5rem; font-weight:800; color:var(--warning);">${pendientes}</div>
                    <div class="text-muted text-xs">Pendientes</div>
                </div>
            </div>
        `;
    } catch (err) {
        document.getElementById('statsReportes').innerHTML = '<p class="text-muted text-sm">Error cargando estadísticas</p>';
    }
}

async function cargarPedidosReporte() {
    const container = document.getElementById('listaPedidosReporte');
    try {
        const { data, error } = await db
            .from('pedidos')
            .select('*, clientes(nombre, telefono), detalle_pedido(*)')
            .order('created_at', { ascending: false })
            .limit(15);

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-title">No hay pedidos</div></div>';
            return;
        }

        let html = `
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
                    <td>
                        <div style="font-weight:600;">${p.clientes?.nombre || 'N/A'}</div>
                        <div class="text-muted text-xs">${p.clientes?.telefono || ''}</div>
                    </td>
                    <td><strong class="text-success">${formatMoney(p.total)}</strong></td>
                    <td><span class="badge badge-${p.estado}">${formatearEstado(p.estado)}</span></td>
                    <td class="text-muted text-xs">${formatDateShort(p.created_at)}</td>
                    <td>
                        <button class="btn btn-info btn-sm" style="padding:0.3rem 0.6rem; font-size:0.7rem;" onclick="generarReciboCliente(${p.id}, '${p.codigo}')">🧾 Recibo</button>
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

// ============================================
// RECIBO TIPO TICKET 80mm - DUPLICADO
// ============================================

async function generarReciboCliente(pedidoId, codigo) {
    try {
        Toast.info('Generando recibo tipo ticket...');

        const { data: pedido, error } = await db
            .from('pedidos')
            .select('*, clientes(*)')
            .eq('id', pedidoId)
            .single();

        if (error) throw error;

        const { data: detalles } = await db.from('detalle_pedido').select('*').eq('pedido_id', pedidoId);

        const { jsPDF } = window.jspdf;

        // Formato ticket: 80mm de ancho (~226 puntos)
        // 1mm = 2.83465 puntos
        const anchoTicket = 80 * 2.83465; // ~226.77 puntos
        const doc = new jsPDF({
            unit: 'pt',
            format: [anchoTicket, 800], // Altura dinámica, recortaremos después
            orientation: 'portrait'
        });

        let y = 15;
        const margen = 10;
        const anchoTexto = anchoTicket - (margen * 2);
        const centro = anchoTicket / 2;

        function addCenteredText(text, size, bold = false, spacing = 1.2) {
            doc.setFontSize(size);
            doc.setFont('helvetica', bold ? 'bold' : 'normal');
            const lines = doc.splitTextToSize(text, anchoTexto);
            lines.forEach(line => {
                const textWidth = doc.getTextWidth(line);
                doc.text(line, centro - (textWidth / 2), y);
                y += size * spacing;
            });
        }

        function addLine(left, right, size = 9) {
            doc.setFontSize(size);
            doc.setFont('helvetica', 'normal');
            if (right) {
                doc.text(left, margen, y);
                const rightWidth = doc.getTextWidth(right);
                doc.text(right, anchoTicket - margen - rightWidth, y);
                y += size * 1.3;
            } else {
                const lines = doc.splitTextToSize(left, anchoTexto);
                lines.forEach(line => {
                    doc.text(line, margen, y);
                    y += size * 1.3;
                });
            }
        }

        function addDivider() {
            y += 3;
            doc.setDrawColor(150, 150, 150);
            doc.setLineWidth(0.5);
            doc.line(margen, y, anchoTicket - margen, y);
            y += 6;
        }

        function addDoubleDivider() {
            y += 2;
            doc.setDrawColor(100, 100, 100);
            doc.setLineWidth(1);
            doc.line(margen, y, anchoTicket - margen, y);
            y += 3;
            doc.line(margen, y, anchoTicket - margen, y);
            y += 6;
        }

        // ============================================
        // COPIA 1: PARA LA EMPRESA (ORIGINAL)
        // ============================================

        // Logo / Nombre empresa
        doc.setTextColor(79, 70, 229);
        addCenteredText('⚙️ TALLERTOTAL', 14, true, 1.1);
        doc.setTextColor(100, 100, 100);
        addCenteredText('Taller de Mecanizado Industrial', 8, false, 1.1);
        addCenteredText('Tel: 0981-XXX-XXX', 8, false, 1.1);

        addDivider();

        // Tipo de copia
        doc.setTextColor(200, 50, 50);
        addCenteredText('*** ORIGINAL - EMPRESA ***', 9, true, 1.2);
        doc.setTextColor(60, 60, 60);

        addDivider();

        // Datos del recibo
        doc.setTextColor(79, 70, 229);
        addCenteredText('RECIBO DE ENTREGA', 11, true, 1.2);
        doc.setTextColor(60, 60, 60);

        addDivider();

        // Info del pedido
        addLine(`Pedido: ${pedido.codigo}`, null, 9);
        addLine(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, null, 9);
        addLine(`Estado: ${formatearEstado(pedido.estado)}`, null, 9);

        addDivider();

        // Datos del cliente
        doc.setTextColor(79, 70, 229);
        addCenteredText('CLIENTE', 9, true, 1.2);
        doc.setTextColor(60, 60, 60);

        addLine(pedido.clientes?.nombre || 'N/A', null, 9);
        if (pedido.clientes?.telefono) {
            addLine(`Tel: ${pedido.clientes.telefono}`, null, 8);
        }
        if (pedido.tipo_entrega) {
            const entregaMap = {
                'retiro_taller': '🏭 Retiro en taller',
                'envio_domicilio': '🚚 Envío a domicilio',
                'entrega_tienda': '🏪 Entrega en tienda'
            };
            addLine(`Entrega: ${entregaMap[pedido.tipo_entrega] || pedido.tipo_entrega}`, null, 8);
        }

        addDivider();

        // Productos
        doc.setTextColor(79, 70, 229);
        addCenteredText('PRODUCTOS', 9, true, 1.2);
        doc.setTextColor(60, 60, 60);

        const items = detalles || [];
        items.forEach((d, i) => {
            const descLines = doc.splitTextToSize(d.descripcion || 'Producto', anchoTexto - 20);
            descLines.forEach((line, idx) => {
                doc.setFontSize(8);
                doc.setFont('helvetica', idx === 0 ? 'bold' : 'normal');
                doc.text(line, margen + (idx > 0 ? 5 : 0), y);
                y += 9;
            });

            // Cantidad x Precio = Subtotal
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            const cantidadStr = `${d.cantidad} x ${formatMoney(d.precio_unitario || 0).replace('Bs ', '')}`;
            const subtotalStr = formatMoney(d.subtotal || 0);
            doc.text(cantidadStr, margen + 5, y);
            const subW = doc.getTextWidth(subtotalStr);
            doc.text(subtotalStr, anchoTicket - margen - subW, y);
            y += 11;

            if (i < items.length - 1) {
                doc.setDrawColor(220, 220, 220);
                doc.setLineWidth(0.3);
                doc.line(margen + 5, y - 3, anchoTicket - margen - 5, y - 3);
            }
        });

        addDoubleDivider();

        // Totales
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(79, 70, 229);
        const totalStr = `TOTAL: ${formatMoney(pedido.total || 0)}`;
        const totalW = doc.getTextWidth(totalStr);
        doc.text(totalStr, anchoTicket - margen - totalW, y);
        y += 14;

        doc.setTextColor(60, 60, 60);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');

        if (pedido.adelanto_monto > 0) {
            addLine(`Adelanto: ${formatMoney(pedido.adelanto_monto)}`, null, 8);
            const saldo = (pedido.total || 0) - pedido.adelanto_monto;
            doc.setFont('helvetica', 'bold');
            addLine(`SALDO: ${formatMoney(saldo)}`, null, 9);
            doc.setFont('helvetica', 'normal');
        }

        addDivider();

        // Firmas
        doc.setTextColor(100, 100, 100);
        addCenteredText('--- FIRMAS ---', 8, false, 1.1);

        y += 5;
        doc.setDrawColor(150, 150, 150);
        doc.setLineWidth(0.5);

        // Línea firma cliente
        doc.line(margen + 10, y, (anchoTicket / 2) - 10, y);
        doc.setFontSize(7);
        doc.text('Firma Cliente', margen + 10, y + 10);

        // Línea firma empresa
        doc.line((anchoTicket / 2) + 10, y, anchoTicket - margen - 10, y);
        doc.text('Firma Empresa', (anchoTicket / 2) + 10, y + 10);

        y += 20;

        addDivider();

        // Nota legal
        doc.setTextColor(120, 120, 120);
        doc.setFontSize(7);
        const nota = 'Documento válido como comprobante de entrega. Conserve este recibo para cualquier reclamo.';
        const notaLines = doc.splitTextToSize(nota, anchoTexto);
        notaLines.forEach(line => {
            const w = doc.getTextWidth(line);
            doc.text(line, centro - (w / 2), y);
            y += 8;
        });

        // ============================================
        // SEPARADOR ENTRE COPIAS (línea de corte)
        // ============================================
        y += 10;
        doc.setDrawColor(150, 150, 150);
        doc.setLineWidth(1);
        doc.setLineDashPattern([5, 3], 0);
        doc.line(margen, y, anchoTicket - margen, y);
        doc.setLineDashPattern([], 0);

        // Texto de corte
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(8);
        const corteText = '✂ CORTE AQUÍ ✂';
        const corteW = doc.getTextWidth(corteText);
        doc.text(corteText, centro - (corteW / 2), y + 12);

        y += 25;

        // ============================================
        // COPIA 2: PARA EL CLIENTE
        // ============================================

        // Logo / Nombre empresa (copia cliente)
        doc.setTextColor(79, 70, 229);
        addCenteredText('⚙️ TALLERTOTAL', 14, true, 1.1);
        doc.setTextColor(100, 100, 100);
        addCenteredText('Taller de Mecanizado Industrial', 8, false, 1.1);
        addCenteredText('Tel: 0981-XXX-XXX', 8, false, 1.1);

        addDivider();

        // Tipo de copia
        doc.setTextColor(16, 185, 129);
        addCenteredText('*** COPIA - CLIENTE ***', 9, true, 1.2);
        doc.setTextColor(60, 60, 60);

        addDivider();

        // Datos del recibo
        doc.setTextColor(79, 70, 229);
        addCenteredText('RECIBO DE ENTREGA', 11, true, 1.2);
        doc.setTextColor(60, 60, 60);

        addDivider();

        // Info del pedido (copia)
        addLine(`Pedido: ${pedido.codigo}`, null, 9);
        addLine(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, null, 9);
        addLine(`Estado: ${formatearEstado(pedido.estado)}`, null, 9);

        addDivider();

        // Datos del cliente (copia)
        doc.setTextColor(79, 70, 229);
        addCenteredText('CLIENTE', 9, true, 1.2);
        doc.setTextColor(60, 60, 60);

        addLine(pedido.clientes?.nombre || 'N/A', null, 9);
        if (pedido.clientes?.telefono) {
            addLine(`Tel: ${pedido.clientes.telefono}`, null, 8);
        }
        if (pedido.tipo_entrega) {
            const entregaMap = {
                'retiro_taller': '🏭 Retiro en taller',
                'envio_domicilio': '🚚 Envío a domicilio',
                'entrega_tienda': '🏪 Entrega en tienda'
            };
            addLine(`Entrega: ${entregaMap[pedido.tipo_entrega] || pedido.tipo_entrega}`, null, 8);
        }

        addDivider();

        // Productos (copia)
        doc.setTextColor(79, 70, 229);
        addCenteredText('PRODUCTOS', 9, true, 1.2);
        doc.setTextColor(60, 60, 60);

        items.forEach((d, i) => {
            const descLines = doc.splitTextToSize(d.descripcion || 'Producto', anchoTexto - 20);
            descLines.forEach((line, idx) => {
                doc.setFontSize(8);
                doc.setFont('helvetica', idx === 0 ? 'bold' : 'normal');
                doc.text(line, margen + (idx > 0 ? 5 : 0), y);
                y += 9;
            });

            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            const cantidadStr = `${d.cantidad} x ${formatMoney(d.precio_unitario || 0).replace('Bs ', '')}`;
            const subtotalStr = formatMoney(d.subtotal || 0);
            doc.text(cantidadStr, margen + 5, y);
            const subW = doc.getTextWidth(subtotalStr);
            doc.text(subtotalStr, anchoTicket - margen - subW, y);
            y += 11;

            if (i < items.length - 1) {
                doc.setDrawColor(220, 220, 220);
                doc.setLineWidth(0.3);
                doc.line(margen + 5, y - 3, anchoTicket - margen - 5, y - 3);
            }
        });

        addDoubleDivider();

        // Totales (copia)
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(79, 70, 229);
        const totalStr2 = `TOTAL: ${formatMoney(pedido.total || 0)}`;
        const totalW2 = doc.getTextWidth(totalStr2);
        doc.text(totalStr2, anchoTicket - margen - totalW2, y);
        y += 14;

        doc.setTextColor(60, 60, 60);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');

        if (pedido.adelanto_monto > 0) {
            addLine(`Adelanto: ${formatMoney(pedido.adelanto_monto)}`, null, 8);
            const saldo = (pedido.total || 0) - pedido.adelanto_monto;
            doc.setFont('helvetica', 'bold');
            addLine(`SALDO: ${formatMoney(saldo)}`, null, 9);
            doc.setFont('helvetica', 'normal');
        }

        addDivider();

        // Firmas (copia)
        doc.setTextColor(100, 100, 100);
        addCenteredText('--- FIRMAS ---', 8, false, 1.1);

        y += 5;
        doc.setDrawColor(150, 150, 150);
        doc.setLineWidth(0.5);

        doc.line(margen + 10, y, (anchoTicket / 2) - 10, y);
        doc.setFontSize(7);
        doc.text('Firma Cliente', margen + 10, y + 10);

        doc.line((anchoTicket / 2) + 10, y, anchoTicket - margen - 10, y);
        doc.text('Firma Empresa', (anchoTicket / 2) + 10, y + 10);

        y += 20;

        addDivider();

        // Nota legal (copia)
        doc.setTextColor(120, 120, 120);
        doc.setFontSize(7);
        const nota2 = 'Conserve este recibo. Para reclamos presentar dentro de 48 horas. Gracias por su preferencia.';
        const notaLines2 = doc.splitTextToSize(nota2, anchoTexto);
        notaLines2.forEach(line => {
            const w = doc.getTextWidth(line);
            doc.text(line, centro - (w / 2), y);
            y += 8;
        });

        // Ajustar altura del PDF al contenido real
        const finalHeight = y + 15;
        doc.setPage(1);

        // Recortar el PDF a la altura real
        // Nota: jsPDF no permite recortar fácilmente, pero al imprimir solo se imprime lo necesario

        doc.save(`recibo_${codigo}_ticket.pdf`);
        Toast.success('Recibo tipo ticket generado (2 copias)');

    } catch (err) {
        console.error('Error PDF:', err);
        Toast.error('Error generando recibo: ' + err.message);
    }
}

// ============================================
// REPORTES EXISTENTES (sin cambios)
// ============================================

async function generarReportePedidos() {
    const desde = document.getElementById('fechaDesde').value;
    const hasta = document.getElementById('fechaHasta').value;

    try {
        Toast.info('Generando reporte de pedidos...');

        let query = db.from('pedidos').select('*, clientes(nombre, telefono), detalle_pedido(*)');
        if (desde) query = query.gte('created_at', `${desde}T00:00:00`);
        if (hasta) query = query.lte('created_at', `${hasta}T23:59:59`);

        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;

        if (!data || data.length === 0) {
            Toast.warning('No hay pedidos en el rango seleccionado');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape' });

        doc.setFontSize(16);
        doc.setTextColor(79, 70, 229);
        doc.setFont('helvetica', 'bold');
        doc.text('TALLERTOTAL MANAGER - REPORTE DE PEDIDOS', 14, 15);

        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 14, 23);
        if (desde || hasta) doc.text(`Período: ${desde || 'inicio'} al ${hasta || 'actual'}`, 14, 29);

        const tableData = data.map(p => [
            p.codigo,
            p.clientes?.nombre || 'N/A',
            p.clientes?.telefono || 'N/A',
            `Bs ${(p.total || 0).toFixed(2)}`,
            formatearEstado(p.estado),
            new Date(p.created_at).toLocaleDateString('es-ES')
        ]);

        doc.autoTable({
            startY: 35,
            head: [['Código', 'Cliente', 'Teléfono', 'Total', 'Estado', 'Fecha']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
            styles: { fontSize: 8 }
        });

        const totalGral = data.reduce((sum, p) => sum + (p.total || 0), 0);
        const finalY = doc.lastAutoTable.finalY + 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`RESUMEN: ${data.length} pedidos | Total general: Bs ${totalGral.toFixed(2)}`, 14, finalY);

        doc.save(`reporte_pedidos_${new Date().toISOString().slice(0, 10)}.pdf`);
        Toast.success('Reporte generado correctamente');

    } catch (err) {
        Toast.error('Error: ' + err.message);
    }
}

async function generarReporteGanancias() {
    const desde = document.getElementById('fechaDesde').value;
    const hasta = document.getElementById('fechaHasta').value;

    try {
        Toast.info('Generando reporte de ganancias...');

        let query = db.from('pedidos').select('*, detalle_pedido(*)').eq('estado', 'entregado');
        if (desde) query = query.gte('created_at', `${desde}T00:00:00`);
        if (hasta) query = query.lte('created_at', `${hasta}T23:59:59`);

        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;

        const totalIngresos = data?.reduce((sum, p) => sum + (p.total || 0), 0) || 0;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(16);
        doc.setTextColor(79, 70, 229);
        doc.setFont('helvetica', 'bold');
        doc.text('TALLERTOTAL MANAGER - REPORTE DE GANANCIAS', 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 14, 30);
        if (desde || hasta) doc.text(`Período: ${desde || 'inicio'} al ${hasta || 'actual'}`, 14, 37);

        doc.setFillColor(240, 240, 250);
        doc.roundedRect(14, 48, 182, 35, 5, 5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(79, 70, 229);
        doc.text(`Bs ${totalIngresos.toFixed(2)}`, 20, 65);
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        doc.text('Ingresos totales', 20, 75);

        doc.setFontSize(14);
        doc.setTextColor(16, 185, 129);
        doc.text(`${data?.length || 0}`, 110, 65);
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        doc.text('Pedidos entregados', 110, 75);

        if (data && data.length > 0) {
            const tableData = data.map(p => [
                p.codigo,
                new Date(p.created_at).toLocaleDateString('es-ES'),
                `Bs ${(p.total || 0).toFixed(2)}`
            ]);

            doc.autoTable({
                startY: 95,
                head: [['Código', 'Fecha', 'Total']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] }
            });
        }

        doc.save(`reporte_ganancias_${new Date().toISOString().slice(0, 10)}.pdf`);
        Toast.success('Reporte de ganancias generado');

    } catch (err) {
        Toast.error('Error: ' + err.message);
    }
}

window.cargarReportes = cargarReportes;
window.generarReciboCliente = generarReciboCliente;
window.generarReportePedidos = generarReportePedidos;
window.generarReporteGanancias = generarReporteGanancias;
