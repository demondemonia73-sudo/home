// ============================================
// MÓDULO DE PRODUCTOS (INVENTARIO CON CATEGORÍAS)
// ============================================

// Variables globales del módulo
let productosData = [];
let categoriasData = [];
let productoEditando = null;
let categoriaFiltro = 'todas';

// Cargar productos al entrar al módulo
async function cargarProductos() {
    if (!verificarSesion()) return;
    
    const tabsContent = document.getElementById('tabsContent');
    tabsContent.innerHTML = `
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
                <h2 style="margin: 0;">🛒 Gestión de Productos</h2>
                <div style="display: flex; gap: 0.5rem;">
                    <button id="btnAgregarProducto" class="btn btn-success">➕ Nuevo Producto</button>
                    <button id="btnGestionarCategorias" class="btn btn-info">🏷️ Gestionar Categorías</button>
                </div>
            </div>
            
            <!-- Filtro por categoría -->
            <div id="filtroContainer" style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
                <strong>📁 Filtrar:</strong>
                <button id="filtroTodas" class="btn-filtro" data-cat="todas" style="padding: 0.3rem 0.8rem; border-radius: 20px; border: none; cursor: pointer; background: #1a73e8; color: white;">Todos</button>
                <div id="filtrosCategorias" style="display: flex; gap: 0.5rem; flex-wrap: wrap;"></div>
            </div>
            
            <!-- Formulario de producto (oculto inicialmente) -->
            <div id="formProducto" style="display: none; background: #f8f9fa; padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem;">
                <h3 id="formTitulo">📝 Nuevo Producto</h3>
                <div class="form-group">
                    <label>Categoría *</label>
                    <select id="prodCategoria" class="form-control" required>
                        <option value="">-- Seleccionar categoría --</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Nombre del producto *</label>
                    <input type="text" id="prodNombre" class="form-control" placeholder="Ej: Polea de Aluminio 4 pulgadas">
                </div>
                <div class="form-group">
                    <label>Descripción</label>
                    <textarea id="prodDescripcion" class="form-control" rows="2" placeholder="Descripción opcional"></textarea>
                </div>
                <div class="form-group">
                    <label>Precio de compra (costo) *</label>
                    <input type="number" id="prodPrecioCompra" class="form-control" step="0.01" placeholder="0.00">
                </div>
                <div class="form-group">
                    <label>Precio de venta *</label>
                    <input type="number" id="prodPrecioVenta" class="form-control" step="0.01" placeholder="0.00">
                </div>
                <div class="form-group">
                    <label>Stock inicial</label>
                    <input type="number" id="prodStock" class="form-control" value="0" step="0.01">
                </div>
                <div class="form-group">
                    <label>Unidad de medida</label>
                    <select id="prodUnidad" class="form-control">
                        <option value="pieza">Pieza / Unidad</option>
                        <option value="kg">Kilogramo (kg)</option>
                        <option value="g">Gramo (g)</option>
                        <option value="metro">Metro (m)</option>
                        <option value="litro">Litro (L)</option>
                        <option value="par">Par</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="prodRequiereMedidas">
                        📏 Requiere medidas personalizadas (ej: poleas a medida)
                    </label>
                </div>
                <div class="form-group" id="camposMedidas" style="display: none;">
                    <label>Campos de medida (separados por coma)</label>
                    <input type="text" id="prodCamposMedida" class="form-control" placeholder="Ej: Diámetro externo, Diámetro eje, Ancho de cara, Tipo de ranura">
                    <small class="text-muted">Estos campos aparecerán en el catálogo para que el cliente especifique las medidas</small>
                </div>
                <div class="form-group">
                    <label>Especificaciones técnicas (opcional)</label>
                    <input type="text" id="prodEspecificaciones" class="form-control" placeholder="Ej: Material: Aluminio, Acabado: Pulido">
                </div>
                <div class="button-group">
                    <button id="btnGuardarProducto" class="btn btn-primary">💾 Guardar</button>
                    <button id="btnCancelarProducto" class="btn btn-danger">❌ Cancelar</button>
                </div>
            </div>
            
            <!-- Tabla de productos -->
            <div id="listaProductos">
                <div class="loading">Cargando productos...</div>
            </div>
        </div>
    `;
    
    // Asignar eventos
    document.getElementById('btnAgregarProducto').onclick = mostrarFormularioNuevo;
    document.getElementById('btnGuardarProducto').onclick = guardarProducto;
    document.getElementById('btnCancelarProducto').onclick = ocultarFormulario;
    document.getElementById('btnGestionarCategorias').onclick = mostrarGestionCategorias;
    document.getElementById('filtroTodas').onclick = () => filtrarPorCategoria('todas');
    document.getElementById('prodRequiereMedidas').onchange = function() {
        document.getElementById('camposMedidas').style.display = this.checked ? 'block' : 'none';
    };
    
    // Cargar categorías y productos
    await cargarCategorias();
    await refrescarListaProductos();
}

// Cargar categorías para el selector y filtros
async function cargarCategorias() {
    try {
        const { data, error } = await db
            .from('categorias')
            .select('*')
            .order('nombre');
        
        if (error) throw error;
        categoriasData = data || [];
        
        // Llenar selector del formulario
        const selectCat = document.getElementById('prodCategoria');
        if (selectCat) {
            selectCat.innerHTML = '<option value="">-- Seleccionar categoría --</option>' +
                categoriasData.map(c => `<option value="${c.id}">${c.icono || '📁'} ${c.nombre}</option>`).join('');
        }
        
        // Llenar filtros de categoría
        const filtrosDiv = document.getElementById('filtrosCategorias');
        if (filtrosDiv) {
            filtrosDiv.innerHTML = categoriasData.map(c => `
                <button class="btn-filtro" data-cat="${c.id}" style="padding: 0.3rem 0.8rem; border-radius: 20px; border: 1px solid #ddd; cursor: pointer; background: white;">
                    ${c.icono || '📁'} ${c.nombre}
                </button>
            `).join('');
            
            document.querySelectorAll('#filtrosCategorias .btn-filtro').forEach(btn => {
                btn.onclick = () => filtrarPorCategoria(btn.dataset.cat);
            });
        }
        
    } catch (err) {
        console.error('Error cargando categorías:', err);
    }
}

// Filtrar productos por categoría
function filtrarPorCategoria(catId) {
    categoriaFiltro = catId;
    
    // Actualizar estilo de botones
    document.querySelectorAll('#filtroContainer .btn-filtro').forEach(btn => {
        btn.style.background = '#f0f0f0';
        btn.style.color = '#333';
    });
    if (catId === 'todas') {
        const btnTodas = document.getElementById('filtroTodas');
        if (btnTodas) {
            btnTodas.style.background = '#1a73e8';
            btnTodas.style.color = 'white';
        }
    } else {
        const btnActivo = document.querySelector(`#filtrosCategorias .btn-filtro[data-cat="${catId}"]`);
        if (btnActivo) {
            btnActivo.style.background = '#1a73e8';
            btnActivo.style.color = 'white';
        }
    }
    
    refrescarListaProductos();
}

// Mostrar formulario para nuevo producto
function mostrarFormularioNuevo() {
    productoEditando = null;
    document.getElementById('formTitulo').textContent = '📝 Nuevo Producto';
    document.getElementById('prodCategoria').value = '';
    document.getElementById('prodNombre').value = '';
    document.getElementById('prodDescripcion').value = '';
    document.getElementById('prodPrecioCompra').value = '';
    document.getElementById('prodPrecioVenta').value = '';
    document.getElementById('prodStock').value = '0';
    document.getElementById('prodUnidad').value = 'pieza';
    document.getElementById('prodRequiereMedidas').checked = false;
    document.getElementById('camposMedidas').style.display = 'none';
    document.getElementById('prodCamposMedida').value = '';
    document.getElementById('prodEspecificaciones').value = '';
    document.getElementById('formProducto').style.display = 'block';
    document.getElementById('prodNombre').focus();
}

// Mostrar formulario para editar
function editarProducto(producto) {
    productoEditando = producto;
    const espec = producto.especificaciones || {};
    
    document.getElementById('formTitulo').textContent = `✏️ Editando: ${producto.nombre}`;
    document.getElementById('prodCategoria').value = producto.categoria_id || '';
    document.getElementById('prodNombre').value = producto.nombre;
    document.getElementById('prodDescripcion').value = producto.descripcion || '';
    document.getElementById('prodPrecioCompra').value = producto.precio_compra;
    document.getElementById('prodPrecioVenta').value = producto.precio_venta;
    document.getElementById('prodStock').value = producto.stock_actual;
    document.getElementById('prodUnidad').value = producto.unidad_medida || 'pieza';
    document.getElementById('prodRequiereMedidas').checked = espec.requiere_medidas || false;
    document.getElementById('camposMedidas').style.display = espec.requiere_medidas ? 'block' : 'none';
    document.getElementById('prodCamposMedida').value = (espec.campos_medida || []).join(', ');
    document.getElementById('prodEspecificaciones').value = espec.medidas || '';
    document.getElementById('formProducto').style.display = 'block';
    document.getElementById('prodNombre').focus();
}

function ocultarFormulario() {
    document.getElementById('formProducto').style.display = 'none';
    productoEditando = null;
}

// Guardar producto (nuevo o edición)
async function guardarProducto() {
    const categoriaId = document.getElementById('prodCategoria').value;
    const nombre = document.getElementById('prodNombre').value.trim();
    const descripcion = document.getElementById('prodDescripcion').value.trim();
    const precioCompra = parseFloat(document.getElementById('prodPrecioCompra').value);
    const precioVenta = parseFloat(document.getElementById('prodPrecioVenta').value);
    const stock = parseFloat(document.getElementById('prodStock').value) || 0;
    const unidad = document.getElementById('prodUnidad').value;
    const requiereMedidas = document.getElementById('prodRequiereMedidas').checked;
    const camposMedida = document.getElementById('prodCamposMedida').value.split(',').map(c => c.trim()).filter(c => c);
    const especificacionesMedidas = document.getElementById('prodEspecificaciones').value;
    
    // Validaciones
    if (!categoriaId) {
        alert('⚠️ Selecciona una categoría');
        return;
    }
    if (!nombre) {
        alert('⚠️ El nombre del producto es obligatorio');
        return;
    }
    if (isNaN(precioCompra) || precioCompra < 0) {
        alert('⚠️ Ingresa un precio de compra válido');
        return;
    }
    if (isNaN(precioVenta) || precioVenta < 0) {
        alert('⚠️ Ingresa un precio de venta válido');
        return;
    }
    
    const productoData = {
        categoria_id: parseInt(categoriaId),
        nombre,
        descripcion: descripcion || null,
        precio_compra: precioCompra,
        precio_venta: precioVenta,
        stock_actual: stock,
        unidad_medida: unidad,
        especificaciones: {
            medidas: especificacionesMedidas,
            requiere_medidas: requiereMedidas,
            campos_medida: camposMedida
        },
        activo: true
    };
    
    try {
        if (productoEditando) {
            const { error } = await db
                .from('productos')
                .update(productoData)
                .eq('id', productoEditando.id);
            
            if (error) throw error;
            alert('✅ Producto actualizado correctamente');
        } else {
            const { error } = await db
                .from('productos')
                .insert([productoData]);
            
            if (error) throw error;
            alert('✅ Producto creado correctamente');
        }
        
        ocultarFormulario();
        await refrescarListaProductos();
        
    } catch (err) {
        console.error('Error guardando producto:', err);
        alert('❌ Error al guardar: ' + err.message);
    }
}

// Eliminar producto
async function eliminarProducto(id, nombre) {
    if (!confirm(`¿Eliminar el producto "${nombre}"?\nEsta acción no se puede deshacer.`)) return;
    
    try {
        const { error } = await db
            .from('productos')
            .update({ activo: false })
            .eq('id', id);
        
        if (error) throw error;
        alert('✅ Producto eliminado');
        await refrescarListaProductos();
        
    } catch (err) {
        console.error('Error eliminando producto:', err);
        alert('❌ Error al eliminar: ' + err.message);
    }
}

// Actualizar stock rápidamente
async function actualizarStock(id, nuevoStock) {
    if (nuevoStock < 0) {
        alert('⚠️ El stock no puede ser negativo');
        return;
    }
    
    try {
        const { error } = await db
            .from('productos')
            .update({ stock_actual: nuevoStock })
            .eq('id', id);
        
        if (error) throw error;
        await refrescarListaProductos();
        
    } catch (err) {
        console.error('Error actualizando stock:', err);
        alert('❌ Error al actualizar stock: ' + err.message);
    }
}

// Gestión de categorías (modal simple)
function mostrarGestionCategorias() {
    let html = `
        <div id="modalCategorias" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 2000;">
            <div style="background: white; padding: 2rem; border-radius: 12px; width: 90%; max-width: 500px;">
                <h3>🏷️ Gestionar Categorías</h3>
                <div id="listaCategoriasModal">
                    <div class="loading">Cargando...</div>
                </div>
                <div class="form-group" style="margin-top: 1rem;">
                    <label>Nueva categoría</label>
                    <div style="display: flex; gap: 0.5rem;">
                        <input type="text" id="nuevaCategoriaNombre" class="form-control" placeholder="Ej: Poleas">
                        <input type="text" id="nuevaCategoriaIcono" class="form-control" placeholder="Icono" style="width: 60px;" value="📁">
                        <button id="btnAgregarCategoria" class="btn btn-success">➕</button>
                    </div>
                </div>
                <div style="margin-top: 1rem; text-align: right;">
                    <button id="btnCerrarCategorias" class="btn btn-secondary">Cerrar</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', html);
    
    cargarCategoriasModal();
    
    document.getElementById('btnAgregarCategoria').onclick = agregarCategoria;
    document.getElementById('btnCerrarCategorias').onclick = () => {
        document.getElementById('modalCategorias').remove();
    };
}

async function cargarCategoriasModal() {
    const container = document.getElementById('listaCategoriasModal');
    
    try {
        const { data, error } = await db
            .from('categorias')
            .select('*')
            .order('nombre');
        
        if (error) throw error;
        
        if (data.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay categorías creadas</p>';
            return;
        }
        
        container.innerHTML = `
            <div style="max-height: 300px; overflow-y: auto;">
                ${data.map(c => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; border-bottom: 1px solid #eee;">
                        <span>${c.icono || '📁'} ${c.nombre}</span>
                        <button class="btn btn-danger" style="padding: 0.2rem 0.5rem;" onclick="eliminarCategoria(${c.id}, '${c.nombre}')">🗑️</button>
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
    const icono = document.getElementById('nuevaCategoriaIcono').value.trim() || '📁';
    
    if (!nombre) {
        alert('Ingresa el nombre de la categoría');
        return;
    }
    
    try {
        const { error } = await db
            .from('categorias')
            .insert([{ nombre, icono }]);
        
        if (error) throw error;
        
        alert('✅ Categoría creada');
        document.getElementById('nuevaCategoriaNombre').value = '';
        await cargarCategoriasModal();
        await cargarCategorias(); // Recargar en el formulario principal
        await refrescarListaProductos();
        
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

async function eliminarCategoria(id, nombre) {
    if (!confirm(`¿Eliminar la categoría "${nombre}"?\nLos productos quedarán sin categoría.`)) return;
    
    try {
        // Actualizar productos a categoría null
        await db.from('productos').update({ categoria_id: null }).eq('categoria_id', id);
        
        // Eliminar categoría
        const { error } = await db.from('categorias').delete().eq('id', id);
        if (error) throw error;
        
        alert('✅ Categoría eliminada');
        await cargarCategoriasModal();
        await cargarCategorias();
        await refrescarListaProductos();
        
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// Refrescar lista de productos
async function refrescarListaProductos() {
    const listaDiv = document.getElementById('listaProductos');
    listaDiv.innerHTML = '<div class="loading">Cargando...</div>';
    
    try {
        let query = db
            .from('productos')
            .select('*, categorias(nombre, icono)')
            .eq('activo', true);
        
        if (categoriaFiltro !== 'todas') {
            query = query.eq('categoria_id', parseInt(categoriaFiltro));
        }
        
        const { data, error } = await query.order('nombre');
        
        if (error) throw error;
        
        productosData = data || [];
        
        if (productosData.length === 0) {
            listaDiv.innerHTML = `
                <div class="alert alert-info" style="text-align: center;">
                    No hay productos registrados. Haz clic en "➕ Nuevo Producto" para comenzar.
                </div>
            `;
            return;
        }
        
        let html = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Categoría</th>
                            <th>Producto</th>
                            <th>Stock</th>
                            <th>P. Compra</th>
                            <th>P. Venta</th>
                            <th>Ganancia</th>
                            <th>Medidas</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        productosData.forEach(p => {
            const ganancia = p.precio_venta - p.precio_compra;
            const gananciaPorcentaje = p.precio_compra > 0 ? (ganancia / p.precio_compra * 100).toFixed(1) : 0;
            const requiereMedidas = p.especificaciones?.requiere_medidas ? '📏 Sí' : '❌ No';
            
            html += `
                <tr>
                    <td>${p.id}</td>
                    <td><span class="badge">${p.categorias?.icono || '📁'} ${p.categorias?.nombre || 'Sin categoría'}</span></td>
                    <td><strong>${p.nombre}</strong><br><small style="color:#666;">${p.descripcion || ''}</small></td>
                    <td style="min-width: 100px;">
                        <div style="display: flex; gap: 5px; align-items: center;">
                            <span style="font-weight: bold; font-size: 1.1rem;">${p.stock_actual}</span>
                            <button class="btn" style="padding: 2px 6px; background: #28a745;" onclick="actualizarStock(${p.id}, ${p.stock_actual + 1})">+</button>
                            <button class="btn" style="padding: 2px 6px; background: #dc3545;" onclick="if(${p.stock_actual} > 0) actualizarStock(${p.id}, ${p.stock_actual - 1})">-</button>
                            <button class="btn" style="padding: 2px 6px; background: #17a2b8;" onclick="let nuevo=prompt('Nuevo stock:', ${p.stock_actual}); if(nuevo!==null) actualizarStock(${p.id}, parseFloat(nuevo));">✏️</button>
                        </div>
                    </td>
                    <td>$${p.precio_compra.toFixed(2)}</td>
                    <td>$${p.precio_venta.toFixed(2)}</td>
                    <td>
                        <span style="color: ${ganancia >= 0 ? '#28a745' : '#dc3545'};">
                            $${ganancia.toFixed(2)}<br>
                            <small>(${gananciaPorcentaje}%)</small>
                        </span>
                    </td>
                    <td>${requiereMedidas}</td>
                    <td style="min-width: 100px;">
                        <div style="display: flex; gap: 5px;">
                            <button class="btn" style="background: #ffc107; color: #333;" onclick='editarProducto(${JSON.stringify(p).replace(/'/g, "&apos;")})'>✏️</button>
                            <button class="btn btn-danger" onclick="eliminarProducto(${p.id}, '${p.nombre}')">🗑️</button>
                        </div>
                     </td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
            <div style="margin-top: 1rem; padding: 0.75rem; background: #e7f3ff; border-radius: 8px; text-align: center;">
                <small>📊 Total de productos: ${productosData.length} | Stock total: ${productosData.reduce((sum, p) => sum + p.stock_actual, 0)} unidades</small>
            </div>
        `;
        
        listaDiv.innerHTML = html;
        
    } catch (err) {
        console.error('Error cargando productos:', err);
        listaDiv.innerHTML = `<div class="alert alert-danger">Error al cargar productos: ${err.message}</div>`;
    }
}
