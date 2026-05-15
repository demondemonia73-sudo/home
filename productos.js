// ============================================
// PRODUCTOS.JS - GESTIÓN DE INVENTARIO v2.0
// ============================================

let productosData = [];
let categoriasData = [];
let productoEditando = null;
let categoriaFiltro = 'todas';

async function cargarProductos() {
    if (!verificarSesion() || !esAdmin()) return;

    const container = document.getElementById('vistaDinamica');
    container.innerHTML = `
        <div class="card animate-fade-in">
            <div class="card-header">
                <div>
                    <div class="card-title">📦 Gestión de Productos</div>
                    <div class="card-subtitle">Administra tu inventario y categorías</div>
                </div>
                <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                    <button class="btn btn-success btn-sm" onclick="mostrarFormularioNuevo()">➕ Nuevo Producto</button>
                    <button class="btn btn-secondary btn-sm" onclick="mostrarGestionCategorias()">🏷️ Categorías</button>
                </div>
            </div>

            <div class="filtros-bar">
                <span class="text-muted text-sm" style="font-weight:600;">🔍 Filtrar:</span>
                <button class="filtro-btn active" data-cat="todas" onclick="filtrarPorCategoria('todas')">Todos</button>
                <div id="filtrosCategorias" style="display:flex; gap:0.5rem; flex-wrap:wrap;"></div>
            </div>

            <!-- Formulario Producto -->
            <div id="formProducto" class="hidden" style="background:var(--bg-body); padding:1.5rem; border-radius:var(--radius-md); margin-bottom:1.5rem; border:1px solid var(--border-color);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                    <h3 id="formTitulo" style="font-size:1.1rem; font-weight:700;">➕ Nuevo Producto</h3>
                    <button class="modal-close" onclick="ocultarFormulario()">&times;</button>
                </div>

                <!-- Imagen del producto -->
                <div class="form-group">
                    <label>📷 Foto del producto</label>
                    <div style="display:flex; gap:1rem; align-items:flex-start; flex-wrap:wrap;">
                        <div id="previewImagen" style="width:120px; height:120px; border-radius:var(--radius-md); background:var(--bg-body); border:2px dashed var(--border-color); display:flex; align-items:center; justify-content:center; font-size:2.5rem; color:var(--text-muted); overflow:hidden; flex-shrink:0;">
                            📷
                        </div>
                        <div style="flex:1; min-width:200px;">
                            <input type="text" id="prodImagenUrl" class="form-control" placeholder="URL de la imagen (ej: https://...)">
                            <div class="form-hint">Pega una URL de imagen o sube una foto</div>
                            <div style="margin-top:0.5rem; display:flex; gap:0.5rem; flex-wrap:wrap;">
                                <button type="button" class="btn btn-secondary btn-sm" onclick="subirImagenProducto()">📷 Subir foto</button>
                                <button type="button" class="btn btn-ghost btn-sm" onclick="limpiarImagenProducto()">🗑️ Quitar</button>
                            </div>
                            <div id="uploadStatus" style="margin-top:0.5rem; font-size:0.8rem;"></div>
                        </div>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>Categoría *</label>
                        <select id="prodCategoria" class="form-control" required>
                            <option value="">-- Seleccionar --</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Nombre *</label>
                        <input type="text" id="prodNombre" class="form-control" placeholder="Ej: Polea de Aluminio">
                    </div>
                </div>
                <div class="form-group">
                    <label>Descripción</label>
                    <textarea id="prodDescripcion" class="form-control" rows="2" placeholder="Descripción del producto"></textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Precio compra (Bs) *</label>
                        <input type="number" id="prodPrecioCompra" class="form-control" step="0.01" placeholder="0.00">
                    </div>
                    <div class="form-group">
                        <label>Precio venta (Bs) *</label>
                        <input type="number" id="prodPrecioVenta" class="form-control" step="0.01" placeholder="0.00">
                    </div>
                    <div class="form-group">
                        <label>Precio canal extra (Bs)</label>
                        <input type="number" id="prodPrecioCanalExtra" class="form-control" step="0.01" placeholder="0.00">
                        <div class="form-hint">Solo para poleas multi-canal</div>
                    </div>
                    <div class="form-group">
                        <label>Stock inicial</label>
                        <input type="number" id="prodStock" class="form-control" value="0" step="0.01">
                    </div>
                    <div class="form-group">
                        <label>Unidad</label>
                        <select id="prodUnidad" class="form-control">
                            <option value="pieza">Pieza</option>
                            <option value="kg">Kilogramo</option>
                            <option value="metro">Metro</option>
                            <option value="litro">Litro</option>
                            <option value="par">Par</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-check">
                        <input type="checkbox" id="prodRequiereMedidas">
                        <span>📐 Requiere medidas personalizadas</span>
                    </label>
                </div>
                <div class="form-group hidden" id="camposMedidas">
                    <label>Campos de medida (separados por coma)</label>
                    <input type="text" id="prodCamposMedida" class="form-control" placeholder="Ej: Diámetro externo, Diámetro eje, Ancho">
                    <div class="form-hint">Estos campos aparecerán en el catálogo</div>
                </div>
                <div class="form-group">
                    <label>Especificaciones técnicas</label>
                    <input type="text" id="prodEspecificaciones" class="form-control" placeholder="Ej: Material: Aluminio, Acabado: Pulido">
                </div>
                <div style="display:flex; gap:0.5rem; justify-content:flex-end; flex-wrap:wrap;">
                    <button class="btn btn-secondary" onclick="ocultarFormulario()">Cancelar</button>
                    <button class="btn btn-primary" onclick="guardarProducto()">💾 Guardar Producto</button>
                </div>
            </div>

            <div id="listaProductos">
                <div class="loading"><div class="spinner"></div><p>Cargando productos...</p></div>
            </div>
        </div>
    `;

    document.getElementById('prodRequiereMedidas').addEventListener('change', function() {
        document.getElementById('camposMedidas').classList.toggle('hidden', !this.checked);
    });

    document.getElementById('prodImagenUrl').addEventListener('input', function() {
        actualizarPreviewImagen(this.value);
    });

    await cargarCategorias();
    await refrescarListaProductos();
}

function actualizarPreviewImagen(url) {
    const preview = document.getElementById('previewImagen');
    if (url && url.trim()) {
        preview.innerHTML = `<img src="${url}" style="width:100%; height:100%; object-fit:cover; border-radius:var(--radius-md);" onerror="this.style.display='none'; this.parentElement.textContent='📷';">`;
    } else {
        preview.textContent = '📷';
    }
}

function limpiarImagenProducto() {
    document.getElementById('prodImagenUrl').value = '';
    actualizarPreviewImagen('');
    const status = document.getElementById('uploadStatus');
    if (status) status.textContent = '';
}

async function subirImagenProducto() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            Toast.warning('La imagen no debe superar 2MB para mejor rendimiento');
            return;
        }

        const statusDiv = document.getElementById('uploadStatus');
        if (statusDiv) statusDiv.innerHTML = '<span style="color:var(--info);">⏳ Procesando imagen...</span>';

        // Siempre usar base64 - funciona sin configurar Storage
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target.result;
            document.getElementById('prodImagenUrl').value = base64;
            actualizarPreviewImagen(base64);
            if (statusDiv) {
                statusDiv.innerHTML = `
                    <span style="color:var(--success);">✅ Imagen cargada</span>
                    <span style="font-size:0.75rem; color:var(--text-muted); display:block; margin-top:0.25rem;">
                        Guardada en base64 - funciona inmediatamente
                    </span>
                `;
            }
            Toast.success('Imagen cargada correctamente');
        };
        reader.onerror = () => {
            if (statusDiv) statusDiv.innerHTML = '<span style="color:var(--danger);">❌ Error al leer la imagen</span>';
            Toast.error('Error al procesar la imagen');
        };
        reader.readAsDataURL(file);
    };
    input.click();
}

async function cargarCategorias() {
    try {
        const { data, error } = await db.from('categorias').select('*').order('nombre');
        if (error) throw error;

        categoriasData = data || [];

        const select = document.getElementById('prodCategoria');
        if (select) {
            select.innerHTML = '<option value="">-- Seleccionar categoría --</option>' +
                categoriasData.map(c => `<option value="${c.id}">${c.icono || '📦'} ${c.nombre}</option>`).join('');
        }

        const filtrosDiv = document.getElementById('filtrosCategorias');
        if (filtrosDiv) {
            filtrosDiv.innerHTML = categoriasData.map(c => `
                <button class="filtro-btn" data-cat="${c.id}" onclick="filtrarPorCategoria('${c.id}')">
                    ${c.icono || '📦'} ${c.nombre}
                </button>
            `).join('');
        }
    } catch (err) {
        console.error('Error categorías:', err);
        Toast.error('Error cargando categorías');
    }
}

function filtrarPorCategoria(catId) {
    categoriaFiltro = catId;

    document.querySelectorAll('.filtro-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.cat === catId) btn.classList.add('active');
    });

    refrescarListaProductos();
}

function mostrarFormularioNuevo() {
    productoEditando = null;
    document.getElementById('formTitulo').textContent = '➕ Nuevo Producto';
    document.getElementById('prodCategoria').value = '';
    document.getElementById('prodNombre').value = '';
    document.getElementById('prodDescripcion').value = '';
    document.getElementById('prodPrecioCompra').value = '';
    document.getElementById('prodPrecioVenta').value = '';
    document.getElementById('prodPrecioCanalExtra').value = '';
    document.getElementById('prodStock').value = '0';
    document.getElementById('prodUnidad').value = 'pieza';
    document.getElementById('prodRequiereMedidas').checked = false;
    document.getElementById('camposMedidas').classList.add('hidden');
    document.getElementById('prodCamposMedida').value = '';
    document.getElementById('prodEspecificaciones').value = '';
    document.getElementById('prodImagenUrl').value = '';
    actualizarPreviewImagen('');
    const status = document.getElementById('uploadStatus');
    if (status) status.textContent = '';
    document.getElementById('formProducto').classList.remove('hidden');
    document.getElementById('prodNombre').focus();
}

function editarProducto(producto) {
    productoEditando = producto;
    const espec = producto.especificaciones || {};

    document.getElementById('formTitulo').textContent = `✏️ Editando: ${producto.nombre}`;
    document.getElementById('prodCategoria').value = producto.categoria_id || '';
    document.getElementById('prodNombre').value = producto.nombre;
    document.getElementById('prodDescripcion').value = producto.descripcion || '';
    document.getElementById('prodPrecioCompra').value = producto.precio_compra;
    document.getElementById('prodPrecioVenta').value = producto.precio_venta;
    document.getElementById('prodPrecioCanalExtra').value = producto.precio_por_canal_extra || '';
    document.getElementById('prodStock').value = producto.stock_actual;
    document.getElementById('prodUnidad').value = producto.unidad_medida || 'pieza';
    document.getElementById('prodRequiereMedidas').checked = espec.requiere_medidas || false;
    document.getElementById('camposMedidas').classList.toggle('hidden', !espec.requiere_medidas);
    document.getElementById('prodCamposMedida').value = (espec.campos_medida || []).join(', ');
    document.getElementById('prodEspecificaciones').value = espec.medidas || '';
    document.getElementById('prodImagenUrl').value = producto.imagen_url || '';
    actualizarPreviewImagen(producto.imagen_url || '');
    const status = document.getElementById('uploadStatus');
    if (status) status.textContent = '';
    document.getElementById('formProducto').classList.remove('hidden');
}

function ocultarFormulario() {
    document.getElementById('formProducto').classList.add('hidden');
    productoEditando = null;
}

async function guardarProducto() {
    const categoriaId = document.getElementById('prodCategoria').value;
    const nombre = document.getElementById('prodNombre').value.trim();
    const descripcion = document.getElementById('prodDescripcion').value.trim();
    const precioCompra = parseFloat(document.getElementById('prodPrecioCompra').value);
    const precioVenta = parseFloat(document.getElementById('prodPrecioVenta').value);
    const precioCanalExtra = parseFloat(document.getElementById('prodPrecioCanalExtra').value) || 0;
    const stock = parseFloat(document.getElementById('prodStock').value) || 0;
    const unidad = document.getElementById('prodUnidad').value;
    const requiereMedidas = document.getElementById('prodRequiereMedidas').checked;
    const camposMedida = document.getElementById('prodCamposMedida').value.split(',').map(c => c.trim()).filter(c => c);
    const especificaciones = document.getElementById('prodEspecificaciones').value;
    const imagenUrl = document.getElementById('prodImagenUrl').value.trim();

    if (!categoriaId) { Toast.warning('Selecciona una categoría'); return; }
    if (!nombre) { Toast.warning('El nombre es obligatorio'); return; }
    if (isNaN(precioCompra) || precioCompra < 0) { Toast.warning('Precio de compra inválido'); return; }
    if (isNaN(precioVenta) || precioVenta < 0) { Toast.warning('Precio de venta inválido'); return; }

    const productoData = {
        categoria_id: parseInt(categoriaId),
        nombre,
        descripcion: descripcion || null,
        precio_compra: precioCompra,
        precio_venta: precioVenta,
        precio_por_canal_extra: precioCanalExtra,
        stock_actual: stock,
        unidad_medida: unidad,
        especificaciones: {
            medidas: especificaciones,
            requiere_medidas: requiereMedidas,
            campos_medida: camposMedida
        },
        imagen_url: imagenUrl || null,
        activo: true
    };

    try {
        if (productoEditando) {
            const { error } = await db.from('productos').update(productoData).eq('id', productoEditando.id);
            if (error) throw error;
            Toast.success('Producto actualizado');
        } else {
            const { error } = await db.from('productos').insert([productoData]);
            if (error) throw error;
            Toast.success('Producto creado');
        }

        ocultarFormulario();
        await refrescarListaProductos();
    } catch (err) {
        Toast.error('Error: ' + err.message);
    }
}

async function eliminarProducto(id, nombre) {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return;
    try {
        const { error } = await db.from('productos').update({ activo: false }).eq('id', id);
        if (error) throw error;
        Toast.success('Producto eliminado');
        await refrescarListaProductos();
    } catch (err) {
        Toast.error('Error: ' + err.message);
    }
}

async function actualizarStock(id, nuevoStock) {
    if (nuevoStock < 0) { Toast.warning('Stock no puede ser negativo'); return; }
    try {
        const { error } = await db.from('productos').update({ stock_actual: nuevoStock }).eq('id', id);
        if (error) throw error;
        await refrescarListaProductos();
    } catch (err) {
        Toast.error('Error: ' + err.message);
    }
}

async function refrescarListaProductos() {
    const listaDiv = document.getElementById('listaProductos');
    if (!listaDiv) return;
    listaDiv.innerHTML = '<div class="loading"><div class="spinner"></div><p>Cargando...</p></div>';

    try {
        let query = db.from('productos').select('*, categorias(nombre, icono)').eq('activo', true);
        if (categoriaFiltro !== 'todas') {
            query = query.eq('categoria_id', parseInt(categoriaFiltro));
        }

        const { data, error } = await query.order('nombre');
        if (error) throw error;

        productosData = data || [];

        if (productosData.length === 0) {
            listaDiv.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📦</div>
                    <div class="empty-state-title">No hay productos</div>
                    <div class="empty-state-desc">Agrega tu primer producto para comenzar</div>
                    <button class="btn btn-primary" onclick="mostrarFormularioNuevo()">➕ Nuevo Producto</button>
                </div>
            `;
            return;
        }

        let html = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Foto</th>
                            <th>ID</th>
                            <th>Categoría</th>
                            <th>Producto</th>
                            <th>Stock</th>
                            <th>P. Compra</th>
                            <th>P. Venta</th>
                            <th>Ganancia</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        productosData.forEach(p => {
            const ganancia = p.precio_venta - p.precio_compra;
            const gananciaPct = p.precio_compra > 0 ? ((ganancia / p.precio_compra) * 100).toFixed(1) : 0;
            const tieneImagen = p.imagen_url && p.imagen_url.trim() !== '';

            html += `
                <tr>
                    <td>
                        <div style="width:48px; height:48px; border-radius:var(--radius-sm); background:var(--bg-body); display:flex; align-items:center; justify-content:center; overflow:hidden; border:1px solid var(--border-color);">
                            ${tieneImagen 
                                ? `<img src="${p.imagen_url}" style="width:100%; height:100%; object-fit:cover;" onerror="this.style.display='none'; this.parentElement.textContent='📦';">`
                                : '📦'
                            }
                        </div>
                    </td>
                    <td class="text-muted">#${p.id}</td>
                    <td><span class="badge" style="background:var(--primary-100); color:var(--primary-700);">${p.categorias?.icono || '📦'} ${p.categorias?.nombre || 'Sin cat.'}</span></td>
                    <td>
                        <div style="font-weight:600;">${p.nombre}</div>
                        <div class="text-muted text-xs">${p.descripcion || ''}</div>
                    </td>
                    <td>
                        <div style="display:flex; align-items:center; gap:0.5rem;">
                            <span style="font-weight:700; font-size:1.1rem;">${p.stock_actual}</span>
                            <span class="text-muted text-xs">${p.unidad_medida}</span>
                        </div>
                        <div style="display:flex; gap:0.25rem; margin-top:0.25rem; flex-wrap:wrap;">
                            <button class="btn btn-success btn-sm" style="padding:0.15rem 0.4rem; font-size:0.7rem;" onclick="actualizarStock(${p.id}, ${p.stock_actual + 1})">+</button>
                            <button class="btn btn-danger btn-sm" style="padding:0.15rem 0.4rem; font-size:0.7rem;" onclick="if(${p.stock_actual}>0) actualizarStock(${p.id}, ${p.stock_actual - 1})">-</button>
                            <button class="btn btn-secondary btn-sm" style="padding:0.15rem 0.4rem; font-size:0.7rem;" onclick="let n=prompt('Nuevo stock:',${p.stock_actual}); if(n!==null) actualizarStock(${p.id}, parseFloat(n))">✏️</button>
                        </div>
                    </td>
                    <td class="text-muted">${formatMoney(p.precio_compra)}</td>
                    <td style="font-weight:600;">${formatMoney(p.precio_venta)}</td>
                    <td>
                        <span style="color:${ganancia >= 0 ? 'var(--success)' : 'var(--danger)'}; font-weight:600;">
                            ${formatMoney(ganancia)}<br>
                            <span class="text-xs">(${gananciaPct}%)</span>
                        </span>
                    </td>
                    <td>
                        <div style="display:flex; gap:0.25rem; flex-wrap:wrap;">
                            <button class="btn btn-warning btn-sm" style="padding:0.3rem 0.6rem; font-size:0.7rem;" onclick='editarProducto(${JSON.stringify(p).replace(/'/g, "&apos;")})'>✏️</button>
                            <button class="btn btn-danger btn-sm" style="padding:0.3rem 0.6rem; font-size:0.7rem;" onclick="eliminarProducto(${p.id}, '${p.nombre.replace(/'/g, "\'")}')">🗑️</button>
                        </div>
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
            <div style="margin-top:1rem; padding:0.75rem; background:var(--primary-50); border-radius:var(--radius-sm); text-align:center;">
                <span class="text-sm text-muted">📊 Total: ${productosData.length} productos | Stock total: ${productosData.reduce((s, p) => s + p.stock_actual, 0).toFixed(2)} unidades</span>
            </div>
        `;

        listaDiv.innerHTML = html;
    } catch (err) {
        console.error('Error:', err);
        listaDiv.innerHTML = `<div class="alert alert-danger"><span class="alert-icon">❌</span><div>Error: ${err.message}</div></div>`;
    }
}

// ============================================
// GESTIÓN DE CATEGORÍAS
// ============================================

function mostrarGestionCategorias() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.id = 'modalCategorias';
    modal.innerHTML = `
        <div class="modal-content modal-lg">
            <div class="modal-header">
                <div class="modal-title">🏷️ Gestionar Categorías</div>
                <button class="modal-close" onclick="document.getElementById('modalCategorias').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div id="listaCategoriasModal"><div class="loading"><div class="spinner"></div></div></div>
                <div class="form-group" style="margin-top:1rem;">
                    <label>Agregar nueva categoría</label>
                    <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                        <input type="text" id="nuevaCategoriaNombre" class="form-control" placeholder="Ej: Poleas" style="flex:1; min-width:150px;">
                        <input type="text" id="nuevaCategoriaIcono" class="form-control" placeholder="Icono" style="width:80px;" value="📦">
                        <button class="btn btn-success" onclick="agregarCategoria()">➕</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    cargarCategoriasModal();
}

async function cargarCategoriasModal() {
    const container = document.getElementById('listaCategoriasModal');
    try {
        const { data, error } = await db.from('categorias').select('*').order('nombre');
        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = '<p class="text-muted text-center">No hay categorías</p>';
            return;
        }

        container.innerHTML = `
            <div style="max-height:300px; overflow-y:auto;">
                ${data.map(c => `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:0.5rem; border-bottom:1px solid var(--border-light);">
                        <span>${c.icono || '📦'} ${c.nombre}</span>
                        <button class="btn btn-danger btn-sm" style="padding:0.2rem 0.5rem;" onclick="eliminarCategoria(${c.id}, '${c.nombre.replace(/'/g, "\'")}')">🗑️</button>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
    }
}

async function agregarCategoria() {
    const nombre = document.getElementById('nuevaCategoriaNombre').value.trim();
    const icono = document.getElementById('nuevaCategoriaIcono').value.trim() || '📦';

    if (!nombre) { Toast.warning('Ingresa el nombre'); return; }

    try {
        const { error } = await db.from('categorias').insert([{ nombre, icono }]);
        if (error) throw error;
        Toast.success('Categoría creada');
        document.getElementById('nuevaCategoriaNombre').value = '';
        await cargarCategoriasModal();
        await cargarCategorias();
        await refrescarListaProductos();
    } catch (err) {
        Toast.error('Error: ' + err.message);
    }
}

async function eliminarCategoria(id, nombre) {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return;
    try {
        await db.from('productos').update({ categoria_id: null }).eq('categoria_id', id);
        const { error } = await db.from('categorias').delete().eq('id', id);
        if (error) throw error;
        Toast.success('Categoría eliminada');
        await cargarCategoriasModal();
        await cargarCategorias();
        await refrescarListaProductos();
    } catch (err) {
        Toast.error('Error: ' + err.message);
    }
}

// Exponer funciones
window.cargarProductos = cargarProductos;
window.filtrarPorCategoria = filtrarPorCategoria;
window.mostrarFormularioNuevo = mostrarFormularioNuevo;
window.editarProducto = editarProducto;
window.ocultarFormulario = ocultarFormulario;
window.guardarProducto = guardarProducto;
window.eliminarProducto = eliminarProducto;
window.actualizarStock = actualizarStock;
window.mostrarGestionCategorias = mostrarGestionCategorias;
window.agregarCategoria = agregarCategoria;
window.eliminarCategoria = eliminarCategoria;
window.subirImagenProducto = subirImagenProducto;
window.limpiarImagenProducto = limpiarImagenProducto;
