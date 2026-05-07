// =====================================================
// CONFIGURACIÓN DE SUPABASE - ¡MODIFICA ESTOS VALORES!
// =====================================================
const SUPABASE_URL = 'https://iyanyiihgjnnlcjapnge.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_gxx8Bo4xtnPcCHWTooE3fA_yE9j1cIz';

// CAMBIADO: ahora se llama supabaseClient (no supabase)
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
});

// Variables globales
let currentUser = null;
let currentUserRole = null;
let currentUserName = null;

// =====================================================
// ESPERAR A QUE EL DOM ESTÉ LISTO
// =====================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM cargado, asignando eventos...');
    
    document.getElementById('loginBtn').onclick = login;
    document.getElementById('logoutBtn').onclick = logout;
    document.getElementById('consultarBtn').onclick = consultarPedido;
    document.getElementById('nuevoPedidoBtn').onclick = mostrarNuevoPedidoForm;
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => {
            const tab = btn.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (tab === 'dashboard') cargarDashboard();
            else cargarTabGenerico(tab);
        };
    });
    
    verificarConexion();
});

// =====================================================
// VERIFICAR CONEXIÓN
// =====================================================
async function verificarConexion() {
    console.log('🔄 Verificando conexión con Supabase...');
    try {
        const { data, error } = await supabaseClient
            .from('usuarios')
            .select('count', { count: 'exact', head: true });
        
        if (error) {
            console.error('❌ Error de conexión:', error);
            mostrarError('loginError', 'Error de conexión: ' + error.message);
            return false;
        }
        console.log('✅ Conexión exitosa con Supabase');
        return true;
    } catch (err) {
        console.error('❌ Error inesperado:', err);
        mostrarError('loginError', 'Error: ' + err.message);
        return false;
    }
}

// =====================================================
// FUNCIONES DE AUTENTICACIÓN
// =====================================================
async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        mostrarError('loginError', 'Ingresa email y contraseña');
        return;
    }
    
    console.log('🔍 Buscando usuario:', email);
    
    try {
        const { data, error } = await supabaseClient
            .from('usuarios')
            .select('*')
            .eq('email', email)
            .eq('activo', true)
            .maybeSingle();
        
        if (error) {
            console.error('Error en consulta:', error);
            mostrarError('loginError', 'Error: ' + error.message);
            return;
        }
        
        if (!data) {
            console.log('❌ Usuario no encontrado:', email);
            mostrarError('loginError', 'Usuario no encontrado');
            return;
        }
        
        console.log('✅ Usuario encontrado:', data.nombre);
        
        if (data.password_hash !== password) {
            console.log('❌ Contraseña incorrecta');
            mostrarError('loginError', 'Contraseña incorrecta');
            return;
        }
        
        currentUser = data;
        currentUserRole = data.rol;
        currentUserName = data.nombre;
        
        document.getElementById('loginModal').classList.remove('active');
        document.getElementById('userNameDisplay').textContent = `👋 ${currentUserName} (${currentUserRole === 'admin' ? 'Admin' : 'Trabajador'})`;
        document.getElementById('logoutBtn').style.display = 'block';
        document.getElementById('tabsContainer').style.display = 'flex';
        document.getElementById('clientePanel').style.display = 'none';
        document.getElementById('tabsContent').style.display = 'block';
        
        cargarDashboard();
        
    } catch (err) {
        console.error('Error inesperado:', err);
        mostrarError('loginError', 'Error: ' + err.message);
    }
}

function logout() {
    currentUser = null;
    currentUserRole = null;
    currentUserName = null;
    
    document.getElementById('loginModal').classList.add('active');
    document.getElementById('userNameDisplay').textContent = '';
    document.getElementById('logoutBtn').style.display = 'none';
    document.getElementById('tabsContainer').style.display = 'none';
    document.getElementById('clientePanel').style.display = 'block';
    document.getElementById('tabsContent').style.display = 'none';
    
    document.getElementById('consultaCodigo').value = '';
    document.getElementById('consultaTelefono').value = '';
    document.getElementById('resultadoConsulta').innerHTML = '';
}

function mostrarError(elementId, mensaje) {
    const errorDiv = document.getElementById(elementId);
    errorDiv.textContent = mensaje;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// =====================================================
// DASHBOARD
// =====================================================
async function cargarDashboard() {
    const tabsContent = document.getElementById('tabsContent');
    tabsContent.innerHTML = '<div class="card"><p>Cargando dashboard...</p></div>';
    
    try {
        const { data: pedidosData } = await supabaseClient.from('pedidos').select('*');
        const { data: clientesData } = await supabaseClient.from('clientes').select('*');
        
        const pendientes = pedidosData ? pedidosData.filter(p => p.estado === 'pendiente').length : 0;
        const enProceso = pedidosData ? pedidosData.filter(p => p.estado === 'en_proceso').length : 0;
        const terminados = pedidosData ? pedidosData.filter(p => p.estado === 'terminado').length : 0;
        
        let html = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
                <div class="card" style="text-align: center; background: #1a73e8; color: white;">
                    <h3>📦 Pendientes</h3>
                    <p style="font-size: 2rem;">${pendientes}</p>
                </div>
                <div class="card" style="text-align: center; background: #ffc107;">
                    <h3>⚙️ En Proceso</h3>
                    <p style="font-size: 2rem;">${enProceso}</p>
                </div>
                <div class="card" style="text-align: center; background: #28a745; color: white;">
                    <h3>✅ Terminados</h3>
                    <p style="font-size: 2rem;">${terminados}</p>
                </div>
                <div class="card" style="text-align: center; background: #17a2b8; color: white;">
                    <h3>👥 Clientes</h3>
                    <p style="font-size: 2rem;">${clientesData ? clientesData.length : 0}</p>
                </div>
            </div>
            <div class="card">
                <h3>📋 Últimos Pedidos</h3>
                <div class="table-container">
                    <table>
                        <thead><tr><th>Código</th><th>Cliente</th><th>Estado</th><th>Total</th></tr></thead>
                        <tbody id="ultimosPedidosTabla"></tbody>
                    </table>
                </div>
            </div>
        `;
        
        tabsContent.innerHTML = html;
        
        const { data: pedidos } = await supabaseClient
            .from('pedidos')
            .select('*, clientes(nombre)')
            .order('created_at', { ascending: false })
            .limit(10);
        
        const tbody = document.getElementById('ultimosPedidosTabla');
        if (pedidos && pedidos.length > 0) {
            tbody.innerHTML = pedidos.map(p => `
                <tr>
                    <td>${p.codigo}</td>
                    <td>${p.clientes ? p.clientes.nombre : 'N/A'}</td>
                    <td><span class="badge badge-${p.estado}">${p.estado}</span></td>
                    <td>$${p.total}</td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="4">No hay pedidos</td></tr>';
        }
    } catch (err) {
        tabsContent.innerHTML = `<div class="alert alert-error">Error: ${err.message}</div>`;
    }
}

// =====================================================
// CONSULTA DE PEDIDO
// =====================================================
async function consultarPedido() {
    const codigo = document.getElementById('consultaCodigo').value.trim();
    const telefono = document.getElementById('consultaTelefono').value.trim();
    const resultadoDiv = document.getElementById('resultadoConsulta');
    
    if (!codigo || !telefono) {
        resultadoDiv.innerHTML = '<div class="alert alert-error">Ingresa código y teléfono</div>';
        return;
    }
    
    try {
        const { data: pedido, error } = await supabaseClient
            .from('pedidos')
            .select('*, clientes(*)')
            .eq('codigo', codigo)
            .maybeSingle();
        
        if (error || !pedido) {
            resultadoDiv.innerHTML = '<div class="alert alert-error">Pedido no encontrado</div>';
            return;
        }
        
        if (pedido.clientes.telefono !== telefono) {
            resultadoDiv.innerHTML = '<div class="alert alert-error">Teléfono incorrecto</div>';
            return;
        }
        
        const { data: detalles } = await supabaseClient
            .from('detalle_pedido')
            .select('*')
            .eq('pedido_id', pedido.id);
        
        let detallesHtml = '<ul>';
        if (detalles && detalles.length > 0) {
            detalles.forEach(d => {
                detallesHtml += `<li>${d.cantidad} x ${d.descripcion} - $${d.subtotal}</li>`;
            });
        } else {
            detallesHtml += '<li>Sin detalles</li>';
        }
        detallesHtml += '</ul>';
        
        resultadoDiv.innerHTML = `
            <div class="card" style="margin-top: 15px;">
                <h3>📄 Pedido ${pedido.codigo}</h3>
                <p><strong>Cliente:</strong> ${pedido.clientes.nombre}</p>
                <p><strong>Estado:</strong> <span class="badge badge-${pedido.estado}">${pedido.estado}</span></p>
                ${detallesHtml}
                <p><strong>💰 Total:</strong> $${pedido.total}</p>
            </div>
        `;
    } catch (err) {
        resultadoDiv.innerHTML = `<div class="alert alert-error">Error: ${err.message}</div>`;
    }
}

function mostrarNuevoPedidoForm() {
    alert('Formulario de nuevo pedido en desarrollo');
}

function cargarTabGenerico(tab) {
    document.getElementById('tabsContent').innerHTML = `
        <div class="card" style="text-align: center;">
            <h3>📌 Módulo ${tab} en construcción</h3>
            <p>Próximamente disponible</p>
        </div>
    `;
}
