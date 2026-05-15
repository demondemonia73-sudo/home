// ============================================
// TRABAJADORES.JS - GESTIÓN DE TRABAJADORES v2.0
// ============================================

let trabajadoresData = [];
let areasData = [];

async function cargarTrabajadores() {
    if (!verificarSesion() || !esAdmin()) return;

    const container = document.getElementById('vistaDinamica');
    container.innerHTML = `
        <div class="card animate-fade-in">
            <div class="card-header">
                <div>
                    <div class="card-title">👷 Gestión de Trabajadores</div>
                    <div class="card-subtitle">Administra tu equipo y sus áreas de trabajo</div>
                </div>
                <button class="btn btn-success btn-sm" onclick="mostrarFormularioTrabajador()">➕ Nuevo Trabajador</button>
            </div>

            <!-- Formulario -->
            <div id="formTrabajador" class="hidden" style="background:var(--bg-body); padding:1.5rem; border-radius:var(--radius-md); margin-bottom:1.5rem; border:1px solid var(--border-color);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                    <h3 id="formTituloTrab" style="font-size:1.1rem; font-weight:700;">➕ Nuevo Trabajador</h3>
                    <button class="modal-close" onclick="ocultarFormularioTrabajador()">&times;</button>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Nombre completo *</label>
                        <input type="text" id="trabajadorNombre" class="form-control" placeholder="Ej: Juan Pérez">
                    </div>
                    <div class="form-group">
                        <label>Email *</label>
                        <input type="email" id="trabajadorEmail" class="form-control" placeholder="juan@tallertotal.com">
                    </div>
                </div>
                <div class="form-group">
                    <label>Contraseña *</label>
                    <div style="display:flex; gap:0.5rem; align-items:center;">
                        <input type="password" id="trabajadorPassword" class="form-control" placeholder="Contraseña segura" style="flex:1;">
                        <button type="button" class="btn btn-secondary" style="padding:0.5rem 0.75rem;" onclick="togglePasswordVisibility()" id="togglePassBtn">👁️</button>
                    </div>
                    <div class="form-hint">Haz clic en el ojo para mostrar/ocultar</div>
                </div>
                <div class="form-group">
                    <label>Áreas de trabajo</label>
                    <div id="areasCheckbox" style="display:flex; flex-wrap:wrap; gap:0.5rem; margin-top:0.5rem;">
                        <div class="loading"><div class="spinner" style="width:20px; height:20px;"></div></div>
                    </div>
                </div>
                <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
                    <button class="btn btn-secondary" onclick="ocultarFormularioTrabajador()">Cancelar</button>
                    <button class="btn btn-primary" onclick="guardarTrabajador()">💾 Guardar</button>
                </div>
            </div>

            <div id="listaTrabajadores">
                <div class="loading"><div class="spinner"></div><p>Cargando trabajadores...</p></div>
            </div>
        </div>
    `;

    await cargarAreas();
    await refrescarListaTrabajadores();
}

let trabajadorEditando = null;

async function cargarAreas() {
    try {
        const { data, error } = await db.from('areas').select('*').order('nombre');
        if (error) throw error;
        areasData = data || [];

        const container = document.getElementById('areasCheckbox');
        if (container) {
            container.innerHTML = areasData.map(area => `
                <label class="form-check" style="background:var(--bg-body); padding:0.5rem 0.75rem; border-radius:var(--radius-sm); border:1px solid var(--border-color);">
                    <input type="checkbox" value="${area.id}" class="area-checkbox">
                    <span>${area.icono || '🔧'} ${area.nombre}</span>
                </label>
            `).join('');
        }
    } catch (err) {
        console.error('Error cargando áreas:', err);
        Toast.error('Error cargando áreas');
    }
}

function togglePasswordVisibility() {
    const input = document.getElementById('trabajadorPassword');
    const btn = document.getElementById('togglePassBtn');
    if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
    } else {
        input.type = 'password';
        btn.textContent = '👁️';
    }
}

function mostrarFormularioTrabajador() {
    trabajadorEditando = null;
    document.getElementById('formTituloTrab').textContent = '➕ Nuevo Trabajador';
    document.getElementById('trabajadorNombre').value = '';
    document.getElementById('trabajadorEmail').value = '';
    document.getElementById('trabajadorPassword').value = '';
    document.getElementById('trabajadorPassword').type = 'password';
    document.getElementById('togglePassBtn').textContent = '👁️';
    document.querySelectorAll('.area-checkbox').forEach(cb => cb.checked = false);
    document.getElementById('formTrabajador').classList.remove('hidden');
    document.getElementById('trabajadorNombre').focus();
}

function editarTrabajador(trabajador, areasAsignadas) {
    trabajadorEditando = trabajador;
    document.getElementById('formTituloTrab').textContent = `✏️ Editando: ${trabajador.nombre}`;
    document.getElementById('trabajadorNombre').value = trabajador.nombre;
    document.getElementById('trabajadorEmail').value = trabajador.email;
    document.getElementById('trabajadorPassword').value = trabajador.password_visible || '';
    document.getElementById('trabajadorPassword').type = 'password';
    document.getElementById('togglePassBtn').textContent = '👁️';

    document.querySelectorAll('.area-checkbox').forEach(cb => {
        cb.checked = areasAsignadas.includes(parseInt(cb.value));
    });

    document.getElementById('formTrabajador').classList.remove('hidden');
}

function ocultarFormularioTrabajador() {
    document.getElementById('formTrabajador').classList.add('hidden');
    trabajadorEditando = null;
}

async function guardarTrabajador() {
    const nombre = document.getElementById('trabajadorNombre').value.trim();
    const email = document.getElementById('trabajadorEmail').value.trim();
    const password = document.getElementById('trabajadorPassword').value.trim();
    const areasSeleccionadas = [];
    document.querySelectorAll('.area-checkbox:checked').forEach(cb => areasSeleccionadas.push(parseInt(cb.value)));

    if (!nombre) { Toast.warning('El nombre es obligatorio'); return; }
    if (!email) { Toast.warning('El email es obligatorio'); return; }
    if (!trabajadorEditando && !password) { Toast.warning('La contraseña es obligatoria'); return; }

    try {
        if (trabajadorEditando) {
            const updateData = { nombre, email };
            if (password) {
                updateData.password_hash = password;
                updateData.password_visible = password;
            }
            const { error } = await db.from('usuarios').update(updateData).eq('id', trabajadorEditando.id);
            if (error) throw error;

            // Eliminar áreas existentes e insertar nuevas
            await db.from('usuario_areas').delete().eq('usuario_id', trabajadorEditando.id);

            if (areasSeleccionadas.length > 0) {
                const inserts = areasSeleccionadas.map(areaId => ({
                    usuario_id: trabajadorEditando.id,
                    area_id: areaId
                }));
                const { error: insertError } = await db.from('usuario_areas').insert(inserts);
                if (insertError) {
                    console.warn('Error insertando áreas (puede ser RLS):', insertError);
                    Toast.warning('Trabajador guardado pero áreas no actualizadas. Verifica permisos RLS.');
                }
            }
            Toast.success('Trabajador actualizado');
        } else {
            const { data, error } = await db.from('usuarios').insert([{
                nombre, email, password_hash: password, password_visible: password,
                rol: 'trabajador', activo: true
            }]).select();
            if (error) throw error;

            const nuevoId = data[0].id;

            if (areasSeleccionadas.length > 0) {
                const inserts = areasSeleccionadas.map(areaId => ({
                    usuario_id: nuevoId,
                    area_id: areaId
                }));
                const { error: insertError } = await db.from('usuario_areas').insert(inserts);
                if (insertError) {
                    console.warn('Error insertando áreas (puede ser RLS):', insertError);
                    Toast.warning('Trabajador creado pero áreas no asignadas. Verifica permisos RLS.');
                }
            }
            Toast.success('Trabajador creado');
        }

        ocultarFormularioTrabajador();
        await refrescarListaTrabajadores();
    } catch (err) {
        Toast.error('Error: ' + err.message);
    }
}

async function toggleActivoTrabajador(id, activo, nombre) {
    const accion = activo ? 'activar' : 'desactivar';
    if (!confirm(`¿${accion === 'activar' ? 'Activar' : 'Desactivar'} a "${nombre}"?`)) return;

    try {
        const { error } = await db.from('usuarios').update({ activo }).eq('id', id);
        if (error) throw error;
        Toast.success(`Trabajador ${accion === 'activar' ? 'activado' : 'desactivado'}`);
        await refrescarListaTrabajadores();
    } catch (err) {
        Toast.error('Error: ' + err.message);
    }
}

async function resetearPassword(id, nombre) {
    const nueva = prompt(`🔑 Nueva contraseña para "${nombre}":`);
    if (!nueva || !nueva.trim()) { Toast.warning('Contraseña no válida'); return; }

    try {
        const { error } = await db.from('usuarios').update({ 
            password_hash: nueva, password_visible: nueva 
        }).eq('id', id);
        if (error) throw error;
        Toast.success(`Contraseña actualizada para ${nombre}`);
        await refrescarListaTrabajadores();
    } catch (err) {
        Toast.error('Error: ' + err.message);
    }
}

// ============================================
// EFECTO VIDRIO OPACO PARA CONTRASEÑAS
// ============================================

function togglePasswordReveal(elemento, password) {
    const span = elemento.querySelector('.password-text');
    const icono = elemento.querySelector('.password-icon');

    if (span.classList.contains('revealed')) {
        // Ocultar
        span.textContent = password;
        span.classList.remove('revealed');
        icono.textContent = '👁️';
        elemento.classList.remove('revealed');
    } else {
        // Revelar
        span.textContent = password;
        span.classList.add('revealed');
        icono.textContent = '🙈';
        elemento.classList.add('revealed');
    }
}

async function refrescarListaTrabajadores() {
    const listaDiv = document.getElementById('listaTrabajadores');
    if (!listaDiv) return;
    listaDiv.innerHTML = '<div class="loading"><div class="spinner"></div><p>Cargando...</p></div>';

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
            listaDiv.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👷</div>
                    <div class="empty-state-title">No hay trabajadores</div>
                    <div class="empty-state-desc">Agrega trabajadores para asignarles pedidos</div>
                    <button class="btn btn-success" onclick="mostrarFormularioTrabajador()">➕ Nuevo Trabajador</button>
                </div>
            `;
            return;
        }

        let html = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Trabajador</th>
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
            const areasNombres = areas?.filter(a => areasIds.includes(a.id)).map(a => `${a.icono || '🔧'} ${a.nombre}`).join(', ') || 'Sin áreas';

            const passwordReal = t.password_visible || 'Sin contraseña';
            const passwordCorta = passwordReal.length > 12 ? passwordReal.substring(0, 12) + '...' : passwordReal;

            html += `
                <tr>
                    <td>
                        <div style="display:flex; align-items:center; gap:0.75rem;">
                            <div class="user-avatar" style="width:36px; height:36px; font-size:0.875rem;">${t.nombre?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)}</div>
                            <div style="font-weight:600;">${t.nombre}</div>
                        </div>
                    </td>
                    <td class="text-sm">${t.email}</td>
                    <td>
                        <div class="password-glass" onclick="togglePasswordReveal(this, '${passwordReal.replace(/'/g, "\'")}')" title="Haz clic para revelar la contraseña">
                            <span class="password-text">${passwordCorta}</span>
                            <span class="password-icon">👁️</span>
                        </div>
                    </td>
                    <td><span class="text-muted text-sm">${areasNombres}</span></td>
                    <td>
                        <span class="badge" style="background:${t.activo ? 'var(--success-light)' : 'var(--danger-light)'}; color:${t.activo ? 'var(--success)' : 'var(--danger)'};">
                            ${t.activo ? '✅ Activo' : '❌ Inactivo'}
                        </span>
                    </td>
                    <td>
                        <div style="display:flex; gap:0.25rem;">
                            <button class="btn btn-warning btn-sm" style="padding:0.3rem 0.6rem; font-size:0.7rem;" onclick='editarTrabajador(${JSON.stringify(t).replace(/'/g, "&apos;")}, ${JSON.stringify(areasIds)})'>✏️</button>
                            <button class="btn btn-secondary btn-sm" style="padding:0.3rem 0.6rem; font-size:0.7rem;" onclick="toggleActivoTrabajador(${t.id}, ${!t.activo}, '${t.nombre.replace(/'/g, "\'")}')">
                                ${t.activo ? '❌' : '✅'}
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }

        html += `</tbody></table></div>`;
        listaDiv.innerHTML = html;
    } catch (err) {
        console.error('Error:', err);
        listaDiv.innerHTML = `<div class="alert alert-danger"><span class="alert-icon">❌</span><div>Error: ${err.message}</div></div>`;
    }
}

window.cargarTrabajadores = cargarTrabajadores;
window.mostrarFormularioTrabajador = mostrarFormularioTrabajador;
window.editarTrabajador = editarTrabajador;
window.ocultarFormularioTrabajador = ocultarFormularioTrabajador;
window.guardarTrabajador = guardarTrabajador;
window.toggleActivoTrabajador = toggleActivoTrabajador;
window.resetearPassword = resetearPassword;
window.togglePasswordVisibility = togglePasswordVisibility;
window.togglePasswordReveal = togglePasswordReveal;
