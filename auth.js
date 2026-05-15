// ============================================
// AUTH.JS - AUTENTICACIÓN v2.0
// ============================================

async function login() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');

    errorDiv.classList.add('hidden');

    if (!email || !password) {
        errorDiv.textContent = 'Ingresa email y contraseña';
        errorDiv.classList.remove('hidden');
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
            errorDiv.textContent = 'Usuario no encontrado o inactivo';
            errorDiv.classList.remove('hidden');
            return;
        }

        if (data.password_hash !== password) {
            errorDiv.textContent = 'Contraseña incorrecta';
            errorDiv.classList.remove('hidden');
            return;
        }

        // Guardar sesión
        AppState.currentUser = data;
        AppState.currentUserRole = data.rol;
        AppState.currentUserName = data.nombre;
        AppState.isLoggedIn = true;

        localStorage.setItem('ttm-user', JSON.stringify({
            id: data.id,
            email: data.email,
            nombre: data.nombre,
            rol: data.rol
        }));

        cerrarModalLogin();
        actualizarUIAutenticado();
        Toast.success(`Bienvenido, ${data.nombre}!`);

    } catch (err) {
        errorDiv.textContent = 'Error: ' + err.message;
        errorDiv.classList.remove('hidden');
        console.error('Error login:', err);
    }
}

function logout() {
    AppState.currentUser = null;
    AppState.currentUserRole = null;
    AppState.currentUserName = null;
    AppState.isLoggedIn = false;

    localStorage.removeItem('ttm-user');

    cerrarModalLogin();
    actualizarUIAnonimo();
    Toast.info('Sesión cerrada correctamente');
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

function verificarSesion() {
    if (!AppState.isLoggedIn) {
        Toast.warning('Debes iniciar sesión para acceder a esta sección');
        mostrarLogin();
        return false;
    }
    return true;
}

function esAdmin() {
    return AppState.isLoggedIn && AppState.currentUserRole === 'admin';
}

function esTrabajador() {
    return AppState.isLoggedIn && AppState.currentUserRole === 'trabajador';
}

// Login con Enter
document.addEventListener('DOMContentLoaded', () => {
    const passwordInput = document.getElementById('loginPassword');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') login();
        });
    }
});

// Exponer funciones globales
window.login = login;
window.logout = logout;
window.verificarConexion = verificarConexion;
window.verificarSesion = verificarSesion;
window.esAdmin = esAdmin;
window.esTrabajador = esTrabajador;
