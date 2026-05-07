// ============================================
// MÓDULO DE TRABAJADORES (ADMIN)
// ============================================

let trabajadoresData = [];
let areasData = [];

async function cargarTrabajadores() {
    if (!verificarSesion()) return;
    
    const tabsContent = document.getElementById('tabsContent');
    tabsContent.innerHTML = `
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
                <h2 style="margin: 0;">👨‍🔧 Gestión de Trabajadores</h2>
                <button id="btnAgregarTrabajador" class="btn btn-success">➕ Nuevo Trabajador</button>
            </div>
            
            <div id="formTrabajador" style="display: none; background: #f8f9fa; padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem;">
                <h3 id="formTitulo">📝 Nuevo Trabajador</h3>
                <div class="form-group">
                    <label>Nombre completo *</label>
                    <input type="text" id="trabajadorNombre" class="form-control" placeholder="Ej: Juan Pérez">
                </div>
                <div class="form-group">
                    <label>Email *</label>
                    <input type="email" id="trabajadorEmail" class="form-control" placeholder="juan@taller.com">
                </div>
                <div class="form-group">
                    <label>Contraseña *</label>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <input type="password" id="trabajadorPassword" class="form-control" placeholder="Contraseña" style="flex: 1; filter: blur(4px); transition: filter 0.2s;">
                        <button type="button" id="togglePasswordBtn" class="btn" style="background: #6c757d; padding: 0 1rem;">👁️</button>
                    </div>
                    <small class="text-muted">Haz clic en el ojo para mostrar/ocultar la contraseña.</small>
                </div>
                <div class="form-group">
                    <label>Áreas de trabajo</label>
                    <div id="areasCheckbox" style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem;">
                        <div class="loading">Cargando áreas...</div>
                    </div>
                </div>
                <div class="button-group">
                    <button id="btnGuardarTrabajador" class="btn btn-primary">💾 Guardar</button>
                    <button id="btnCancelarTrabajador" class="btn btn-danger">❌ Cancelar</button>
                </div>
            </div>
            
            <div id="listaTrabajadores">
                <div class="loading">Cargando trabajadores...</div>
            </div>
        </div>
    `;
    
    document.getElementById('btnAgregarTrabajador').onclick = () => mostrarFormularioNuevo();
    document.getElementById('btnGuardarTrabajador').onclick = guardarTrabajador;
    document.getElementById('btnCancelarTrabajador').onclick = ocultarFormulario;
    
    const toggleBtn = document.getElementById('togglePasswordBtn');
    const passwordInput = document.getElementById('trabajadorPassword');
    if (toggleBtn && passwordInput) {
        let passwordVisible = false;
        toggleBtn.onclick = () => {
            passwordVisible = !passwordVisible;
            if (passwordVisible) {
                passwordInput.type = 'text';
                passwordInput.style.filter = 'blur(0px)';
                toggleBtn.textContent = '🙈';
            } else {
                passwordInput.type = 'password';
                passwordInput.style.filter = 'blur(4px)';
                toggleBtn.textContent = '👁️';
            }
        };
        passwordInput.style.filter = 'blur(4px)';
    }
    
    await cargarAreas();
    await refrescarListaTrabajadores();
}

let trabajadorEditando = null;

async function cargarAreas() {
    try {
        const { data, error } = await db
            .from('areas')
            .select('*')
            .order('nombre');
        
        if (error) throw error;
        areasData = data || [];
        
        const container = document.getElementById('areasCheckbox');
        if (container) {
            if (areasData.length === 0) {
                container.innerHTML = '<div class="alert alert-warning">No hay áreas registradas. Crea áreas primero en la base de datos.</div>';
            } else {
                container.innerHTML = areasData.map(area => `
                    <label style="display: flex; align-items: center; gap: 0.3rem; background: #e9ecef; padding: 0.3rem 0.8rem; border-radius: 20px; cursor: pointer;">
                        <input type="checkbox" value="${area.id}" class="area-checkbox"> ${area.icono || '📁'} ${area.nombre}
                    </label>
                `).join('');
            }
        }
        
    } catch (err) {
        console.error('Error cargando áreas:', err);
        const container = document.getElementById('areasCheckbox');
        if (container) {
            container.innerHTML = `<div class="alert alert-danger">Error cargando áreas: ${err.message}</div>`;
        }
    }
}

function mostrarFormularioNuevo() {
    trabajadorEditando = null;
    document.getElementById('formTitulo').textContent = '📝 Nuevo Trabajador';
    document.getElementById('trabajadorNombre').value = '';
    document.getElementById('trabajadorEmail').value = '';
    
    const passwordInput = document.getElementById('trabajadorPassword');
    const toggleBtn = document.getElementById('togglePasswordBtn');
    if (passwordInput) {
        passwordInput.value = '';
        passwordInput.type = 'password';
        passwordInput.style.filter = 'blur(4px)';
        if (toggleBtn) toggleBtn.textContent = '👁️';
    }
    
    document.querySelectorAll('.area-checkbox').forEach(cb => cb.checked = false);
    document.getElementById('formTrabajador').style.display = 'block';
    document.getElementById('trabajadorNombre').focus();
}

function editarTrabajador(trabajador, areasAsignadas) {
    trabajadorEditando = trabajador;
    document.getElementById('formTitulo').textContent = `✏️ Editando: ${trabajador.nombre}`;
    document.getElementById('trabajadorNombre').value = trabajador.nombre;
    document.getElementById('trabajadorEmail').value = trabajador.email;
    
    const passwordInput = document.getElementById('trabajadorPassword');
    const toggleBtn = document.getElementById('togglePasswordBtn');
    if (passwordInput) {
        passwordInput.value = trabajador.password_visible || '';
        passwordInput.type = 'password';
        passwordInput.style.filter = 'blur(4px)';
        if (toggleBtn) toggleBtn.textContent = '👁️';
    }
    
    document.querySelectorAll('.area-checkbox').forEach(cb => {
        cb.checked = areasAsignadas.includes(parseInt(cb.value));
    });
    
    document.getElementById('formTrabajador').style.display = 'block';
    document.getElementById('trabajadorNombre').focus();
}

function ocultarFormulario() {
    document.getElementById('formTrabajador').style.display = 'none';
    trabajadorEditando = null;
}

async function guardarTrabajador() {
    const nombre = document.getElementById('trabajadorNombre').value.trim();
    const email = document.getElementById('trabajadorEmail').value.trim();
    const password = document.getElementById('trabajadorPassword').value.trim();
    
    const areasSeleccionadas = [];
    document.querySelectorAll('.area-checkbox:checked').forEach(cb => {
        areasSeleccionadas.push(parseInt(cb.value));
    });
    
    if (!nombre) {
        alert('⚠️ El nombre es obligatorio');
        return;
    }
    if (!email) {
        alert('⚠️ El email es obligatorio');
        return;
    }
    if (!trabajadorEditando && !password) {
        alert('⚠️ La contraseña es obligatoria para nuevos trabajadores');
        return;
    }
    
    try {
        if (trabajadorEditando) {
            const updateData = { nombre: nombre, email: email };
            if (password) {
                updateData.password_hash = password;
                updateData.password_visible = password;
            }
            
            const { error } = await db
                .from('usuarios')
                .update(updateData)
                .eq('id', trabajadorEditando.id);
            
            if (error) throw error;
            
            await db.from('usuario_areas').delete().eq('usuario_id', trabajadorEditando.id);
            for (const areaId of areasSeleccionadas) {
                await db.from('usuario_areas').insert([{ usuario_id: trabajadorEditando.id, area_id: areaId }]);
            }
            
            alert('✅ Trabajador actualizado');
        } else {
            const { data, error } = await db
                .from('usuarios')
                .insert([{
                    nombre: nombre,
                    email: email,
                    password_hash: password,
                    password_visible: password,
                    rol: 'trabajador',
                    activo: true
                }])
                .select();
            
            if (error) throw error;
            
            const nuevoId = data[0].id;
            for (const areaId of areasSeleccionadas) {
                await db.from('usuario_areas').insert([{ usuario_id: nuevoId, area_id: areaId }]);
            }
            
            alert('✅ Trabajador creado');
        }
        
        ocultarFormulario();
        await refrescarListaTrabajadores();
        
    } catch (err) {
        alert('❌ Error: ' + err.message);
    }
}

async function toggleActivoTrabajador(id, activo, nombre) {
    const accion = activo ? 'activar' : 'desactivar';
    if (!confirm(`¿${accion === 'activar' ? 'Activar' : 'Desactivar'} al trabajador "${nombre}"?`)) return;
    
    try {
        const { error } = await db
            .from('usuarios')
            .update({ activo: activo })
            .eq('id', id);
        
        if (error) throw error;
        alert(`✅ Trabajador ${accion === 'activar' ? 'activado' : 'desactivado'}`);
        await refrescarListaTrabajadores();
        
    } catch (err) {
        alert('❌ Error: ' + err.message);
    }
}

async function resetearPassword(id, nombre) {
    const nuevaPassword = prompt(`🔑 Nueva contraseña para "${nombre}"\n\nIngresa la nueva contraseña:`);
    
    if (!nuevaPassword || nuevaPassword.trim() === '') {
        alert('⚠️ Contraseña no válida');
        return;
    }
    
    if (!confirm(`¿Establecer nueva contraseña para "${nombre}"?`)) return;
    
    try {
        const { error } = await db
            .from('usuarios')
            .update({ 
                password_hash: nuevaPassword,
                password_visible: nuevaPassword
            })
            .eq('id', id);
        
        if (error) throw error;
        alert(`✅ Contraseña actualizada para "${nombre}"\nNueva contraseña: ${nuevaPassword}`);
        await refrescarListaTrabajadores();
        
    } catch (err) {
        alert('❌ Error: ' + err.message);
    }
}

function revelePassword(id, passwordReal) {
    const span = document.getElementById(`pass-${id}`);
    if (!span) return;
    
    span.textContent = passwordReal;
    span.style.filter = 'blur(0px)';
    
    setTimeout(() => {
        span.textContent = '••••••';
        span.style.filter = 'blur(4px)';
    }, 5000);
}

async function refrescarListaTrabajadores() {
    const listaDiv = document.getElementById('listaTrabajadores');
    listaDiv.innerHTML = '<div class="loading">Cargando...</div>';
    
    try {
        const { data: trabajadores, error } = await db
            .from('usuarios')
            .select('*')
            .eq('rol', 'trabajador')
            .order('nombre');
        
        if (error) throw error;
        
        const { data: usuarioAreas } = await db.from('usuario_areas').select('*');
        const { data: areas } = await db.from('areas').select('*');
        
        trabajadoresData = trabajadores || [];
        
        if (trabajadoresData.length === 0) {
            listaDiv.innerHTML = '<div class="alert alert-info" style="text-align: center;">No hay trabajadores registrados. Haz clic en "➕ Nuevo Trabajador" para comenzar.</div>';
            return;
        }
        
        let html = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre</th>
                            <th>Email</th>
                            <th>Contraseña</th>
                            <th>Áreas</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        for (const t of trabajadoresData) {
            const areasIds = usuarioAreas?.filter(ua => ua.usuario_id === t.id).map(ua => ua.area_id) || [];
            const areasNombres = areas?.filter(a => areasIds.includes(a.id)).map(a => `${a.icono || '📁'} ${a.nombre}`).join(', ') || 'Sin áreas';
            
            html += `
                <tr>
                    <td>${t.id}</td>
                    <td><strong>${t.nombre}</strong></td>
                    <td>${t.email}</td>
                    <td style="position: relative;">
                        <span id="pass-${t.id}" style="filter: blur(4px); cursor: pointer;" onclick="revelePassword(${t.id}, '${t.password_visible.replace(/'/g, "\\'")}')">••••••</span>
                        <button class="btn" style="background: #17a2b8; padding: 0.2rem 0.4rem; font-size: 0.7rem; margin-left: 0.5rem;" onclick="resetearPassword(${t.id}, '${t.nombre}')">🔑 Cambiar</button>
                    </td
                    <td><small>${areasNombres}</small></td>
                    <td>
                        <span class="badge" style="background: ${t.activo ? '#28a745' : '#dc3545'}; color: white;">
                            ${t.activo ? '✅ Activo' : '❌ Inactivo'}
                        </span>
                    </td>
                    <td style="white-space: nowrap;">
                        <button class="btn" style="background: #ffc107; color: #333; padding: 0.3rem 0.6rem;" onclick='editarTrabajador(${JSON.stringify(t).replace(/'/g, "&apos;")}, ${JSON.stringify(areasIds)})'>✏️ Editar</button>
                        <button class="btn" style="background: ${t.activo ? '#dc3545' : '#28a745'}; color: white; padding: 0.3rem 0.6rem;" onclick="toggleActivoTrabajador(${t.id}, ${!t.activo}, '${t.nombre}')">
                            ${t.activo ? '❌ Desactivar' : '✅ Activar'}
                        </button>
                    </td
                </tr>
            `;
        }
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        listaDiv.innerHTML = html;
        
    } catch (err) {
        console.error('Error cargando trabajadores:', err);
        listaDiv.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
    }
}

// Exponer funciones globalmente
window.editarTrabajador = editarTrabajador;
window.toggleActivoTrabajador = toggleActivoTrabajador;
window.resetearPassword = resetearPassword;
window.cargarTrabajadores = cargarTrabajadores;
window.revelePassword = revelePassword;
