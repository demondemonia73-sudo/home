// ============================================
// TIENDA.JS - CATÁLOGO Y CARRITO v2.0 - ESTILO ALIBABA
// ============================================

let catalogoProductos = [];
let categoriasLista = [];
let carrito = [];
let filtroActual = 'todas';
let clienteActual = null;
let esClienteFrecuente = false;
let tiposCorrea = [];
let productoModalActual = null;
let vistaActual = 'grid';
let precioMin = null;
let precioMax = null;
let soloStock = false;

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🛒 Iniciando catálogo estilo Alibaba');

    if (typeof db === 'undefined') {
        document.getElementById('catalogoContainer').innerHTML = '<div class="alert alert-danger">Error de conexión</div>';
        return;
    }

    await cargarTiposCorrea();

    const telefonoInput = document.getElementById('telefonoCliente');
    if (telefonoInput) {
        telefonoInput.addEventListener('blur', async () => {
            await verificarClienteFrecuente(telefonoInput.value);
        });
    }

    const tipoEntrega = document.getElementById('tipoEntrega');
    if (tipoEntrega) {
        tipoEntrega.addEventListener('change', function() {
            const div = document.getElementById('divDireccionEnvio');
            if (div) div.classList.toggle('hidden', this.value !== 'envio_domicilio');
        });
    }

    await cargarCategoriasTienda();
    await cargarProductosTienda();
});

async function cargarTiposCorrea() {
    try {
        const { data, error } = await db.from('tipos_correa').select('*').eq('activo', true).order('medida_mm');
        if (error) throw error;
        tiposCorrea = data && data.length > 0 ? data : [
            { nombre: 'A', medida_mm: 13 }, { nombre: 'B', medida_mm: 17 },
            { nombre: '3V', medida_mm: 9.5 }, { nombre: '5V', medida_mm: 15.5 }
        ];
    } catch (err) {
        tiposCorrea = [
            { nombre: 'A', medida_mm: 13 }, { nombre: 'B', medida_mm: 17 },
            { nombre: '3V', medida_mm: 9.5 }, { nombre: '5V', medida_mm: 15.5 }
        ];
    }
}

async function verificarClienteFrecuente(telefono) {
    if (!telefono || telefono.length < 6) return;
    try {
        const { data, error } = await db.from('clientes').select('id, nombre, es_frecuente').eq('telefono', telefono).maybeSingle();
        if (error) throw error;

        if (data && data.es_frecuente) {
            esClienteFrecuente = true;
            clienteActual = data;
            document.getElementById('divOpcionesEntrega').classList.remove('hidden');
            document.getElementById('nombreCliente').value = data.nombre || '';
            Toast.success(`¡Bienvenido de nuevo, ${data.nombre}!`);
        } else {
            esClienteFrecuente = false;
            clienteActual = null;
            document.getElementById('divOpcionesEntrega').classList.add('hidden');
        }
    } catch (err) {
        console.error('Error verificando cliente:', err);
    }
}

async function cargarCategoriasTienda() {
    try {
        const { data, error } = await db.from('categorias').select('*').order('nombre');
        if (error) throw error;
        categoriasLista = data || [];

        const container = document.getElementById('sidebarCategorias');
        if (!container) return;

        // Contar productos por categoría
        const { data: productosCount } = await db.from('productos').select('categoria_id').eq('activo', true);
        const countMap = {};
        (productosCount || []).forEach(p => {
            countMap[p.categoria_id] = (countMap[p.categoria_id] || 0) + 1;
        });

        let html = `
            <div class="sidebar-item active" onclick="filtrarTienda('todas')" data-cat="todas">
                <span class="cat-icon">📦</span>
                <span>Todos los productos</span>
                <span class="cat-count" id="countTodos">${productosCount?.length || 0}</span>
            </div>
        `;

        html += categoriasLista.map(c => `
            <div class="sidebar-item" onclick="filtrarTienda('${c.id}')" data-cat="${c.id}">
                <span class="cat-icon">${c.icono || '📦'}</span>
                <span>${c.nombre}</span>
                <span class="cat-count">${countMap[c.id] || 0}</span>
            </div>
        `).join('');

        container.innerHTML = html;
    } catch (err) {
        console.error('Error categorías:', err);
    }
}

function filtrarTienda(catId) {
    filtroActual = catId;
    document.querySelectorAll('.sidebar-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.cat === catId);
    });
    cargarProductosTienda();
}

function cambiarVista(vista) {
    vistaActual = vista;
    document.querySelectorAll('.vista-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase().includes(vista));
    });
    cargarProductosTienda();
}

function aplicarFiltroPrecio() {
    precioMin = document.getElementById('precioMin').value ? parseFloat(document.getElementById('precioMin').value) : null;
    precioMax = document.getElementById('precioMax').value ? parseFloat(document.getElementById('precioMax').value) : null;
    cargarProductosTienda();
}

function aplicarFiltros() {
    soloStock = document.getElementById('soloStock').checked;
    cargarProductosTienda();
}

async function cargarProductosTienda() {
    const container = document.getElementById('catalogoContainer');
    if (!container) return;
    container.innerHTML = '<div class="loading" style="grid-column:1/-1;"><div class="spinner"></div><p>Cargando productos...</p></div>';

    try {
        let query = db.from('productos').select('*, categorias(nombre, icono)').eq('activo', true);
        if (filtroActual !== 'todas') query = query.eq('categoria_id', parseInt(filtroActual));

        const { data, error } = await query.order('nombre');
        if (error) throw error;

        catalogoProductos = data || [];

        // Aplicar filtros adicionales
        if (precioMin !== null) {
            catalogoProductos = catalogoProductos.filter(p => p.precio_venta >= precioMin);
        }
        if (precioMax !== null) {
            catalogoProductos = catalogoProductos.filter(p => p.precio_venta <= precioMax);
        }
        if (soloStock) {
            catalogoProductos = catalogoProductos.filter(p => p.stock_actual > 0);
        }

        document.getElementById('resultCount').textContent = catalogoProductos.length;

        if (catalogoProductos.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column:1/-1; padding:3rem;">
                    <div class="empty-state-icon" style="font-size:3rem;">📦</div>
                    <div class="empty-state-title">No hay productos</div>
                    <div class="empty-state-desc">No se encontraron productos con los filtros seleccionados</div>
                </div>
            `;
            return;
        }

        if (vistaActual === 'grid') {
            container.className = 'alibaba-grid';
            container.innerHTML = catalogoProductos.map(p => renderAlibabaCard(p)).join('');
        } else {
            container.className = 'table-container';
            container.innerHTML = renderListaProductos();
        }

        // Asignar eventos
        catalogoProductos.forEach(p => {
            const card = document.getElementById(`card-${p.id}`);
            if (card) {
                card.addEventListener('click', (e) => {
                    if (!e.target.closest('.alibaba-btn') && !e.target.closest('.cantidad-control')) {
                        abrirModalProducto(p);
                    }
                });
            }

            const btn = document.getElementById(`add-${p.id}`);
            if (btn) btn.onclick = (e) => { e.stopPropagation(); agregarAlCarrito(p); };

            const btnMedidas = document.getElementById(`add-medidas-${p.id}`);
            if (btnMedidas) btnMedidas.onclick = (e) => { e.stopPropagation(); agregarAlCarritoConMedidas(p); };

            if (p.categoria_id === 1) {
                const correaSelect = document.getElementById(`tipoCorrea-${p.id}`);
                const canalesSelect = document.getElementById(`numCanales-${p.id}`);

                if (correaSelect) {
                    correaSelect.onchange = () => {
                        const personalizado = document.getElementById(`correaPersonalizada-${p.id}`);
                        if (personalizado) personalizado.classList.toggle('hidden', correaSelect.value !== 'personalizada');
                    };
                }
                if (canalesSelect) {
                    canalesSelect.onchange = () => {
                        const personalizado = document.getElementById(`canalesPersonalizado-${p.id}`);
                        const precioDiv = document.getElementById(`precioDinamico-${p.id}`);
                        const avisoDiv = document.getElementById(`avisoPersonalizado-${p.id}`);

                        if (personalizado) personalizado.classList.toggle('hidden', canalesSelect.value !== 'personalizado');
                        if (canalesSelect.value === 'personalizado') {
                            if (precioDiv) precioDiv.classList.add('hidden');
                            if (avisoDiv) avisoDiv.classList.remove('hidden');
                        } else {
                            if (precioDiv) precioDiv.classList.remove('hidden');
                            if (avisoDiv) avisoDiv.classList.add('hidden');
                            actualizarPrecioPolea(p.id, p.precio_venta, p.precio_por_canal_extra || 0);
                        }
                    };
                }
            }
        });
    } catch (err) {
        container.innerHTML = `<div class="alert alert-danger" style="grid-column:1/-1;">Error: ${err.message}</div>`;
    }
}

function renderAlibabaCard(producto) {
    const categoriaId = producto.categoria_id;
    const tieneImagen = producto.imagen_url && producto.imagen_url.trim() !== '';
    const imagenes = producto.imagenes && Array.isArray(producto.imagenes) && producto.imagenes.length > 0 ? producto.imagenes : [];
    const imgUrl = tieneImagen ? producto.imagen_url : (imagenes[0] || null);

    // Badge de stock
    let stockBadge = '';
    let stockClass = '';
    let stockDot = '';
    if (producto.stock_actual <= 0) {
        stockBadge = '<span class="alibaba-badge-stock sin-stock">AGOTADO</span>';
        stockClass = 'agotado';
        stockDot = 'agotado';
    } else if (producto.stock_actual < 5) {
        stockBadge = '<span class="alibaba-badge-stock bajo-stock">POCO STOCK</span>';
        stockClass = 'bajo';
        stockDot = 'bajo';
    } else {
        stockBadge = '<span class="alibaba-badge-stock en-stock">EN STOCK</span>';
        stockClass = '';
        stockDot = '';
    }

    const categoriaBadge = producto.categorias 
        ? `<span class="alibaba-badge-categoria">${producto.categorias.icono || '📦'} ${producto.categorias.nombre}</span>` 
        : '';

    return `
        <div class="alibaba-card" id="card-${producto.id}">
            <div class="alibaba-img-wrap">
                ${stockBadge}
                ${categoriaBadge}
                ${imgUrl 
                    ? `<img src="${imgUrl}" alt="${producto.nombre}" class="alibaba-img" loading="lazy" onerror="this.style.display='none'; this.parentElement.innerHTML += '<div class=\'alibaba-img-placeholder\'>📦</div>';">`
                    : `<div class="alibaba-img-placeholder">📦</div>`
                }
            </div>
            <div class="alibaba-body">
                <div class="alibaba-precio">
                    <span class="moneda">Bs</span>
                    ${producto.precio_venta.toFixed(2)}
                    <span class="unidad">/ ${producto.unidad_medida || 'pieza'}</span>
                </div>
                <div class="alibaba-nombre">${producto.nombre}</div>
                <div class="alibaba-desc">${producto.descripcion || 'Producto industrial de alta calidad'}</div>
                <div class="alibaba-meta">
                    <div class="alibaba-stock">
                        <span class="dot ${stockDot}"></span>
                        ${producto.stock_actual > 0 ? `${producto.stock_actual} ${producto.unidad_medida || 'uds'}` : 'Agotado'}
                    </div>
                    <button id="add-${producto.id}" class="alibaba-btn" ${producto.stock_actual <= 0 ? 'disabled' : ''}>
                        🛒 Pedir
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderListaProductos() {
    let html = `
        <table>
            <thead>
                <tr>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Precio</th>
                    <th>Stock</th>
                    <th>Acción</th>
                </tr>
            </thead>
            <tbody>
    `;

    catalogoProductos.forEach(p => {
        const tieneImagen = p.imagen_url && p.imagen_url.trim() !== '';
        html += `
            <tr style="cursor:pointer;" onclick="abrirModalProducto(catalogoProductos.find(x => x.id === ${p.id}))">
                <td>
                    <div style="display:flex; align-items:center; gap:0.75rem;">
                        <div style="width:48px; height:48px; border-radius:var(--radius-sm); background:var(--bg-body); display:flex; align-items:center; justify-content:center; overflow:hidden;">
                            ${tieneImagen 
                                ? `<img src="${p.imagen_url}" style="width:100%; height:100%; object-fit:cover;" onerror="this.style.display='none'; this.parentElement.textContent='📦';">`
                                : '📦'
                            }
                        </div>
                        <div>
                            <div style="font-weight:600;">${p.nombre}</div>
                            <div class="text-muted text-xs">${p.descripcion?.substring(0, 40) || ''}...</div>
                        </div>
                    </div>
                </td>
                <td><span class="badge" style="background:var(--primary-100); color:var(--primary-700);">${p.categorias?.icono || '📦'} ${p.categorias?.nombre || 'Sin cat.'}</span></td>
                <td><strong style="color:var(--danger);">${formatMoney(p.precio_venta)}</strong></td>
                <td>${p.stock_actual > 0 ? `<span style="color:var(--success);">✅ ${p.stock_actual}</span>` : '<span style="color:var(--danger);">❌ Agotado</span>'}</td>
                <td><button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); agregarAlCarrito(catalogoProductos.find(x => x.id === ${p.id}))" ${p.stock_actual <= 0 ? 'disabled' : ''}>🛒</button></td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    return html;
}

function actualizarPrecioPolea(productoId, precioBase, precioPorCanalExtra) {
    const select = document.getElementById(`numCanales-${productoId}`);
    const precioDiv = document.getElementById(`precioDinamico-${productoId}`);
    if (!select || !precioDiv) return;

    const canales = select.value;
    if (canales === 'personalizado') return;

    let precioFinal = precioBase;
    if (parseInt(canales) >= 2) {
        precioFinal = precioBase + (precioPorCanalExtra * (parseInt(canales) - 1));
    }
    precioDiv.innerHTML = `Precio estimado: <strong>${formatMoney(precioFinal)}</strong>`;
}

// ============================================
// MODAL DE PRODUCTO
// ============================================

function abrirModalProducto(producto) {
    if (!producto) return;
    productoModalActual = producto;

    const modal = document.getElementById('productoModal');
    const imgContainer = document.getElementById('modalImgContainer');

    // Imagen
    const tieneImagen = producto.imagen_url && producto.imagen_url.trim() !== '';
    const imagenes = producto.imagenes && Array.isArray(producto.imagenes) ? producto.imagenes : [];
    const imgUrl = tieneImagen ? producto.imagen_url : (imagenes[0] || null);

    if (imgUrl) {
        imgContainer.innerHTML = `<img src="${imgUrl}" alt="${producto.nombre}" onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\'font-size:6rem; opacity:0.2;\'>📦</div>';">`;
    } else {
        imgContainer.innerHTML = `<div style="font-size:6rem; opacity:0.2;">📦</div>`;
    }

    document.getElementById('modalCategoria').textContent = `${producto.categorias?.icono || '📦'} ${producto.categorias?.nombre || 'Sin categoría'}`;
    document.getElementById('modalNombre').textContent = producto.nombre;
    document.getElementById('modalPrecio').textContent = producto.precio_venta.toFixed(2);
    document.getElementById('modalUnidad').textContent = `/ ${producto.unidad_medida || 'pieza'}`;
    document.getElementById('modalDesc').textContent = producto.descripcion || 'Producto industrial de alta calidad para tu taller.';
    document.getElementById('modalStock').textContent = `${producto.stock_actual} ${producto.unidad_medida || 'unidades'}`;
    document.getElementById('modalUnidadMedida').textContent = producto.unidad_medida || 'Pieza';
    document.getElementById('modalPrecioCompra').textContent = formatMoney(producto.precio_compra);

    // Medidas para poleas
    const medidasContainer = document.getElementById('modalMedidasContainer');
    if (producto.categoria_id === 1) {
        const precioBase = producto.precio_venta;
        const precioPorCanalExtra = producto.precio_por_canal_extra || 0;
        const opcionesCorrea = tiposCorrea.map(t => `<option value="${t.nombre}">${t.nombre} (${t.medida_mm}mm)</option>`).join('');

        medidasContainer.innerHTML = `
            <div class="medidas-box" style="margin-bottom:1.5rem;">
                <div style="font-weight:700; font-size:0.875rem; margin-bottom:0.75rem; color:var(--text-primary);">📐 Especificaciones de la polea</div>
                <div class="form-row">
                    <div class="form-group" style="margin-bottom:0.75rem;">
                        <label style="font-size:0.8rem;">Tipo de correa</label>
                        <select id="modalTipoCorrea" class="form-control" style="font-size:0.85rem;">
                            ${opcionesCorrea}
                            <option value="personalizada">Personalizada</option>
                        </select>
                        <input type="text" id="modalCorreaPersonalizada" class="form-control hidden" placeholder="Medida en mm" style="margin-top:0.5rem; font-size:0.85rem;">
                    </div>
                    <div class="form-group" style="margin-bottom:0.75rem;">
                        <label style="font-size:0.8rem;">Diámetro del eje (mm)</label>
                        <select id="modalDiametroEje" class="form-control" style="font-size:0.85rem;">
                            <option value="16">16 mm</option><option value="19">19 mm</option>
                            <option value="24">24 mm</option><option value="28">28 mm</option>
                            <option value="personalizado">Personalizado</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom:0.75rem;">
                        <label style="font-size:0.8rem;">Número de canales</label>
                        <select id="modalNumCanales" class="form-control" style="font-size:0.85rem;">
                            <option value="1">1 canal - ${formatMoney(precioBase)}</option>
                            <option value="2">2 canales - ${formatMoney(precioBase + precioPorCanalExtra)}</option>
                            <option value="3">3 canales - ${formatMoney(precioBase + precioPorCanalExtra * 2)}</option>
                            <option value="personalizado">Personalizado (cotizar)</option>
                        </select>
                        <input type="number" id="modalCanalesPersonalizado" class="form-control hidden" placeholder="N° canales" style="margin-top:0.5rem; font-size:0.85rem;" min="1">
                    </div>
                </div>
                <div id="modalPrecioDinamico" style="font-size:1rem; font-weight:700; color:var(--success); margin-top:0.5rem;">${formatMoney(precioBase)}</div>
                <div id="modalAvisoPersonalizado" class="hidden" style="margin-top:0.5rem; padding:0.5rem; background:var(--warning-light); border-radius:var(--radius-sm); font-size:0.8rem; color:var(--warning);">
                    ⚠️ Pedido especial - Precio a cotizar
                </div>
            </div>
        `;

        // Event listeners del modal
        setTimeout(() => {
            const correaSelect = document.getElementById('modalTipoCorrea');
            const canalesSelect = document.getElementById('modalNumCanales');

            if (correaSelect) {
                correaSelect.onchange = () => {
                    const personalizado = document.getElementById('modalCorreaPersonalizada');
                    if (personalizado) personalizado.classList.toggle('hidden', correaSelect.value !== 'personalizada');
                };
            }
            if (canalesSelect) {
                canalesSelect.onchange = () => {
                    const personalizado = document.getElementById('modalCanalesPersonalizado');
                    const precioDiv = document.getElementById('modalPrecioDinamico');
                    const avisoDiv = document.getElementById('modalAvisoPersonalizado');

                    if (personalizado) personalizado.classList.toggle('hidden', canalesSelect.value !== 'personalizado');
                    if (canalesSelect.value === 'personalizado') {
                        if (precioDiv) precioDiv.classList.add('hidden');
                        if (avisoDiv) avisoDiv.classList.remove('hidden');
                    } else {
                        if (precioDiv) precioDiv.classList.remove('hidden');
                        if (avisoDiv) avisoDiv.classList.add('hidden');
                        let precioFinal = precioBase;
                        if (parseInt(canalesSelect.value) >= 2) {
                            precioFinal = precioBase + (precioPorCanalExtra * (parseInt(canalesSelect.value) - 1));
                        }
                        if (precioDiv) precioDiv.innerHTML = `<strong>${formatMoney(precioFinal)}</strong>`;
                    }
                };
            }
        }, 50);
    } else if (producto.categoria_id === 2 && producto.unidad_medida === 'kg') {
        medidasContainer.innerHTML = `
            <div style="background:var(--info-light); padding:1rem; border-radius:var(--radius-sm); margin-bottom:1.5rem;">
                <label style="font-weight:700; font-size:0.875rem;">⚖️ Peso (kilogramos)</label>
                <input type="number" id="modalPeso" class="form-control" step="0.1" min="0.1" placeholder="Ej: 2.5" style="margin-top:0.5rem; font-size:0.85rem;">
            </div>
        `;
    } else {
        medidasContainer.innerHTML = '';
    }

    // Botón agregar
    const btnAgregar = document.getElementById('modalBtnAgregar');
    if (producto.stock_actual <= 0) {
        btnAgregar.disabled = true;
        btnAgregar.textContent = '❌ Agotado';
    } else {
        btnAgregar.disabled = false;
        btnAgregar.textContent = '🛒 Agregar al pedido';
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function cerrarModalProducto(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('productoModal').classList.remove('active');
    document.body.style.overflow = '';
    productoModalActual = null;
}

function agregarDesdeModal() {
    if (!productoModalActual) return;

    const producto = productoModalActual;
    const categoriaId = producto.categoria_id;
    let especificaciones = null;
    let cantidad = 1;
    let precioFinal = producto.precio_venta;
    let esPedidoEspecial = false;

    if (categoriaId === 1) {
        let tipoCorrea = document.getElementById('modalTipoCorrea')?.value;
        let diametroEje = document.getElementById('modalDiametroEje')?.value;
        let numCanales = document.getElementById('modalNumCanales')?.value;

        if (tipoCorrea === 'personalizada') {
            const val = document.getElementById('modalCorreaPersonalizada')?.value;
            if (!val) { Toast.warning('Ingresa la medida de la correa'); return; }
            tipoCorrea = `Personalizada: ${val}mm`;
            esPedidoEspecial = true;
        } else {
            const t = tiposCorrea.find(tc => tc.nombre === tipoCorrea);
            if (t) tipoCorrea = `${tipoCorrea} (${t.medida_mm}mm)`;
        }

        if (diametroEje === 'personalizado') {
            const val = prompt('Ingresa el diámetro del eje en mm:');
            if (!val) { Toast.warning('Ingresa el diámetro'); return; }
            diametroEje = `Personalizado: ${val}mm`;
            esPedidoEspecial = true;
        }

        if (numCanales === 'personalizado') {
            const val = document.getElementById('modalCanalesPersonalizado')?.value;
            if (!val || val < 1) { Toast.warning('Ingresa número válido de canales'); return; }
            numCanales = val;
            esPedidoEspecial = true;
            precioFinal = 0;
        } else {
            const extra = producto.precio_por_canal_extra || 0;
            if (parseInt(numCanales) >= 2) precioFinal = producto.precio_venta + (extra * (parseInt(numCanales) - 1));
        }

        especificaciones = { 
            tipo_correa: tipoCorrea, 
            diametro_eje_mm: diametroEje, 
            num_canales: numCanales, 
            es_pedido_especial: esPedidoEspecial, 
            precio_calculado: precioFinal 
        };
    } else if (categoriaId === 2 && producto.unidad_medida === 'kg') {
        const peso = parseFloat(document.getElementById('modalPeso')?.value);
        if (!peso || peso <= 0) { Toast.warning('Ingresa un peso válido'); return; }
        cantidad = peso;
        especificaciones = { peso_kg: peso };
    }

    agregarAlCarrito(producto, cantidad, especificaciones, esPedidoEspecial ? 0 : precioFinal);
    cerrarModalProducto();
}

// ============================================
// CARRITO
// ============================================

function agregarAlCarrito(producto, cantidad = 1, especificaciones = null, precioPersonalizado = null) {
    const precioUsar = precioPersonalizado !== null ? precioPersonalizado : producto.precio_venta;
    const itemExistente = carrito.find(i => i.id === producto.id && JSON.stringify(i.especificaciones) === JSON.stringify(especificaciones));

    if (itemExistente) {
        itemExistente.cantidad += cantidad;
    } else {
        carrito.push({
            id: producto.id, 
            nombre: producto.nombre, 
            precio: precioUsar, 
            cantidad,
            especificaciones, 
            unidad: producto.unidad_medida, 
            categoria_id: producto.categoria_id,
            esPedidoEspecial: especificaciones?.es_pedido_especial || false,
            imagen: producto.imagen_url || null
        });
    }

    actualizarCarrito();
    Toast.success(`"${producto.nombre}" agregado al carrito`);
}

function agregarAlCarritoConMedidas(producto) {
    const categoriaId = producto.categoria_id;
    let especificaciones = null;
    let cantidad = 1;
    let precioFinal = producto.precio_venta;
    let esPedidoEspecial = false;

    if (categoriaId === 1) {
        let tipoCorrea = document.getElementById(`tipoCorrea-${producto.id}`)?.value;
        let diametroEje = document.getElementById(`diametroEje-${producto.id}`)?.value;
        let numCanales = document.getElementById(`numCanales-${producto.id}`)?.value;

        if (tipoCorrea === 'personalizada') {
            const val = document.getElementById(`correaPersonalizada-${producto.id}`)?.value;
            if (!val) { Toast.warning('Ingresa la medida de la correa'); return; }
            tipoCorrea = `Personalizada: ${val}mm`;
            esPedidoEspecial = true;
        } else {
            const t = tiposCorrea.find(tc => tc.nombre === tipoCorrea);
            if (t) tipoCorrea = `${tipoCorrea} (${t.medida_mm}mm)`;
        }

        if (diametroEje === 'personalizado') {
            const val = prompt('Ingresa el diámetro del eje en mm:');
            if (!val) { Toast.warning('Ingresa el diámetro'); return; }
            diametroEje = `Personalizado: ${val}mm`;
            esPedidoEspecial = true;
        }

        if (numCanales === 'personalizado') {
            const val = document.getElementById(`canalesPersonalizado-${producto.id}`)?.value;
            if (!val || val < 1) { Toast.warning('Ingresa número válido de canales'); return; }
            numCanales = val;
            esPedidoEspecial = true;
            precioFinal = 0;
        } else {
            const extra = producto.precio_por_canal_extra || 0;
            if (parseInt(numCanales) >= 2) precioFinal = producto.precio_venta + (extra * (parseInt(numCanales) - 1));
        }

        especificaciones = { 
            tipo_correa: tipoCorrea, 
            diametro_eje_mm: diametroEje, 
            num_canales: numCanales, 
            es_pedido_especial: esPedidoEspecial, 
            precio_calculado: precioFinal 
        };
    } else if (categoriaId === 2 && producto.unidad_medida === 'kg') {
        const input = document.getElementById(`medida-${producto.id}`);
        const peso = parseFloat(input?.value);
        if (!peso || peso <= 0) { Toast.warning('Ingresa un peso válido'); return; }
        cantidad = peso;
        especificaciones = { peso_kg: peso };
    }

    agregarAlCarrito(producto, cantidad, especificaciones, esPedidoEspecial ? 0 : precioFinal);
}

function actualizarCarrito() {
    const container = document.getElementById('carritoItems');
    const totalDiv = document.getElementById('carritoTotal');
    const countBadge = document.getElementById('carritoCount');

    if (!container || !totalDiv) return;

    countBadge.textContent = carrito.length;

    if (carrito.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding:1.5rem;">
                <div class="empty-state-icon" style="font-size:2rem;">🛒</div>
                <div class="empty-state-title" style="font-size:0.9rem;">Carrito vacío</div>
                <div class="empty-state-desc" style="font-size:0.8rem;">Agrega productos del catálogo</div>
            </div>
        `;
        totalDiv.innerHTML = '<span class="carrito-alibaba-total-label">Total:</span><span class="carrito-alibaba-total-valor">Bs 0.00</span>';
        return;
    }

    let total = 0;
    container.innerHTML = carrito.map((item, idx) => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;

        let especHtml = '';
        if (item.especificaciones) {
            if (item.especificaciones.tipo_correa) {
                especHtml = `<div class="carrito-alibaba-item-detalle">🔗 ${item.especificaciones.tipo_correa} · Eje: ${item.especificaciones.diametro_eje_mm}mm · Canales: ${item.especificaciones.num_canales}</div>`;
                if (item.esPedidoEspecial) especHtml += `<div class="carrito-alibaba-item-detalle" style="color:var(--danger);">⚠️ Pedido especial - Precio a cotizar</div>`;
            } else if (item.especificaciones.peso_kg) {
                especHtml = `<div class="carrito-alibaba-item-detalle">⚖️ ${item.especificaciones.peso_kg} kg</div>`;
            }
        }

        const cantidadStr = (item.cantidad % 1 !== 0) ? item.cantidad.toFixed(2) : item.cantidad;
        const precioStr = item.precio === 0 ? 'Por cotizar' : formatMoney(item.precio);

        return `
            <div class="carrito-alibaba-item">
                <div class="carrito-alibaba-item-img">
                    ${item.imagen ? `<img src="${item.imagen}" style="width:100%; height:100%; object-fit:cover;" onerror="this.style.display='none'; this.parentElement.textContent='📦';">` : '📦'}
                </div>
                <div class="carrito-alibaba-item-info">
                    <div class="carrito-alibaba-item-nombre">${item.nombre}</div>
                    ${especHtml}
                    <div class="carrito-alibaba-item-precio">${precioStr} x ${cantidadStr}</div>
                </div>
                <div class="cantidad-control">
                    <button onclick="cambiarCantidad(${idx}, ${item.cantidad - 1})">-</button>
                    <span>${cantidadStr}</span>
                    <button onclick="cambiarCantidad(${idx}, ${item.cantidad + 1})">+</button>
                    <button onclick="eliminarDelCarrito(${idx})" style="margin-left:0.5rem; color:var(--danger);">🗑️</button>
                </div>
            </div>
        `;
    }).join('');

    totalDiv.innerHTML = `<span class="carrito-alibaba-total-label">Total:</span><span class="carrito-alibaba-total-valor">${total === 0 ? 'Por cotizar' : formatMoney(total)}</span>`;
}

function cambiarCantidad(idx, nuevaCantidad) {
    if (nuevaCantidad <= 0) eliminarDelCarrito(idx);
    else { carrito[idx].cantidad = nuevaCantidad; actualizarCarrito(); }
}

function eliminarDelCarrito(idx) {
    carrito.splice(idx, 1);
    actualizarCarrito();
    Toast.info('Producto eliminado del carrito');
}

async function realizarPedido() {
    const nombre = document.getElementById('nombreCliente')?.value.trim();
    const telefono = document.getElementById('telefonoCliente')?.value.trim();
    const direccion = document.getElementById('direccionCliente')?.value.trim();
    const notas = document.getElementById('notasPedido')?.value.trim();

    let tipoEntrega = 'retiro_taller';
    let direccionEnvio = null;

    if (esClienteFrecuente) {
        tipoEntrega = document.getElementById('tipoEntrega')?.value || 'retiro_taller';
        direccionEnvio = document.getElementById('direccionEnvio')?.value.trim() || null;
    }

    if (!nombre || !telefono) { Toast.warning('Ingresa nombre y teléfono'); return; }
    if (carrito.length === 0) { Toast.warning('No hay productos en el carrito'); return; }

    const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const requiereCotizacion = carrito.some(item => item.precio === 0 || item.esPedidoEspecial);

    let mensajeEntrega = '';
    if (tipoEntrega === 'retiro_taller') mensajeEntrega = '🏭 Retiro en taller';
    else if (tipoEntrega === 'envio_domicilio') mensajeEntrega = `🚚 Envío a domicilio${direccionEnvio ? '\n📍 ' + direccionEnvio : ''}`;
    else mensajeEntrega = '🏪 Entrega en tienda';

    const msg = requiereCotizacion
        ? `⚠️ Este pedido contiene productos especiales.\nEl precio será cotizado por el administrador.\n\nCliente: ${nombre}\nTel: ${telefono}\n${mensajeEntrega}\nProductos: ${carrito.length}`
        : `¿Confirmar pedido por ${formatMoney(total)}?\n\nCliente: ${nombre}\nTel: ${telefono}\n${mensajeEntrega}\nProductos: ${carrito.length}`;

    if (!confirm(msg)) return;

    try {
        const clienteId = await buscarOCrearCliente(nombre, telefono, direccion);
        const codigo = `PED-${Date.now().toString().slice(-6)}`;

        const { data: pedido, error: pedidoError } = await db.from('pedidos').insert([{
            codigo, cliente_id: clienteId, estado: 'pendiente', total,
            adelanto_monto: 0, adelanto_confirmado: false,
            tipo_entrega: tipoEntrega, direccion_envio: direccionEnvio,
            notas: notas || null, requiere_cotizacion: requiereCotizacion,
            precio_asignado_manual: null
        }]).select();

        if (pedidoError) throw pedidoError;
        const pedidoId = pedido[0].id;

        if (carrito[0]?.categoria_id) {
            await db.from('pedidos').update({ categoria_id: carrito[0].categoria_id }).eq('id', pedidoId);
        }

        for (const item of carrito) {
            let descripcionExtra = '';
            if (item.especificaciones) {
                if (item.especificaciones.tipo_correa) {
                    descripcionExtra = ` (Correa: ${item.especificaciones.tipo_correa}, Eje: ${item.especificaciones.diametro_eje_mm}mm, Canales: ${item.especificaciones.num_canales})`;
                    if (item.esPedidoEspecial) descripcionExtra += ' [PEDIDO ESPECIAL - COTIZAR]';
                } else if (item.especificaciones.peso_kg) {
                    descripcionExtra = ` (${item.especificaciones.peso_kg} kg)`;
                }
            }

            await db.from('detalle_pedido').insert([{
                pedido_id: pedidoId, tipo: 'producto', producto_id: item.id,
                categoria_id: item.categoria_id || null,
                descripcion: item.nombre + descripcionExtra,
                cantidad: item.cantidad, precio_unitario: item.precio,
                subtotal: item.precio * item.cantidad,
                especificaciones: item.especificaciones ? JSON.stringify(item.especificaciones) : null
            }]);
        }

        const mensajeFinal = requiereCotizacion
            ? `✅ ¡Pedido especial registrado!\n\n📋 Código: ${codigo}\nEl administrador asignará el precio y te notificará.\n\nGuarda este código para consultar el estado.`
            : `✅ ¡Pedido realizado con éxito!\n\n📋 Código: ${codigo}\nGuarda este código para consultar el estado.`;

        alert(mensajeFinal);

        carrito = [];
        actualizarCarrito();
        document.getElementById('nombreCliente').value = '';
        document.getElementById('telefonoCliente').value = '';
        document.getElementById('direccionCliente').value = '';
        document.getElementById('notasPedido').value = '';
        if (document.getElementById('direccionEnvio')) document.getElementById('direccionEnvio').value = '';

    } catch (err) {
        console.error('Error:', err);
        Toast.error('Error al procesar: ' + err.message);
    }
}

async function buscarOCrearCliente(nombre, telefono, direccion) {
    const { data: existente } = await db.from('clientes').select('id').eq('telefono', telefono).maybeSingle();
    if (existente) return existente.id;

    const { data: nuevo, error } = await db.from('clientes').insert([{
        nombre, telefono, direccion: direccion || null, es_frecuente: false
    }]).select();

    if (error) throw error;
    return nuevo[0].id;
}

window.cambiarCantidad = cambiarCantidad;
window.eliminarDelCarrito = eliminarDelCarrito;
window.realizarPedido = realizarPedido;
window.filtrarTienda = filtrarTienda;
window.cambiarVista = cambiarVista;
window.aplicarFiltroPrecio = aplicarFiltroPrecio;
window.aplicarFiltros = aplicarFiltros;
window.abrirModalProducto = abrirModalProducto;
window.cerrarModalProducto = cerrarModalProducto;
window.agregarDesdeModal = agregarDesdeModal;
