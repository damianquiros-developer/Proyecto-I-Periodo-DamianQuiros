// Sirve para sacar o meter contactos usando archivos.
'use strict';

// Esto hace un archivo de tabla para descargar los contactos.

function exportar_csv() {
  if (!listaContactos?.length) {
    mostrar_toast('No hay contactos para exportar', 'error');
    return;
  }

  const columnas  = ['nombre','apellido','email','telefono','empresa','cargo','categoria','ciudad','pais','notas','creado_en'];
  const cabecera  = columnas.join(',');
  const filas     = listaContactos.map(c =>
    columnas.map(col => {
      const val = String(c[col] || '').replace(/"/g, '""');
      return `"${val}"`;
    }).join(',')
  );

  const csv    = [cabecera, ...filas].join('\n');
  const blob   = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url    = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  const hoy    = new Date().toISOString().slice(0, 10);
  enlace.href     = url;
  enlace.download = `fiducci-contactos-${hoy}.csv`;
  enlace.click();
  URL.revokeObjectURL(url);

  mostrar_toast('Contactos exportados correctamente', 'exito');
}

// La importacion va por partes para revisar antes de guardar.
// Primero archivo, luego columnas y despues resultado.

let archivoElegido  = null;
let previsualizacion = [];
let mapeoColumnas   = {};

function abrir_modal_importar() {
  resetear_modal();
  document.getElementById('modalImportarOverlay')?.classList.remove('hidden');
}

function cerrar_modal_importar() {
  document.getElementById('modalImportarOverlay')?.classList.add('hidden');
}

function cerrar_importar_si_overlay(event) {
  if (event.target === event.currentTarget) cerrar_modal_importar();
}

function resetear_modal() {
  archivoElegido   = null;
  previsualizacion  = [];
  mapeoColumnas    = {};

  mostrar_paso(1);
  set_texto('archivoNombre', 'Ningún archivo seleccionado');
  const elInput = document.getElementById('inputArchivoImportar');
  if (elInput) elInput.value = '';
  document.getElementById('importarZonaArchivo')?.classList.remove('archivo-cargado');
  document.getElementById('importarPrevisualizacion')?.classList.add('hidden');
  document.getElementById('importarAlerta')?.classList.add('hidden');
  document.getElementById('importarBtnPaso2')?.classList.add('hidden');
}

// El archivo se puede escoger o arrastrar a la caja.

function on_archivo_seleccionado(event) {
  const archivo = event.target.files?.[0];
  if (!archivo) return;
  procesar_archivo(archivo);
}

function on_drop_archivo(event) {
  event.preventDefault();
  const archivo = event.dataTransfer.files?.[0];
  if (archivo) procesar_archivo(archivo);
  document.getElementById('importarZonaArchivo')?.classList.remove('drag-over');
}

function on_dragover(event) {
  event.preventDefault();
  document.getElementById('importarZonaArchivo')?.classList.add('drag-over');
}

function on_dragleave() {
  document.getElementById('importarZonaArchivo')?.classList.remove('drag-over');
}

function procesar_archivo(archivo) {
  const extensionesValidas = ['.csv', '.xlsx', '.xls'];
  const extension = archivo.name.slice(archivo.name.lastIndexOf('.')).toLowerCase();

  if (!extensionesValidas.includes(extension)) {
    mostrar_alerta_importar('Solo se aceptan archivos .csv, .xlsx o .xls');
    return;
  }

  archivoElegido = archivo;
  set_texto('archivoNombre', archivo.name);
  document.getElementById('importarZonaArchivo')?.classList.add('archivo-cargado');

  if (extension === '.csv') {
    leer_csv_preview(archivo);
  } else {
    mostrar_alerta_importar('Archivo Excel cargado. Se procesará al importar.', 'info');
    document.getElementById('importarBtnPaso2')?.classList.remove('hidden');
  }
}

// Lee unas filas para que el usuario revise si el archivo esta bien.

function leer_csv_preview(archivo) {
  const lector = new FileReader();
  lector.onload = e => {
    const texto  = e.target.result;
    const lineas = texto.split('\n').filter(l => l.trim());
    if (lineas.length < 2) {
      mostrar_alerta_importar('El archivo CSV parece estar vacío');
      return;
    }

    const encabezados = parsear_linea_csv(lineas[0]);
    previsualizacion  = lineas.slice(1, 4).map(l => parsear_linea_csv(l));

    renderizar_mapeo_columnas(encabezados);
    renderizar_tabla_preview(encabezados, previsualizacion);

    document.getElementById('importarPrevisualizacion')?.classList.remove('hidden');
    document.getElementById('importarBtnPaso2')?.classList.remove('hidden');
    document.getElementById('importarAlerta')?.classList.add('hidden');
  };
  lector.readAsText(archivo, 'UTF-8');
}

function parsear_linea_csv(linea) {
  // Esto separa la linea con cuidado por si una direccion trae coma.
  const resultado = [];
  let actual       = '';
  let dentroComillas = false;
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (c === '"') {
      dentroComillas = !dentroComillas;
    } else if (c === ',' && !dentroComillas) {
      resultado.push(actual.trim());
      actual = '';
    } else {
      actual += c;
    }
  }
  resultado.push(actual.trim());
  return resultado;
}

const CAMPOS_FIDUCCI = ['nombre','apellido','email','telefono','empresa','cargo','categoria','ciudad','pais','notas'];

function renderizar_mapeo_columnas(encabezados) {
  const contenedor = document.getElementById('mapeoColumnas');
  if (!contenedor) return;
  contenedor.innerHTML = '';

  CAMPOS_FIDUCCI.forEach(campo => {
    const coincidencia = encabezados.find(h =>
      h.toLowerCase().replace(/\s/g,'') === campo.toLowerCase() ||
      h.toLowerCase().includes(campo.toLowerCase())
    ) || '';

    const fila = document.createElement('div');
    fila.className = 'mapeo-fila';
    fila.innerHTML = `
      <span class="mapeo-campo">${campo}</span>
      <span class="mapeo-flecha">→</span>
      <select class="mapeo-select field-input" data-campo="${campo}" onchange="actualizar_mapeo(this)">
        <option value="">— ignorar —</option>
        ${encabezados.map(h => `<option value="${escapar(h)}" ${h === coincidencia ? 'selected' : ''}>${escapar(h)}</option>`).join('')}
      </select>
    `;
    contenedor.appendChild(fila);
    mapeoColumnas[campo] = coincidencia;
  });
}

function actualizar_mapeo(select) {
  mapeoColumnas[select.dataset.campo] = select.value;
}

function renderizar_tabla_preview(encabezados, filas) {
  const tabla = document.getElementById('importarTablaPreview');
  if (!tabla) return;
  tabla.innerHTML = `
    <thead>
      <tr>${encabezados.map(h => `<th>${escapar(h)}</th>`).join('')}</tr>
    </thead>
    <tbody>
      ${filas.map(f => `<tr>${f.map(v => `<td>${escapar(v)}</td>`).join('')}</tr>`).join('')}
    </tbody>
  `;
}

// Manda el archivo y las columnas escogidas para guardar los contactos.

function ir_paso_2() {
  if (!archivoElegido) {
    mostrar_alerta_importar('Primero selecciona un archivo');
    return;
  }
  mostrar_paso(2);
}

async function ejecutar_importacion() {
  if (!archivoElegido) return;

  set_cargando_importar(true);
  try {
    const formulario = new FormData();
    formulario.append('archivo', archivoElegido);
    formulario.append('mapeo', JSON.stringify(mapeoColumnas));

    const res  = await fetch('/api/contactos/importar', {
      method: 'POST',
      body:   formulario
    });
    const datos = await res.json();

    if (!datos.success) {
      mostrar_alerta_importar(datos.mensaje || 'Error al importar');
      return;
    }

    mostrar_paso(3);
    set_texto('importarResultadoMsg',
      `Se importaron ${datos.importados} contacto${datos.importados !== 1 ? 's' : ''} correctamente.`
    );

    if (typeof cargar_contactos === 'function') {
      await cargar_contactos();
    }

  } catch {
    mostrar_alerta_importar('Error de conexión. Intenta de nuevo.');
  } finally {
    set_cargando_importar(false);
  }
}

// Muestra un aviso pequeno y luego desaparece solo.

function mostrar_toast(mensaje, tipo = 'exito') {
  let elToast = document.getElementById('toastGlobal');
  if (!elToast) {
    elToast = document.createElement('div');
    elToast.id = 'toastGlobal';
    document.body.appendChild(elToast);
  }

  elToast.className   = `toast toast-${tipo} toast-visible`;
  elToast.textContent = mensaje;

  clearTimeout(elToast._timer);
  elToast._timer = setTimeout(() => {
    elToast.classList.remove('toast-visible');
  }, 3000);
}

// Cosas pequenas para moverse entre pasos y mostrar avisos.

function mostrar_paso(paso) {
  [1, 2, 3].forEach(n => {
    document.getElementById(`importarPaso${n}`)?.classList.toggle('hidden', n !== paso);
  });
  document.querySelectorAll('.paso-indicador').forEach(el => {
    const n = parseInt(el.dataset.paso);
    el.classList.toggle('activo',     n === paso);
    el.classList.toggle('completado', n < paso);
  });
}

function mostrar_alerta_importar(msg, tipo = 'error') {
  const el  = document.getElementById('importarAlerta');
  const txt = document.getElementById('importarAlertaTexto');
  if (!el || !txt) return;
  txt.textContent = msg;
  el.className    = `alert alert-${tipo === 'info' ? 'success' : 'error'}`;
  el.classList.remove('hidden');
}

function set_cargando_importar(estado) {
  const btn     = document.getElementById('btnEjecutarImportar');
  const spinner = document.getElementById('importarSpinner');
  const texto   = document.getElementById('importarBtnTexto');
  if (btn) btn.disabled = estado;
  spinner?.classList.toggle('hidden', !estado);
  texto?.classList.toggle('hidden', estado);
}

function set_texto(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function escapar(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
