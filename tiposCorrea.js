// ============================================
// MÓDULO DE TIPOS DE CORREA (ADMIN)
// ============================================

let tiposCorreaData = [];

async function cargarTiposCorrea() {
    if (!verificarSesion()) return;
    
    const tabsContent = document.getElementById('tabsContent');
    if (!tabsContent) return;
    
    tabsContent.innerHTML = `
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
                <h2 style="margin: 0;">🔧 Tipos de Correa</h2>
                <button id="btnAgregarTipoCorrea" class="btn btn-success">➕ Nuevo Tipo</button>
            </div>
            
            <div id="formTipoCorrea" style="display: none; background: #f8f9fa; padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem;">
                <h3 id="formTitulo">📝 Nuevo Tipo de Correa</h3>
                <div class="form-group">
                    <label>Nombre *</label>
                    <input type="text" id="tipoNombre" class="form-control" placeholder="Ej: C, SPZ">
                </div>
                <div class="form-group">
                    <label>Medida (mm) *</label>
                    <input type="number" id="tipoMedida" class="form-control" step="0.1" placeholder="Ej: 22.0">
                </div>
                <div class="form-group">
                    <label>Descripción</label>
                    <textarea id="tipoDescripcion" class="form-control" rows="2" placeholder="Descripción opcional"></textarea>
                </div>
                <div class="button-group">
                    <button id="btnGuardarTipoCorrea" class="btn btn-primary">💾 Guardar</button>
                    <button id="btnCancelarTipoCorrea" class="btn btn-danger">❌ Cancelar</button>
                </div>
            </div>
            
            <div id="listaTiposCorrea">
                <div class="loading">Cargando...</div>
            </div>
        </div>
    `;
    
    const btnAgregar = document.getElementById('btnAgregarTipoCorrea');
    const btnGuardar = document.getElementById('btnGuardarTipoCorrea');
    const btnCancelar = document.getElementById('btnCancelarTipoCorrea');
    
    if (btnAgregar) btnAgregar.onclick = () => mostrarFormularioNuevoTipo();
    if (btnGuardar) btnGuardar.onclick = () => guardarTipoCorrea();
    if (btnCancelar) btnCancelar.onclick = () => ocultarFormularioTipo();
    
    await refrescarListaTiposCorrea();
}

let tipoCorreaEditando = null;

function mostrarFormularioNuevoTipo() {
    tipoCorreaEditando = null;
    const formTitulo = document.getElementById('formTitulo');
    const tipoNombre = document.getElementById('tipoNombre');
    const tipoMedida = document.getElementById('tipoMedida');
    const tipoDescripcion = document.getElementById('tipoDescripcion');
    const formTipo = document.getElementById('formTipoCorrea');
    
    if (formTitulo) formTitulo.textContent = '📝 Nuevo Tipo de Correa';
    if (tipoNombre) tipoNombre.value = '';
    if (tipoMedida) tipoMedida.value = '';
    if (tipoDescripcion) tipoDescripcion.value = '';
    if (formTipo) formTipo.style.display = 'block';
    if (tipoNombre) tipoNombre.focus();
}

function editarTipoCorrea(tipo) {
    tipoCorreaEditando = tipo;
    const formTitulo = document.getElementById('formTitulo');
    const tipoNombre = document.getElementById('tipoNombre');
    const tipoMedida = document.getElementById('tipoMedida');
    const tipoDescripcion = document.getElementById('tipoDescripcion');
    const formTipo = document.getElementById('formTipoCorrea');
    
    if (formTitulo) formTitulo.textContent = `✏️ Editando: ${tipo.nombre}`;
    if (tipoNombre) tipoNombre.value = tipo.nombre;
    if (tipoMedida) tipoMedida.value = tipo.medida_mm;
    if (tipoDescripcion) tipoDescripcion.value = tipo.descripcion || '';
    if (formTipo) formTipo.style.display = 'block';
    if (tipoNombre) tipoNombre.focus();
}

function ocultarFormularioTipo() {
    const formTipo = document.getElementById('formTipoCorrea');
    if (formTipo) formTipo.style.display = 'none';
    tipoCorreaEditando = null;
}

async function guardarTipoCorrea() {
    const nombre = document.getElementById('tipoNombre')?.value.trim();
    const medida = parseFloat(document.getElementById('tipoMedida')?.value);
    const descripcion = document.getElementById('tipoDescripcion')?.value.trim();
    
    if (!nombre) {
        alert('⚠️ El nombre es obligatorio');
        return;
    }
    if (isNaN(medida) || medida <= 0) {
        alert('⚠️ Ingresa una medida válida en mm');
        return;
    }
    
    const data = {
        nombre: nombre,
        medida_mm: medida,
        descripcion: descripcion || null,
        activo: true
    };
    
    try {
        if (tipoCorreaEditando) {
            const { error } = await db
                .from('tipos_correa')
                .update(data)
                .eq('id', tipoCorreaEditando.id);
            if (error) throw error;
            alert('✅ Tipo de correa actualizado');
        } else {
            const { error } = await db
                .from('tipos_correa')
                .insert([data]);
            if (error) throw error;
            alert('✅ Tipo de correa creado');
        }
        ocultarFormularioTipo();
        await refrescarListaTiposCorrea();
    } catch (err) {
        alert('❌ Error: ' + err.message);
    }
}

async function eliminarTipoCorrea(id, nombre) {
    if (!confirm(`¿Eliminar "${nombre}"?\nLos productos con este tipo quedarán sin referencia.`)) return;
    
    try {
        const { error } = await db
            .from('tipos_correa')
            .update({ activo: false })
            .eq('id', id);
        if (error) throw error;
        alert('✅ Tipo de correa eliminado');
        await refrescarListaTiposCorrea();
    } catch (err) {
        alert('❌ Error: ' + err.message);
    }
}

async function refrescarListaTiposCorrea() {
    const listaDiv = document.getElementById('listaTiposCorrea');
    if (!listaDiv) return;
    listaDiv.innerHTML = '<div class="loading">Cargando...</div>';
    
    try {
        const { data, error } = await db
            .from('tipos_correa')
            .select('*')
            .eq('activo', true)
            .order('medida_mm');
        
        if (error) throw error;
        
        tiposCorreaData = data || [];
        
        if (tiposCorreaData.length === 0) {
            listaDiv.innerHTML = '<div class="alert alert-info" style="text-align: center;">No hay tipos de correa registrados</div>';
            return;
        }
        
        let html = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre</th>
                            <th>Medida (mm)</th>
                            <th>Descripción</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        tiposCorreaData.forEach(t => {
            html += `
                <tr>
                    <td>${t.id}</td
                    <td><strong>${t.nombre}</strong></td>
                    <td>${t.medida_mm} mm</td
                    <td>${t.descripcion || ''}</td
                    <td>
                        <button class="btn" style="background: #ffc107; color: #333; padding: 0.3rem 0.6rem;" onclick='editarTipoCorrea(${JSON.stringify(t).replace(/'/g, "&apos;")})'>✏️ Editar</button>
                        <button class="btn btn-danger" style="padding: 0.3rem 0.6rem;" onclick="eliminarTipoCorrea(${t.id}, '${t.nombre}')">🗑️ Eliminar</button>
                    </td
                </tr>
            `;
        });
        
        html += `</tbody>;</div>`;
        listaDiv.innerHTML = html;
        
    } catch (err) {
        listaDiv.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
    }
}

// Exponer funciones globalmente
window.editarTipoCorrea = editarTipoCorrea;
window.eliminarTipoCorrea = eliminarTipoCorrea;
window.cargarTiposCorrea = cargarTiposCorrea;
