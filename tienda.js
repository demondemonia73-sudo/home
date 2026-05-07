// ============================================
// MÓDULO DE TIENDA (CATÁLOGO PÚBLICO)
// ============================================

let catalogoProductos = [];
let categoriasLista = [];
let carrito = [];
let filtroActual = 'todas';
let clienteActual = null;
let esClienteFrecuente = false;
let tiposCorrea = []; // Nueva variable para tipos de correa

// Cargar datos al iniciar
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🛒 Iniciando catálogo de productos');
    
    if (typeof db === 'undefined') {
        console.error('❌ db no está definido');
        document.getElementById('catalogoContainer').innerHTML = '<div class="alert alert-danger">Error de conexión</div>';
        return;
    }
    
    // Cargar tipos de correa desde la base de datos
    await cargarTiposCorrea();
    
    const telefonoInput = document.getElementById('telefonoCliente');
    if (telefonoInput) {
        telefonoInput.addEventListener('blur', async function() {
            await verificarClienteFrecuente(this.value);
        });
    }
    
    await cargarCategorias();
    await cargarProductosTienda();
    
    const btnRealizar = document.getElementById('btnRealizarPedido');
    if (btnRealizar) btnRealizar.onclick = realizarPedido;
    
    const tipoEntrega = document.getElementById('tipoEntrega');
    if (tipoEntrega) {
        tipoEntrega.onchange = function() {
            const divDireccion = document.getElementById('divDireccionEnvio');
            if (divDireccion) {
                divDireccion.style.display = this.value === 'envio_domicilio' ? 'block' : 'none';
            }
        };
    }
});

// Nueva función para cargar tipos de correa desde la base de datos
async function cargarTiposCorrea() {
    try {
        const { data, error } = await db
            .from('tipos_correa')
            .select('*')
            .eq('activo', true)
            .order('medida_mm');
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            tiposCorrea = data;
            console.log('✅ Tipos de correa cargados desde BD:', tiposCorrea.length);
        } else {
            // Fallback en caso de que no haya datos
            tiposCorrea = [
                { nombre: 'A', medida_mm: 13 },
                { nombre: 'B', medida_mm: 17 },
                { nombre: '3V', medida_mm: 9.5 },
                { nombre: '5V', medida_mm: 15.5 }
            ];
            console.log('⚠️ Usando tipos de correa por defecto');
        }
    } catch (err) {
        console.error('Error cargando tipos de correa:', err);
        // Fallback
        tiposCorrea = [
            { nombre: 'A', medida_mm: 13 },
            { nombre: 'B', medida_mm: 17 },
            { nombre: '3V', medida_mm: 9.5 },
            { nombre: '5V', medida_mm: 15.5 }
        ];
    }
}

async function verificarClienteFrecuente(telefono) {
    if (!telefono || telefono.length < 6) return;
    
    try {
        const { data, error } = await db
            .from('clientes')
            .select('id, nombre, es_frecuente')
            .eq('telefono', telefono)
            .maybeSingle();
        
        if (error) throw error;
        
        if (data && data.es_frecuente === true) {
            esClienteFrecuente = true;
            clienteActual = data;
            document.getElementById('divOpcionesEntrega').style.display = 'block';
            document.getElementById('nombreCliente').value = data.nombre || '';
            console.log('✅ Cliente frecuente detectado:', data.nombre);
        } else {
            esClienteFrecuente = false;
            clienteActual = null;
            document.getElementById('divOpcionesEntrega').style.display = 'none';
        }
    } catch (err) {
        console.error('Error verificando cliente:', err);
    }
}

async function cargarCategorias() {
    try {
        console.log('Cargando categorías...');
        const { data, error } = await db
            .from('categorias')
            .select('*')
            .order('nombre');
        
        if (error) throw error;
        
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
        let query = db.from('productos').select('*, categorias(nombre, icono)').eq('activo', true);
        
        if (filtroActual !== 'todas') {
            query = query.eq('categoria_id', parseInt(filtroActual));
        }
        
        const { data, error } = await query.order('nombre');
        
        if (error) throw error;
        
        catalogoProductos = data || [];
        console.log('Productos cargados:', catalogoProductos.length);
        
        if (catalogoProductos.length === 0) {
            container.innerHTML = '<div class="card" style="text-align: center;">No hay productos disponibles.</div>';
            return;
        }
        
        container.innerHTML = catalogoProductos.map(p => renderProducto(p)).join('');
        
        catalogoProductos.forEach(p => {
            const btn = document.getElementById(`add-${p.id}`);
            if (btn) btn.onclick = () => agregarAlCarrito(p);
            
            const btnMedidas = document.getElementById(`add-medidas-${p.id}`);
            if (btnMedidas) btnMedidas.onclick = () => agregarAlCarritoConMedidas(p);
            
            if (p.categoria_id === 1) {
                const correaSelect = document.getElementById(`tipoCorrea-${p.id}`);
                const ejeSelect = document.getElementById(`diametroEje-${p.id}`);
                const canalesSelect = document.getElementById(`numCanales-${p.id}`);
                
                if (correaSelect) {
                    correaSelect.onchange = () => {
                        const personalizado = document.getElementById(`correaPersonalizada-${p.id}`);
                        if (personalizado) personalizado.style.display = correaSelect.value === 'personalizada' ? 'block' : 'none';
                    };
                }
                
                if (ejeSelect) {
                    ejeSelect.onchange = () => {
                        const personalizado = document.getElementById(`ejePersonalizado-${p.id}`);
                        if (personalizado) personalizado.style.display = ejeSelect.value === 'personalizado' ? 'block' : 'none';
                    };
                }
                
                if (canalesSelect) {
                    canalesSelect.onchange = () => {
                        const personalizado = document.getElementById(`canalesPersonalizado-${p.id}`);
                        const precioDiv = document.getElementById(`precioDinamico-${p.id}`);
                        const avisoDiv = document.getElementById(`avisoPersonalizado-${p.id}`);
                        
                        if (personalizado) {
                            personalizado.style.display = canalesSelect.value === 'personalizado' ? 'block' : 'none';
                        }
                        
                        if (canalesSelect.value === 'personalizado') {
                            if (precioDiv) precioDiv.style.display = 'none';
                            if (avisoDiv) avisoDiv.style.display = 'block';
                        } else {
                            if (precioDiv) precioDiv.style.display = 'block';
                            if (avisoDiv) avisoDiv.style.display = 'none';
                            actualizarPrecioPolea(p.id, p.precio_venta, p.precio_por_canal_extra || 0);
                        }
                    };
                }
            }
        });
        
    } catch (err) {
        console.error('Error cargando productos:', err);
        container.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
    }
}

function actualizarPrecioPolea(productoId, precioBase, precioPorCanalExtra) {
    const selectCanales = document.getElementById(`numCanales-${productoId}`);
    const precioDiv = document.getElementById(`precioDinamico-${productoId}`);
    
    if (!selectCanales || !precioDiv) return;
    
    const canales = selectCanales.value;
    
    if (canales === 'personalizado') return;
    
    let precioFinal = precioBase;
    if (parseInt(canales) >= 2) {
        precioFinal = precioBase + (precioPorCanalExtra * (parseInt(canales) - 1));
    }
    precioDiv.innerHTML = `Precio estimado: Bs ${precioFinal.toFixed(2)}`;
}

function renderProducto(producto) {
    const categoriaId = producto.categoria_id;
    let medidasHtml = '';
    
    if (categoriaId === 1) {
        const precioBase = producto.precio_venta;
        const precioPorCanalExtra = producto.precio_por_canal_extra || 0;
        
        // Generar opciones de tipo de correa desde la base de datos
        const opcionesCorrea = tiposCorrea.map(t => 
            `<option value="${t.nombre}">${t.nombre} (${t.medida_mm}mm)</option>`
        ).join('');
        
        medidasHtml = `
            <div class="medidas-especiales" style="background: #fff3cd; padding: 12px; border-radius: 8px; margin: 10px 0;">
                <small style="font-weight: bold;">⚙️ Especificaciones de la polea:</small>
                <div style="margin-top: 10px;">
                    <div class="campo-medida">
                        <label>Tipo de correa</label>
                        <select id="tipoCorrea-${producto.id}" class="form-control" style="font-size: 0.8rem; padding: 5px;">
                            ${opcionesCorrea}
                            <option value="personalizada">Personalizada</option>
                        </select>
                        <input type="text" id="correaPersonalizada-${producto.id}" placeholder="Especificar medida (mm)" style="display: none; width: 100%; margin-top: 5px; padding: 5px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div class="campo-medida">
                        <label>Diámetro del eje (mm)</label>
                        <select id="diametroEje-${producto.id}" class="form-control" style="font-size: 0.8rem; padding: 5px;">
                            <option value="16">16 mm</option>
                            <option value="19">19 mm</option>
                            <option value="24">24 mm</option>
                            <option value="28">28 mm</option>
                            <option value="personalizado">Personalizado</option>
                        </select>
                        <input type="text" id="ejePersonalizado-${producto.id}" placeholder="Especificar medida (mm)" style="display: none; width: 100%; margin-top: 5px; padding: 5px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div class="campo-medida">
                        <label>Número de canales</label>
                        <select id="numCanales-${producto.id}" class="form-control" style="font-size: 0.8rem; padding: 5px;">
                            <option value="1">1 canal (Precio base: Bs ${precioBase})</option>
                            <option value="2">2 canales (+Bs ${precioPorCanalExtra})</option>
                            <option value="3">3 canales (+Bs ${precioPorCanalExtra * 2})</option>
                            <option value="personalizado">Personalizado (consultar precio)</option>
                        </select>
                        <input type="number" id="canalesPersonalizado-${producto.id}" placeholder="Número de canales" style="display: none; width: 100%; margin-top: 5px; padding: 5px; border: 1px solid #ddd; border-radius: 4px;" min="1">
                    </div>
                    <div id="precioDinamico-${producto.id}" style="margin-top: 8px; font-size: 0.9rem; font-weight: bold; color: #28a745;">
                        Precio estimado: Bs ${precioBase}
                    </div>
                    <div id="avisoPersonalizado-${producto.id}" style="display: none; margin-top: 8px; background: #fff3cd; padding: 5px; border-radius: 4px; font-size: 0.75rem;">
                        ⚠️ Pedido especial - El precio será cotizado por el administrador
                    </div>
                </div>
                <button id="add-medidas-${producto.id}" class="btn" style="background: #28a745; padding: 8px 12px; margin-top: 12px; width: 100%;">✓ Agregar con estas especificaciones</button>
            </div>
        `;
    }
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
            cantidad: cantidad,
            especificaciones: especificaciones,
            unidad: producto.unidad_medida,
            esPedidoEspecial: especificaciones?.es_pedido_especial || false
        });
    }
    
    actualizarCarrito();
    alert(`✅ "${producto.nombre}" agregado al carrito`);
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
            const correaPersonalizada = document.getElementById(`correaPersonalizada-${producto.id}`)?.value;
            if (!correaPersonalizada) {
                alert('⚠️ Ingresa la medida de la correa personalizada');
                return;
            }
            tipoCorrea = `Personalizada: ${correaPersonalizada}mm`;
            esPedidoEspecial = true;
        } else {
            // Buscar la medida del tipo de correa seleccionado
            const tipoEncontrado = tiposCorrea.find(t => t.nombre === tipoCorrea);
            if (tipoEncontrado) {
                tipoCorrea = `${tipoCorrea} (${tipoEncontrado.medida_mm}mm)`;
            }
        }
        
        if (diametroEje === 'personalizado') {
            const ejePersonalizado = document.getElementById(`ejePersonalizado-${producto.id}`)?.value;
            if (!ejePersonalizado) {
                alert('⚠️ Ingresa el diámetro del eje personalizado');
                return;
            }
            diametroEje = `Personalizado: ${ejePersonalizado}mm`;
            esPedidoEspecial = true;
        }
        
        if (numCanales === 'personalizado') {
            const canalesPersonalizado = document.getElementById(`canalesPersonalizado-${producto.id}`)?.value;
            if (!canalesPersonalizado || canalesPersonalizado < 1) {
                alert('⚠️ Ingresa un número válido de canales');
                return;
            }
            numCanales = canalesPersonalizado;
            esPedidoEspecial = true;
            precioFinal = 0;
        } else {
            const precioPorCanalExtra = producto.precio_por_canal_extra || 0;
            if (parseInt(numCanales) >= 2) {
                precioFinal = producto.precio_venta + (precioPorCanalExtra * (parseInt(numCanales) - 1));
            }
        }
        
        especificaciones = {
            tipo_correa: tipoCorrea,
            diametro_eje_mm: diametroEje,
            num_canales: numCanales,
            es_pedido_especial: esPedidoEspecial,
            precio_calculado: precioFinal
        };
        
        const correaInput = document.getElementById(`correaPersonalizada-${producto.id}`);
        if (correaInput) correaInput.value = '';
        const ejeInput = document.getElementById(`ejePersonalizado-${producto.id}`);
        if (ejeInput) ejeInput.value = '';
        const canalesInput = document.getElementById(`canalesPersonalizado-${producto.id}`);
        if (canalesInput) canalesInput.value = '';
        
        if (esPedidoEspecial) {
            alert('📝 Pedido especial registrado. El administrador asignará el precio cuando procese el pedido.');
        }
    }
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
    
    agregarAlCarrito(producto, cantidad, especificaciones, esPedidoEspecial ? 0 : precioFinal);
    
    const inputNormal = document.getElementById(`medida-${producto.id}`);
    if (inputNormal) inputNormal.value = '';
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
            if (item.especificaciones.tipo_correa) {
                especHtml = `<small style="color:#666;">⚙️ Correa: ${item.especificaciones.tipo_correa} | Eje: ${item.especificaciones.diametro_eje_mm}mm | Canales: ${item.especificaciones.num_canales}</small><br>`;
                if (item.esPedidoEspecial) {
                    especHtml += `<small style="color:#dc3545;">📝 Pedido especial - Precio a cotizar</small><br>`;
                }
            } else if (item.especificaciones.peso_kg) {
                especHtml = `<small style="color:#666;">⚖️ ${item.especificaciones.peso_kg} kg</small><br>`;
            } else if (item.especificaciones.medidas) {
                const medidasObj = item.especificaciones.medidas;
                if (typeof medidasObj === 'object') {
                    const medidasList = Object.entries(medidasObj).map(([k, v]) => `${k}: ${v}`).join(', ');
                    especHtml = `<small style="color:#666;">📏 ${medidasList}</small><br>`;
                } else {
                    especHtml = `<small style="color:#666;">📏 ${medidasObj}</small><br>`;
                }
            } else if (item.especificaciones.especificacion) {
                especHtml = `<small style="color:#666;">📝 ${item.especificaciones.especificacion}</small><br>`;
            }
        }
        
        const cantidadStr = (item.cantidad % 1 !== 0) ? item.cantidad.toFixed(2) : item.cantidad;
        const precioStr = item.precio === 0 ? 'Por cotizar' : `Bs ${item.precio.toFixed(2)}`;
        
        return `
            <div class="carrito-item">
                <div style="flex: 2;">
                    <strong>${item.nombre}</strong><br>
                    ${especHtml}
                    <small>${precioStr} c/u</small>
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
    
    totalDiv.innerHTML = `Total: ${total === 0 ? 'Por cotizar' : `Bs ${total.toFixed(2)}`}`;
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
    
    let tipoEntrega = 'retiro_taller';
    let direccionEnvio = null;
    
    if (esClienteFrecuente) {
        tipoEntrega = document.getElementById('tipoEntrega')?.value || 'retiro_taller';
        direccionEnvio = document.getElementById('direccionEnvio')?.value.trim() || null;
    }
    
    if (!nombre || !telefono) {
        alert('⚠️ Por favor, ingresa el nombre y teléfono de contacto');
        return;
    }
    
    if (carrito.length === 0) {
        alert('⚠️ No hay productos en el pedido');
        return;
    }
    
    const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const requiereCotizacion = carrito.some(item => item.precio === 0 || item.esPedidoEspecial === true);
    
    let mensajeEntrega = '';
    if (tipoEntrega === 'retiro_taller') mensajeEntrega = '📦 Retiro en taller';
    else if (tipoEntrega === 'envio_domicilio') mensajeEntrega = `🚚 Envío a domicilio${direccionEnvio ? `\nDirección: ${direccionEnvio}` : ''}`;
    else mensajeEntrega = '🏪 Entrega en tienda';
    
    const mensajeConfirmacion = requiereCotizacion 
        ? `⚠️ Este pedido contiene productos especiales.\nEl precio será cotizado por el administrador.\n\nCliente: ${nombre}\nTeléfono: ${telefono}\n${mensajeEntrega}\nProductos: ${carrito.length} ítems`
        : `¿Confirmar pedido por Bs ${total.toFixed(2)}?\n\nCliente: ${nombre}\nTeléfono: ${telefono}\n${mensajeEntrega}\nProductos: ${carrito.length} ítems`;
    
    if (!confirm(mensajeConfirmacion)) {
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
                estado: requiereCotizacion ? 'pendiente' : 'pendiente',
                total: total,
                adelanto_monto: 0,
                adelanto_confirmado: false,
                tipo_entrega: tipoEntrega,
                direccion_envio: direccionEnvio,
                notas: notas || null,
                requiere_cotizacion: requiereCotizacion,
                precio_asignado_manual: null
            }])
            .select();
        
        if (pedidoError) throw pedidoError;
        
        const pedidoId = pedido[0].id;
        
        for (const item of carrito) {
            const espec = item.especificaciones ? JSON.stringify(item.especificaciones) : null;
            let descripcionExtra = '';
            
            if (item.especificaciones) {
                if (item.especificaciones.tipo_correa) {
                    descripcionExtra = ` (Correa: ${item.especificaciones.tipo_correa}, Eje: ${item.especificaciones.diametro_eje_mm}mm, Canales: ${item.especificaciones.num_canales})`;
                    if (item.esPedidoEspecial) descripcionExtra += ' [PEDIDO ESPECIAL - COTIZAR]';
                } else if (item.especificaciones.peso_kg) {
                    descripcionExtra = ` (${item.especificaciones.peso_kg} kg)`;
                } else if (item.especificaciones.medidas) {
                    if (typeof item.especificaciones.medidas === 'object') {
                        const medidasStr = Object.entries(item.especificaciones.medidas).map(([k, v]) => `${k}: ${v}`).join(', ');
                        descripcionExtra = ` (${medidasStr})`;
                    } else {
                        descripcionExtra = ` (${item.especificaciones.medidas})`;
                    }
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
        
        const mensajeFinal = requiereCotizacion
            ? `✅ ¡Pedido especial registrado!\n\n📋 Código de seguimiento: ${codigo}\n\nEl administrador asignará el precio y te notificará.\n\nGuarda este código para consultar el estado.`
            : `✅ ¡Pedido realizado con éxito!\n\n📋 Código de seguimiento: ${codigo}\n\nGuarda este código para consultar el estado de tu pedido.`;
        
        alert(mensajeFinal);
        
        carrito = [];
        actualizarCarrito();
        document.getElementById('nombreCliente').value = '';
        document.getElementById('telefonoCliente').value = '';
        document.getElementById('direccionCliente').value = '';
        document.getElementById('notasPedido').value = '';
        if (document.getElementById('direccionEnvio')) document.getElementById('direccionEnvio').value = '';
        
    } catch (err) {
        console.error('Error al crear pedido:', err);
        alert('❌ Error al procesar el pedido: ' + err.message);
    }
}

async function buscarOCrearCliente(nombre, telefono, direccion) {
    const { data: existente } = await db
        .from('clientes')
        .select('id, es_frecuente')
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

window.cambiarCantidad = cambiarCantidad;
window.eliminarDelCarrito = eliminarDelCarrito;
