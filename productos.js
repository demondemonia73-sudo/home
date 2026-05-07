// ============================================
// MÓDULO DE PRODUCTOS (INVENTARIO)
// ============================================

// Variables globales del módulo
let productosData = [];
let productoEditando = null;

// Cargar productos al entrar al módulo
async function cargarProductos() {
    if (!verificarSesion()) return;
    
    const tabsContent = document.getElementById('tabsContent');
    tabsContent.innerHTML = `
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
                <h2 style="margin: 0;">🛒 Gestión de Productos</h2>
                <button id="btnAgregarProducto" class="btn btn-success">➕ Nuevo Producto</button>
            </div>
            
            <!-- Formulario de producto (oculto inicialmente) -->
            <div id="formProducto" style="display: none; background: #f8f9fa; padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem;">
                <h3 id="formTitulo">📝 Nuevo Producto</h3>
                <div class="form-group">
                    <label>Nombre del producto *</label>
                    <input type="text" id="prodNombre" class="form-control" placeholder="Ej: Lingote de Aluminio">
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
                    <label>Especificaciones técnicas (opcional)</label>
                    <input type="text" id="prodEspecificaciones" class="form-control" placeholder="Ej: Diámetro: 10cm, Peso: 2kg">
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
    
    // Cargar datos
    await refrescarListaProductos();
}

// Mostrar formulario para nuevo producto
function mostrarFormularioNuevo() {
    productoEditando = null;
    document.getElementById('formTitulo').textContent = '📝 Nuevo Producto';
    document.getElementById('prodNombre').value = '';
    document.getElementById('prodDescripcion').value = '';
    document.getElementById('prodPrecioCompra').value = '';
    document.getElementById('prodPrecioVenta').value = '';
    document.getElementById('prodStock').value = '0';
    document.getElementById('prodUnidad').value = 'pieza';
    document.getElementById('prodEspecificaciones').value = '';
    document.getElementById('formProducto').style.display = 'block';
    document.getElementById('prodNombre').focus();
}

// Mostrar formulario para editar
function editarProducto(producto) {
    productoEditando = producto;
    document.getElementById('formTitulo').textContent = `✏️ Editando: ${producto.nombre}`;
    document.getElementById('prodNombre').value = producto.nombre;
    document.getElementById('prodDescripcion').value = producto.descripcion || '';
    document.getElementById('prodPrecioCompra').value = producto.precio_compra;
    document.getElementById('prodPrecioVenta').value = producto.precio_venta;
    document.getElementById('prodStock').value = producto.stock_actual;
    document.getElementById('prodUnidad').value = producto.unidad_medida || 'pieza';
    document.getElementById('prodEspecificaciones').value = producto.especificaciones?.medidas || '';
    document.getElementById('formProducto').style.display = 'block';
    document.getElementById('prodNombre').focus();
}

function ocultarFormulario() {
    document.getElementById('formProducto').style.display = 'none';
    productoEditando = null;
}

// Guardar producto (nuevo o edición)
async function guardarProducto() {
    const nombre = document.getElementById('prodNombre').value.trim();
    const descripcion = document.getElementById('prodDescripcion').value.trim();
    const precioCompra = parseFloat(document.getElementById('prodPrecioCompra').value);
    const precioVenta = parseFloat(document.getElementById('prodPrecioVenta').value);
    const stock = parseFloat(document.getElementById('prodStock').value) || 0;
    const unidad = document.getElementById('prodUnidad').value;
    const especificaciones = { medidas: document.getElementById('prodEspecificaciones').value };
    
    // Validaciones
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
        nombre,
        descripcion: descripcion || null,
        precio_compra: precioCompra,
        precio_venta: precioVenta,
        stock_actual: stock,
        unidad_medida: unidad,
        especificaciones,
        activo: true
    };
    
    try {
        if (productoEditando) {
            // Actualizar
            const { error } = await db
                .from('productos')
                .update(productoData)
                .eq('id', productoEditando.id);
            
            if (error) throw error;
            alert('✅ Producto actualizado correctamente');
        } else {
            // Crear nuevo
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

// Refrescar lista de productos
async function refrescarListaProductos() {
    const listaDiv = document.getElementById('listaProductos');
    listaDiv.innerHTML = '<div class="loading">Cargando...</div>';
    
    try {
        const { data, error } = await db
            .from('productos')
            .select('*')
            .eq('activo', true)
            .order('nombre');
        
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
        
        // Generar tabla
        let html = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Producto</th>
                            <th>Stock</th>
                            <th>P. Compra</th>
                            <th>P. Venta</th>
                            <th>Ganancia</th>
                            <th>Unidad</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        productosData.forEach(p => {
            const ganancia = p.precio_venta - p.precio_compra;
            const gananciaPorcentaje = p.precio_compra > 0 ? (ganancia / p.precio_compra * 100).toFixed(1) : 0;
            
            html += `
                <tr>
                    <td>${p.id}</td>
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
                    <td>${p.unidad_medida || 'pieza'}</td>
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
