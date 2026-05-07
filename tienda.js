// ============================================
// MÓDULO DE TIENDA (CATÁLOGO PÚBLICO)
// ============================================

let catalogoProductos = [];
let categoriasLista = [];
let carrito = [];
let filtroActual = 'todas';

// Cargar datos al iniciar
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🛒 Iniciando catálogo de productos');
    await cargarCategorias();
    await cargarProductosTienda();
    
    document.getElementById('btnRealizarPedido').onclick = realizarPedido;
});

async function cargarCategorias() {
    try {
        const { data, error } = await db
            .from('categorias')
            .select('*')
            .order('nombre');
        
        if (error) throw error;
        categoriasLista = data || [];
        
        // Mostrar filtros
        const filtrosContainer = document.getElementById('filtrosContainer');
        filtrosContainer.innerHTML = `
            <div class="filtro-categoria ${filtroActual === 'todas' ? 'active' : ''}" data-cat="todas">📋 Todos</div>
            ${categoriasLista.map(c => `
                <div class="filtro-categoria ${filtroActual === c.id ? 'active' : ''}" data-cat="${c.id}">${c.icono || '📁'} ${c.nombre}</div>
            `).join('')}
        `;
        
        document.querySelectorAll('.filtro-categoria').forEach(el => {
            el.onclick = () => {
                filtroActual = el.dataset.cat;
                document.querySelectorAll('.filtro-categoria').forEach(f => f.classList.remove('active'));
                el.classList.add('active');
                cargarProductosTienda();
            };
        });
        
    } catch (err) {
        console.error('Error cargando categorías:', err);
    }
}

async function cargarProductosTienda() {
    const container = document.getElementById('catalogoContainer');
    container.innerHTML = '<div class="loading">Cargando productos...</div>';
    
    try {
        let query = db.from('productos').select('*').eq('activo', true);
        
        if (filtroActual !== 'todas') {
            query = query.eq('categoria_id', parseInt(filtroActual));
        }
        
        const { data, error } = await query.order('nombre');
        
        if (error) throw error;
        catalogoProductos = data || [];
        
        if (catalogoProductos.length === 0) {
            container.innerHTML = '<div class="card" style="text-align: center;">No hay productos disponibles en esta categoría.</div>';
            return;
        }
        
        container.innerHTML = catalogoProductos.map(p => renderProducto(p)).join('');
        
        // Asignar eventos después de renderizar
        catalogoProductos.forEach(p => {
            const btn = document.getElementById(`add-${p.id}`);
            if (btn) btn.onclick = () => agregarAlCarrito(p);
            
            // Para productos con medidas personalizadas
            const btnMedidas = document.getElementById(`add-medidas-${p.id}`);
            if (btnMedidas) btnMedidas.onclick = () => agregarAlCarritoConMedidas(p);
        });
        
    } catch (err) {
        console.error('Error cargando productos:', err);
        container.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
    }
}

function renderProducto(producto) {
    const espec = producto.especificaciones || {};
    const requiereMedidas = producto.requiere_medidas || false;
    
    let medidasHtml = '';
    if (requiereMedidas) {
        medidasHtml = `
            <div class="medidas-especiales">
                <small>📏 Producto a medida</small>
                <div class="medidas-input">
                    <input type="text" id="medida-${producto.id}" placeholder="Especificaciones (ej: 4 pulgadas, eje 12mm)" style="flex:2;">
                    <button id="add-medidas-${producto.id}" class="btn" style="background: #28a745; padding: 0.3rem 0.5rem;">➕</button>
                </div>
            </div>
        `;
    }
    
    const stockText = producto.stock_actual > 0 
        ? `<span class="producto-stock">📦 Stock: ${producto.stock_actual} ${producto.unidad_medida || 'uds'}</span>`
        : `<span class="producto-stock" style="color: red;">❌ Agotado</span>`;
    
    return `
        <div class="producto-tarjeta">
            <h4>${producto.nombre}</h4>
            <p style="font-size: 0.85rem; color: #666;">${producto.descripcion || ''}</p>
            ${medidasHtml}
            <div class="producto-precio">$${producto.precio_venta.toFixed(2)}</div>
            ${stockText}
            <button id="add-${producto.id}" class="btn-carrito" ${producto.stock_actual <= 0 ? 'disabled' : ''}>
                🛒 Agregar al pedido
            </button>
        </div>
    `;
}

function agregarAlCarrito(producto, cantidad = 1, especificaciones = null) {
    const itemExistente = carrito.find(i => i.id === producto.id && JSON.stringify(i.especificaciones) === JSON.stringify(especificaciones));
    
    if (itemExistente) {
        itemExistente.cantidad += cantidad;
    } else {
        carrito.push({
            id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio_venta,
            cantidad: cantidad,
            especificaciones: especificaciones,
            unidad: producto.unidad_medida
        });
    }
    
    actualizarCarrito();
}

function agregarAlCarritoConMedidas(producto) {
    const input = document.getElementById(`medida-${producto.id}`);
    const especificaciones = input ? input.value.trim() : null;
    
    if (!especificaciones) {
        alert('⚠️ Por favor, ingresa las medidas o especificaciones del producto');
        return;
    }
    
    agregarAlCarrito(producto, 1, { medidas: especificaciones });
    input.value = '';
}

function actualizarCarrito() {
    const container = document.getElementById('carritoItems');
    const totalDiv = document.getElementById('carritoTotal');
    
    if (carrito.length === 0) {
        container.innerHTML = '<p class="text-muted">No hay productos agregados</p>';
        totalDiv.innerHTML = 'Total: $0.00';
        return;
    }
    
    let total = 0;
    container.innerHTML = carrito.map((item, idx) => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        
        let especHtml = '';
        if (item.especificaciones) {
            if (item.especificaciones.medidas) {
                especHtml = `<small style="color:#666;">📏 ${item.especificaciones.medidas}</small><br>`;
            }
        }
        
        return `
            <div class="carrito-item">
                <div>
                    <strong>${item.nombre}</strong><br>
                    ${especHtml}
                    <small>$${item.precio.toFixed(2)} c/u</small>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <button class="btn" style="background: #dc3545; padding: 0.2rem 0.5rem;" onclick="cambiarCantidad(${idx}, ${item.cantidad - 1})">-</button>
                    <span>${item.cantidad}</span>
                    <button class="btn" style="background: #28a745; padding: 0.2rem 0.5rem;" onclick="cambiarCantidad(${idx}, ${item.cantidad + 1})">+</button>
                    <button class="btn" style="background: #6c757d; padding: 0.2rem 0.5rem;" onclick="eliminarDelCarrito(${idx})">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
    
    totalDiv.innerHTML = `Total: $${total.toFixed(2)}`;
}

function cambiarCantidad(idx, nuevaCantidad) {
    if (nuevaCantidad <= 0) {
        eliminarDelCarrito(idx);
    } else {
        carrito[idx].cantidad = nuevaCantidad;
        actualizarCarrito();
    }
}

function eliminarDelCarrito(idx) {
    carrito.splice(idx, 1);
    actualizarCarrito();
}

async function realizarPedido() {
    const nombre = document.getElementById('nombreCliente').value.trim();
    const telefono = document.getElementById('telefonoCliente').value.trim();
    const direccion = document.getElementById('direccionCliente').value.trim();
    const notas = document.getElementById('notasPedido').value.trim();
    
    if (!nombre || !telefono) {
        alert('⚠️ Por favor, ingresa el nombre y teléfono de contacto');
        return;
    }
    
    if (carrito.length === 0) {
        alert('⚠️ No hay productos en el pedido');
        return;
    }
    
    const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    
    // Verificar disponibilidad de stock
    for (const item of carrito) {
        const producto = catalogoProductos.find(p => p.id === item.id);
        if (producto && producto.stock_actual < item.cantidad) {
            alert(`❌ Stock insuficiente para "${item.nombre}". Disponible: ${producto.stock_actual}`);
            return;
        }
    }
    
    if (!confirm(`¿Confirmar pedido por $${total.toFixed(2)}?\n\nCliente: ${nombre}\nTeléfono: ${telefono}\nProductos: ${carrito.length} ítems`)) {
        return;
    }
    
    try {
        // 1. Crear o obtener cliente
        let clienteId = await buscarOCrearCliente(nombre, telefono, direccion);
        
        // 2. Generar código de pedido
        const codigo = `PED-${Date.now().toString().slice(-6)}`;
        
        // 3. Crear pedido
        const { data: pedido, error: pedidoError } = await db
            .from('pedidos')
            .insert([{
                codigo: codigo,
                cliente_id: clienteId,
                estado: 'pendiente',
                total: total,
                adelanto_monto: 0,
                adelanto_confirmado: false
            }])
            .select();
        
        if (pedidoError) throw pedidoError;
        
        const pedidoId = pedido[0].id;
        
        // 4. Crear detalles del pedido
        for (const item of carrito) {
            const espec = item.especificaciones ? JSON.stringify(item.especificaciones) : null;
            
            await db.from('detalle_pedido').insert([{
                pedido_id: pedidoId,
                tipo: 'producto',
                producto_id: item.id,
                descripcion: item.nombre + (item.especificaciones?.medidas ? ` (${item.especificaciones.medidas})` : ''),
                cantidad: item.cantidad,
                precio_unitario: item.precio,
                subtotal: item.precio * item.cantidad,
                especificaciones: espec
            }]);
        }
        
        alert(`✅ ¡Pedido realizado con éxito!\n\nCódigo de seguimiento: ${codigo}\n\nGuarda este código para consultar el estado de tu pedido.`);
        
        // Limpiar carrito
        carrito = [];
        actualizarCarrito();
        document.getElementById('nombreCliente').value = '';
        document.getElementById('telefonoCliente').value = '';
        document.getElementById('direccionCliente').value = '';
        document.getElementById('notasPedido').value = '';
        
    } catch (err) {
        console.error('Error al crear pedido:', err);
        alert('❌ Error al procesar el pedido: ' + err.message);
    }
}

async function buscarOCrearCliente(nombre, telefono, direccion) {
    // Buscar cliente existente
    const { data: existente } = await db
        .from('clientes')
        .select('id')
        .eq('telefono', telefono)
        .maybeSingle();
    
    if (existente) return existente.id;
    
    // Crear nuevo cliente
    const { data: nuevo, error } = await db
        .from('clientes')
        .insert([{
            nombre: nombre,
            telefono: telefono,
            direccion: direccion || null,
            es_frecuente: false
        }])
        .select();
    
    if (error) throw error;
    return nuevo[0].id;
}
