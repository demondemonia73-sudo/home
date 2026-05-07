// ============================================
// MÓDULO DE AUTENTICACIÓN
// ============================================

// Función para cerrar el modal de login (sin hacer logout)
function cerrarModalLogin() {
    document.getElementById('loginModal').classList.remove('active');
}

async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    
    errorDiv.style.display = 'none';
    
    if (!email || !password) {
        errorDiv.textContent = 'Ingresa email y contraseña';
        errorDiv.style.display = 'block';
        return;
    }
    
    try {
        const { data, error } = await db
            .from('usuarios')
            .select('*')
            .eq('email', email)
            .eq('activo', true)
            .maybeSingle();
        
        if (error || !data) {
            errorDiv.textContent = 'Usuario no encontrado';
            errorDiv.style.display = 'block';
            return;
        }
        
        if (data.password_hash !== password) {
            errorDiv.textContent = 'Contraseña incorrecta';
            errorDiv.style.display = 'block';
            return;
        }
        
        // Login exitoso
        AppState.currentUser = data;
        AppState.currentUserRole = data.rol;
        AppState.currentUserName = data.nombre;
        AppState.isLoggedIn = true;
        
        // Actualizar UI
        cerrarModalLogin(); // Cierra el modal de login
        document.getElementById('userNameDisplay').textContent = `👋 ${AppState.currentUserName} (${AppState.currentUserRole === 'admin' ? 'Administrador' : 'Trabajador'})`;
        document.getElementById('logoutBtn').style.display = 'block';
        document.getElementById('tabsContainer').style.display = 'flex';
        document.getElementById('clientePanel').style.display = 'none';
        document.getElementById('tabsContent').style.display = 'block';
        document.getElementById('loginDiscreto').style.display = 'none'; // Ocultar el botón discreto
        
        // Cargar dashboard
        await cargarDashboard();
        
    } catch (err) {
        errorDiv.textContent = 'Error: ' + err.message;
        errorDiv.style.display = 'block';
    }
}

function logout() {
    AppState.currentUser = null;
    AppState.currentUserRole = null;
    AppState.currentUserName = null;
    AppState.isLoggedIn = false;
    
    document.getElementById('loginModal').classList.remove('active');
    document.getElementById('userNameDisplay').textContent = '';
    document.getElementById('logoutBtn').style.display = 'none';
    document.getElementById('tabsContainer').style.display = 'none';
    document.getElementById('clientePanel').style.display = 'block';
    document.getElementById('tabsContent').style.display = 'none';
    document.getElementById('loginDiscreto').style.display = 'block'; // Mostrar el botón discreto
    
    // Limpiar formularios
    document.getElementById('consultaCodigo').value = '';
    document.getElementById('consultaTelefono').value = '';
    document.getElementById('resultadoConsulta').innerHTML = '';
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
}

async function verificarConexion() {
    try {
        const { error } = await db.from('usuarios').select('count', { count: 'exact', head: true });
        if (error) throw error;
        console.log('✅ Conexión con Supabase establecida');
        return true;
    } catch (err) {
        console.error('❌ Error de conexión:', err);
        return false;
    }
}

// Función para mostrar el modal de login
function mostrarLogin() {
    document.getElementById('loginModal').classList.add('active');
    document.getElementById('loginError').style.display = 'none';
    document.getElementById('loginEmail').focus();
}
