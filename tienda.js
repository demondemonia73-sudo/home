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
    
    // Verificar que db existe
    if (typeof db === 'undefined') {
        console.error('❌ db no está definido. Revisa que config.js se cargue primero.');
        document.getElementById('catalogoContainer').innerHTML = '<div class="alert alert-danger">Error de conexión: No se pudo conectar con la base de datos.</div>';
        return;
    }
    
    await cargarCategorias();
    await cargarProductosTienda();
    
    const btnRealizar = document.getElementById('btnRealizarPedido');
    if (btnRealizar) btnRealizar.onclick = realizarPedido;
});

async function cargarCategorias() {
    try {
        console.log('Cargando categorías...');
        const { data, error } = await db
            .from('categorias')
            .select('*')
            .order('nombre');
        
        if (error) {
            console.error('Error en categorías:', error);
            return;
        }
        
        categoriasLista = data || [];
        console.log('Categorías cargadas:', categoriasLista.length);
        
        const filtrosContainer = document.getElementById('filtrosContainer');
        if (!filtrosContainer) return;
        
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
    if (!container) return;
    container.innerHTML = '<div class="loading">Cargando productos...</div>';
    
    try {
        console.log('Cargando productos, filtro:', filtroActual);
        
        let query = db.from('productos').select('*, categorias(nombre, icono)').eq('activo', true);
        
        if (filtroActual !== 'todas') {
            query = query.eq('categoria_id', parseInt(filtroActual));
        }
        
        const { data, error } = await query.order('nombre');
        
        if (error) {
            console.error('Error en productos:', error);
            container.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
            return;
        }
        
        catalogoProductos = data || [];
        console.log('Productos cargados:', catalogoProductos.length);
        
        if (catalogoProductos.length === 0) {
            container.innerHTML = '<div class="card" style="text-align: center;">No hay productos disponibles en esta categoría.<br><br>⚠️ Verifica que los productos existan en la base de datos.</div>';
            return;
        }
        
        container.innerHTML = catalogoProductos.map(p => renderProducto(p)).join('');
        
        catalogoProductos.forEach(p => {
            const btn = document.getElementById(`add-${p.id}`);
            if (btn) btn.onclick = () => agregarAlCarrito(p);
            
            const btnMedidas = document.getElementById(`add-medidas-${p.id}`);
            if (btnMedidas) btnMedidas.onclick = () => agregarAlCarritoConMedidas(p);
        });
        
    } catch (err) {
        console.error('Error cargando productos:', err);
        container.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
    }
}

function obtenerPlaceholderEjemplo(campo) {
    const ejemplos = {
        'Diámetro (pulgadas)': '4"',
        'Diámetro (pulgadas o cm)': '4 pulgadas o 10cm',
        'Diámetro del eje (mm)': '24mm, 28mm, 16mm',
        'Número de canales': '1, 2, 3',
        'Tipo de correa (A/B/3V/5V)': 'A, B, 3V, 5V',
        'Medidas especiales': 'Especificar...',
        'Material (Aluminio/Acero)': 'Aluminio o Acero',
        'Medidas (mm)': '50x30x20',
        'Material': 'Aluminio / Acero / Bronce',
        'Acabado': 'Pulido / Pintado',
        'Peso aprox (kg)': '2.5 kg',
        'Complejidad (baja/media/alta)': 'media',
        'Cantidad': '5',
        'Ancho (m)': '2.5 m',
        'Alto (m)': '1.8 m'
    };
    return ejemplos[campo] || 'Ingrese valor';
}

function renderProducto(producto) {
    const espec = producto.especificaciones || {};
    const requiereMedidas = espec.requiere_medidas || false;
    const camposMedida = espec.campos_medida || [];
    const categoriaId = producto.categoria_id;
    
    let medidasHtml = '';
    
    // Caso 1: Producto con campos de medida específicos
    if (requiereMedidas && camposMedida.length > 0) {
        let camposHtml = camposMedida.map(campo => `
            <div style="margin-bottom: 8px;">
                <label style="font-size: 0.8rem; font-weight: 500; display: block;">${campo}</label>
                <input type="text" id="medida-${producto.id}-${campo.replace(/\s/g, '')}" 
                       class="medida-input" 
                       placeholder="Ej: ${obtenerPlaceholderEjemplo(campo)}" 
                       style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 0.8rem;">
            </div>
        `).join('');
        
        medidasHtml = `
            <div class="medidas-especiales" style="background: #fff3cd; padding: 10px; border-radius: 8px; margin: 10px 0;">
                <small style="font-weight: bold;">📏 Especificaciones requeridas:</small>
                <div style="margin-top: 8px;">
                    ${camposHtml}
                </div>
                <button id="add-medidas-${producto.id}" class="btn" style="background: #28a745; padding: 6px 12px; margin-top: 10px; width: 100%;">✓ Agregar con estas medidas</button>
            </div>
        `;
    } 
    // Caso 2: Metales - Peso en kg
    else if (categoriaId === 2 && producto.unidad_medida === 'kg') {
        medidasHtml = `
            <div class="medidas-especiales" style="background: #e7f3ff; padding: 10px; border-radius: 8px; margin: 10px 0;">
                <label style="font-weight: bold;">⚖️ Peso (kilogramos)</label>
                <div style="display: flex; gap: 8px; margin-top: 5px;">
                    <input type="number" id="medida-${producto.id}" step="0.1" min="0.1" placeholder="Ej: 2.5" style="flex: 2; padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
                    <button id="add-medidas-${producto.id}" class="btn" style="background: #28a745; padding: 6px 15px;">✓ Aplicar</button>
                </div>
            </div>
        `;
    }
    
    const precio = producto.precio_venta;
    const categoriaIcono = producto.categorias?.icono || '📁';
    const categoriaNombre = producto.categorias?.nombre || 'Sin categoría';
    
    const stockText = (producto.stock_actual > 0 && producto.stock_actual < 999)
        ? `<span class="producto-stock">📦 Stock: ${producto.stock_actual} ${producto.unidad_medida || 'uds'}</span>`
        : `<span class="producto-stock" style="color: #28a745;">✅ Siempre disponible</span>`;
    
    return `
        <div class="producto-tarjeta" style="background: white; border-radius: 12px; padding: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span class="badge" style="background: #e0e0e0; padding: 3px 8px; border-radius: 12px; font-size: 0.7rem;">${categoriaIcono} ${categoriaNombre}</span>
            </div>
            <h4 style="margin: 5px 0; font-size: 1rem;">${producto.nombre}</h4>
            <p style="font-size: 0.8rem; color: #666; margin-bottom: 8px;">${producto.descripcion || ''}</p>
            ${medidasHtml}
            <div class="producto-precio" style="font-size: 1.3rem; font-weight: bold; color: #28a745; margin: 8px 0;">
                Bs ${precio.toFixed(2)}
            </div>
            ${stockText}
            <button id="add-${producto.id}" class="btn-carrito" style="background: #1a73e8; color: white; border: none; padding: 8px; border-radius: 6px; width: 100%; margin-top: 8px; cursor: pointer;" ${producto.stock_actual <= 0 ? 'disabled' : ''}>
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
    alert(`✅ "${producto.nombre}" agregado al carrito`);
}

function agregarAlCarritoConMedidas(producto) {
    const espec = producto.especificaciones || {};
    const camposMedida = espec.campos_medida || [];
    const categoriaId = producto.categoria_id;
    let especificaciones = null;
    let cantidad = 1;
    
    // Caso 1: Producto con campos de medida específicos (poleas)
    if (camposMedida.length > 0) {
        const medidas = {};
        let todasCompletas = true;
        
        camposMedida.forEach(campo => {
            const inputId = `medida-${producto.id}-${campo.replace(/\s/g, '')}`;
            const input = document.getElementById(inputId);
            if (input && input.value.trim()) {
                medidas[campo] = input.value.trim();
            } else {
                todasCompletas = false;
            }
        });
        
        if (!todasCompletas || Object.keys(medidas).length === 0) {
            alert('⚠️ Por favor, completa todas las medidas del producto');
            return;
        }
        especificaciones = { medidas: medidas };
    }
    // Caso 2: Metales - Peso en kg
    else if (categoriaId === 2 && producto.unidad_medida === 'kg') {
        const input = document.getElementById(`medida-${producto.id}`);
        const peso = parseFloat(input?.value);
        
        if (!peso || peso <= 0) {
            alert('⚠️ Ingresa un peso válido en kilogramos');
            return;
        }
        cantidad = peso;
        especificaciones = { peso_kg: peso };
    }
    // Caso 3: Producto normal
    else {
        const input = document.getElementById(`medida-${producto.id}`);
        const medida = input ? input.value.trim() : null;
        if (medida) {
            especificaciones = { especificacion: medida };
        }
    }
    
    agregarAlCarrito(producto, cantidad, especificaciones);
    
    // Limpiar campos
    if (camposMedida.length > 0) {
        camposMedida.forEach(campo => {
            const input = document.getElementById(`medida-${producto.id}-${campo.replace(/\s/g, '')}`);
            if (input) input.value = '';
        });
    } else {
        const input = document.getElementById(`medida-${producto.id}`);
        if (input) input.value = '';
    }
}

function actualizarCarrito() {
    const container = document.getElementById('carritoItems');
    const totalDiv = document.getElementById('carritoTotal');
    
    if (!container || !totalDiv) return;
    
    if (carrito.length === 0) {
        container.innerHTML = '<p class="text-muted">No hay productos agregados</p>';
        totalDiv.innerHTML = 'Total: Bs 0.00';
        return;
    }
    
    let total = 0;
    container.innerHTML = carrito.map((item, idx) => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        
        let especHtml = '';
        if (item.especificaciones) {
            if (item.especificaciones.medidas) {
                const medidasObj = item.especificaciones.medidas;
                if (typeof medidasObj === 'object') {
                    const medidasList = Object.entries(medidasObj).map(([k, v]) => `${k}: ${v}`).join(', ');
                    especHtml = `<small style="color:#666;">📏 ${medidasList}</small><br>`;
                } else {
                    especHtml = `<small style="color:#666;">📏 ${medidasObj}</small><br>`;
                }
            } else if (item.especificaciones.peso_kg) {
                especHtml = `<small style="color:#666;">⚖️ ${item.especificaciones.peso_kg} kg</small><br>`;
            } else if (item.especificaciones.especificacion) {
                especHtml = `<small style="color:#666;">📝 ${item.especificaciones.especificacion}</small><br>`;
            }
        }
        
        const cantidadStr = (item.cantidad % 1 !== 0) ? item.cantidad.toFixed(2) : item.cantidad;
        
        return `
            <div class="carrito-item">
                <div style="flex: 2;">
                    <strong>${item.nombre}</strong><br>
                    ${especHtml}
                    <small>Bs ${item.precio.toFixed(2)} c/u</small>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <button class="btn" style="background: #dc3545; padding: 0.2rem 0.5rem;" onclick="cambiarCantidad(${idx}, ${item.cantidad - 1})">-</button>
                    <span style="min-width: 35px; text-align: center;">${cantidadStr}</span>
                    <button class="btn" style="background: #28a745; padding: 0.2rem 0.5rem;" onclick="cambiarCantidad(${idx}, ${item.cantidad + 1})">+</button>
                    <button class="btn" style="background: #6c757d; padding: 0.2rem 0.5rem;" onclick="eliminarDelCarrito(${idx})">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
    
    totalDiv.innerHTML = `Total: Bs ${total.toFixed(2)}`;
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
    const nombre = document.getElementById('nombreCliente')?.value.trim();
    const telefono = document.getElementById('telefonoCliente')?.value.trim();
    const direccion = document.getElementById('direccionCliente')?.value.trim();
    const notas = document.getElementById('notasPedido')?.value.trim();
    
    if (!nombre || !telefono) {
        alert('⚠️ Por favor, ingresa el nombre y teléfono de contacto');
        return;
    }
    
    if (carrito.length === 0) {
        alert('⚠️ No hay productos en el pedido');
        return;
    }
    
    const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    
    if (!confirm(`¿Confirmar pedido por Bs ${total.toFixed(2)}?\n\nCliente: ${nombre}\nTeléfono: ${telefono}\nProductos: ${carrito.length} ítems`)) {
        return;
    }
    
    try {
        let clienteId = await buscarOCrearCliente(nombre, telefono, direccion);
        const codigo = `PED-${Date.now().toString().slice(-6)}`;
        
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
        
        for (const item of carrito) {
            const espec = item.especificaciones ? JSON.stringify(item.especificaciones) : null;
            let descripcionExtra = '';
            
            if (item.especificaciones) {
                if (item.especificaciones.medidas) {
                    if (typeof item.especificaciones.medidas === 'object') {
                        const medidasStr = Object.entries(item.especificaciones.medidas).map(([k, v]) => `${k}: ${v}`).join(', ');
                        descripcionExtra = ` (${medidasStr})`;
                    } else {
                        descripcionExtra = ` (${item.especificaciones.medidas})`;
                    }
                } else if (item.especificaciones.peso_kg) {
                    descripcionExtra = ` (${item.especificaciones.peso_kg} kg)`;
                } else if (item.especificaciones.especificacion) {
                    descripcionExtra = ` (${item.especificaciones.especificacion})`;
                }
            }
            
            await db.from('detalle_pedido').insert([{
                pedido_id: pedidoId,
                tipo: 'producto',
                producto_id: item.id,
                descripcion: item.nombre + descripcionExtra,
                cantidad: item.cantidad,
                precio_unitario: item.precio,
                subtotal: item.precio * item.cantidad,
                especificaciones: espec
            }]);
        }
        
        alert(`✅ ¡Pedido realizado con éxito!\n\n📋 Código de seguimiento: ${codigo}\n\nGuarda este código para consultar el estado de tu pedido.`);
        
        carrito = [];
        actualizarCarrito();
        if (document.getElementById('nombreCliente')) document.getElementById('nombreCliente').value = '';
        if (document.getElementById('telefonoCliente')) document.getElementById('telefonoCliente').value = '';
        if (document.getElementById('direccionCliente')) document.getElementById('direccionCliente').value = '';
        if (document.getElementById('notasPedido')) document.getElementById('notasPedido').value = '';
        
    } catch (err) {
        console.error('Error al crear pedido:', err);
        alert('❌ Error al procesar el pedido: ' + err.message);
    }
}

async function buscarOCrearCliente(nombre, telefono, direccion) {
    const { data: existente } = await db
        .from('clientes')
        .select('id')
        .eq('telefono', telefono)
        .maybeSingle();
    
    if (existente) return existente.id;
    
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

// Exponer funciones globalmente
window.cambiarCantidad = cambiarCantidad;
window.eliminarDelCarrito = eliminarDelCarrito;
