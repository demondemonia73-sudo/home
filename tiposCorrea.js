// ============================================
// TIPOSCORREA.JS - TIPOS DE CORREA v2.0
// ============================================

let tiposCorreaData = [];

async function cargarTiposCorrea() {
    if (!verificarSesion() || !esAdmin()) return;

    const container = document.getElementById('vistaDinamica');
    container.innerHTML = `
        <div class="card animate-fade-in">
            <div class="card-header">
                <div>
                    <div class="card-title">🔗 Tipos de Correa</div>
                    <div class="card-subtitle">Administra los tipos de correa para poleas</div>
                </div>
                <button class="btn btn-success btn-sm" onclick="mostrarFormularioTipoCorrea()">➕ Nuevo Tipo</button>
            </div>

            <!-- Formulario -->
            <div id="formTipoCorrea" class="hidden" style="background:var(--bg-body); padding:1.5rem; border-radius:var(--radius-md); margin-bottom:1.5rem; border:1px solid var(--border-color);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                    <h3 id="formTituloTipo" style="font-size:1.1rem; font-weight:700;">➕ Nuevo Tipo de Correa</h3>
                    <button class="modal-close" onclick="ocultarFormularioTipo()">&times;</button>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Nombre *</label>
                        <input type="text" id="tipoNombre" class="form-control" placeholder="Ej: C, SPZ">
                    </div>
                    <div class="form-group">
                        <label>Medida (mm) *</label>
                        <input type="number" id="tipoMedida" class="form-control" step="0.1" placeholder="Ej: 22.0">
                    </div>
                </div>
                <div class="form-group">
                    <label>Descripción</label>
                    <textarea id="tipoDescripcion" class="form-control" rows="2" placeholder="Descripción opcional"></textarea>
                </div>
                <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
                    <button class="btn btn-secondary" onclick="ocultarFormularioTipo()">Cancelar</button>
                    <button class="btn btn-primary" onclick="guardarTipoCorrea()">💾 Guardar</button>
                </div>
            </div>

            <div id="listaTiposCorrea">
                <div class="loading"><div class="spinner"></div><p>Cargando tipos de correa...</p></div>
            </div>
        </div>
    `;

    await refrescarListaTiposCorrea();
}

let tipoCorreaEditando = null;

function mostrarFormularioTipoCorrea() {
    tipoCorreaEditando = null;
    document.getElementById('formTituloTipo').textContent = '➕ Nuevo Tipo de Correa';
    document.getElementById('tipoNombre').value = '';
    document.getElementById('tipoMedida').value = '';
    document.getElementById('tipoDescripcion').value = '';
    document.getElementById('formTipoCorrea').classList.remove('hidden');
    document.getElementById('tipoNombre').focus();
}

function editarTipoCorrea(tipo) {
    tipoCorreaEditando = tipo;
    document.getElementById('formTituloTipo').textContent = `✏️ Editando: ${tipo.nombre}`;
    document.getElementById('tipoNombre').value = tipo.nombre;
    document.getElementById('tipoMedida').value = tipo.medida_mm;
    document.getElementById('tipoDescripcion').value = tipo.descripcion || '';
    document.getElementById('formTipoCorrea').classList.remove('hidden');
}

function ocultarFormularioTipo() {
    document.getElementById('formTipoCorrea').classList.add('hidden');
    tipoCorreaEditando = null;
}

async function guardarTipoCorrea() {
    const nombre = document.getElementById('tipoNombre').value.trim();
    const medida = parseFloat(document.getElementById('tipoMedida').value);
    const descripcion = document.getElementById('tipoDescripcion').value.trim();

    if (!nombre) { Toast.warning('El nombre es obligatorio'); return; }
    if (isNaN(medida) || medida <= 0) { Toast.warning('Ingresa una medida válida'); return; }

    const data = { nombre, medida_mm: medida, descripcion: descripcion || null, activo: true };

    try {
        if (tipoCorreaEditando) {
            const { error } = await db.from('tipos_correa').update(data).eq('id', tipoCorreaEditando.id);
            if (error) throw error;
            Toast.success('Tipo de correa actualizado');
        } else {
            const { error } = await db.from('tipos_correa').insert([data]);
            if (error) throw error;
            Toast.success('Tipo de correa creado');
        }
        ocultarFormularioTipo();
        await refrescarListaTiposCorrea();
    } catch (err) {
        Toast.error('Error: ' + err.message);
    }
}

async function eliminarTipoCorrea(id, nombre) {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return;
    try {
        const { error } = await db.from('tipos_correa').update({ activo: false }).eq('id', id);
        if (error) throw error;
        Toast.success('Tipo de correa eliminado');
        await refrescarListaTiposCorrea();
    } catch (err) {
        Toast.error('Error: ' + err.message);
    }
}

async function refrescarListaTiposCorrea() {
    const listaDiv = document.getElementById('listaTiposCorrea');
    if (!listaDiv) return;
    listaDiv.innerHTML = '<div class="loading"><div class="spinner"></div><p>Cargando...</p></div>';

    try {
        const { data, error } = await db
            .from('tipos_correa')
            .select('*')
            .eq('activo', true)
            .order('medida_mm');

        if (error) throw error;
        tiposCorreaData = data || [];

        if (tiposCorreaData.length === 0) {
            listaDiv.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔗</div>
                    <div class="empty-state-title">No hay tipos de correa</div>
                    <div class="empty-state-desc">Agrega los tipos de correa que usas en tus poleas</div>
                    <button class="btn btn-success" onclick="mostrarFormularioTipoCorrea()">➕ Nuevo Tipo</button>
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
                            <th>Nombre</th>
                            <th>Medida</th>
                            <th>Descripción</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        tiposCorreaData.forEach(t => {
            html += `
                <tr>
                    <td class="text-muted">#${t.id}</td>
                    <td><strong>${t.nombre}</strong></td>
                    <td>${t.medida_mm} mm</td>
                    <td class="text-muted text-sm">${t.descripcion || '-'}</td>
                    <td>
                        <div style="display:flex; gap:0.25rem;">
                            <button class="btn btn-warning btn-sm" style="padding:0.3rem 0.6rem; font-size:0.7rem;" onclick='editarTipoCorrea(${JSON.stringify(t).replace(/'/g, "&apos;")})'>✏️</button>
                            <button class="btn btn-danger btn-sm" style="padding:0.3rem 0.6rem; font-size:0.7rem;" onclick="eliminarTipoCorrea(${t.id}, '${t.nombre.replace(/'/g, "\'")}')">🗑️</button>
                        </div>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table></div>`;
        listaDiv.innerHTML = html;
    } catch (err) {
        listaDiv.innerHTML = `<div class="alert alert-danger"><span class="alert-icon">❌</span><div>Error: ${err.message}</div></div>`;
    }
}

window.cargarTiposCorrea = cargarTiposCorrea;
window.mostrarFormularioTipoCorrea = mostrarFormularioTipoCorrea;
window.editarTipoCorrea = editarTipoCorrea;
window.ocultarFormularioTipo = ocultarFormularioTipo;
window.guardarTipoCorrea = guardarTipoCorrea;
window.eliminarTipoCorrea = eliminarTipoCorrea;
