// Hace funcionar los recordatorios de cada contacto.
'use strict';

// Aqui quedan los recordatorios cargados y cuantos estan pendientes.

let listaRecordatorios = [];
let idContactoRec      = null;
let totalPendientes    = 0;

// Cuenta pendientes y los pone en el aviso del menu.
// Es como una alerta pequena para no dejar recordatorios vencidos escondidos.

async function cargar_badge_recordatorios() {
  try {
    const res  = await fetch('/api/recordatorios');
    const datos = await res.json();
    if (!datos.success) return;

    const pendientes = (datos.recordatorios || []).filter(r =>
      !a_bool(r.completado) && vencido_o_hoy(r.fecha_limite)
    );

    totalPendientes = pendientes.length;
    actualizar_badge(totalPendientes);
  } catch { /* silencioso */ }
}

function actualizar_badge(cantidad) {
  const elBadge = document.getElementById('badgeRecordatorios');
  if (!elBadge) return;
  if (cantidad > 0) {
    elBadge.textContent = cantidad > 9 ? '9+' : cantidad;
    elBadge.classList.remove('hidden');
  } else {
    elBadge.classList.add('hidden');
  }
}

// Desde la pantalla de detalle se carga solo lo de ese contacto.

async function init_recordatorios(idContacto) {
  idContactoRec = idContacto;
  await cargar_recordatorios_contacto();
}

async function cargar_recordatorios_contacto() {
  const lista = document.getElementById('recordatoriosLista');
  if (!lista) return;
  lista.innerHTML = '<div class="spinner-wrapper" style="padding:12px;"><div class="spinner"></div></div>';

  try {
    const res  = await fetch(`/api/contactos/${idContactoRec}/recordatorios`);
    const datos = await res.json();
    listaRecordatorios = datos.success ? (datos.recordatorios || []) : [];
  } catch {
    listaRecordatorios = [];
  }

  renderizar_recordatorios();
}

// Separa pendientes y completados para que se vean mas claro.

function renderizar_recordatorios() {
  const lista = document.getElementById('recordatoriosLista');
  if (!lista) return;
  lista.innerHTML = '';

  const pendientes  = listaRecordatorios.filter(r => !a_bool(r.completado));
  const completados = listaRecordatorios.filter(r =>  a_bool(r.completado));

  if (!listaRecordatorios.length) {
    lista.innerHTML = '<p class="rec-vacio">Sin recordatorios para este contacto.</p>';
    return;
  }

  if (pendientes.length)  lista.appendChild(crear_grupo('Pendientes',  pendientes));
  if (completados.length) lista.appendChild(crear_grupo('Completados', completados, true));
}

function crear_grupo(titulo, items, atenuado = false) {
  const grupo = document.createElement('div');
  grupo.className = 'rec-grupo';
  grupo.innerHTML = `<p class="rec-grupo-titulo ${atenuado ? 'rec-grupo-atenuado' : ''}">${titulo}</p>`;

  items.forEach(r => {
    const estaVencido = !a_bool(r.completado) && es_vencido(r.fecha_limite);
    const esHoy       = !a_bool(r.completado) && es_hoy(r.fecha_limite);
    const div         = document.createElement('div');
    div.className     = `rec-item ${a_bool(r.completado) ? 'rec-completado' : ''} ${estaVencido ? 'rec-vencido' : ''} ${esHoy ? 'rec-hoy' : ''}`;
    div.innerHTML     = `
      <button class="rec-check" title="${a_bool(r.completado) ? 'Reabrir' : 'Marcar completado'}"
        onclick="cambiar_completado('${r.id}')">
        ${a_bool(r.completado) ? '✓' : '○'}
      </button>
      <div class="rec-cuerpo">
        <span class="rec-titulo">${escapar(r.titulo)}</span>
        <span class="rec-fecha ${estaVencido ? 'rec-fecha-vencida' : ''} ${esHoy ? 'rec-fecha-hoy' : ''}">
          ${formatear_fecha(r.fecha_limite)}
        </span>
      </div>
      <button class="rec-eliminar" onclick="eliminar_recordatorio('${r.id}')">✕</button>
    `;
    grupo.appendChild(div);
  });

  return grupo;
}

// Abre el formulario para agregar un recordatorio.

function abrir_modal_recordatorio() {
  document.getElementById('recTitulo').value  = '';
  document.getElementById('recFecha').value   = fecha_minima();
  document.getElementById('recAlerta')?.classList.add('hidden');
  document.getElementById('modalRecordatorioOverlay')?.classList.remove('hidden');
  document.getElementById('recTitulo')?.focus();
}

function cerrar_modal_recordatorio() {
  document.getElementById('modalRecordatorioOverlay')?.classList.add('hidden');
}

function cerrar_si_fondo(e) {
  if (e.target === e.currentTarget) cerrar_modal_recordatorio();
}

// Cada accion guarda el cambio y actualiza la lista.

async function guardar_recordatorio() {
  const titulo = (document.getElementById('recTitulo')?.value || '').trim();
  const fecha  =  document.getElementById('recFecha')?.value  || '';

  if (!titulo) { mostrar_alerta('El título es requerido');     return; }
  if (!fecha)  { mostrar_alerta('La fecha límite es requerida'); return; }

  set_cargando(true);
  try {
    const res  = await fetch(`/api/contactos/${idContactoRec}/recordatorios`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ titulo, fecha_limite: fecha })
    });
    const datos = await res.json();

    if (!datos.success) { mostrar_alerta(datos.mensaje || 'Error al guardar'); return; }

    listaRecordatorios.unshift(datos.recordatorio);
    renderizar_recordatorios();
    cerrar_modal_recordatorio();
    cargar_badge_recordatorios();

  } catch { mostrar_alerta('Error de conexión'); }
  finally  { set_cargando(false); }
}

async function cambiar_completado(id) {
  try {
    const res  = await fetch(`/api/recordatorios/${id}/completar`, { method: 'POST' });
    const datos = await res.json();
    if (!datos.success) return;

    const rec = listaRecordatorios.find(r => r.id === id);
    if (rec) rec.completado = datos.completado;
    renderizar_recordatorios();
    cargar_badge_recordatorios();
  } catch { /* silencioso */ }
}

async function eliminar_recordatorio(id) {
  if (!confirm('¿Eliminar este recordatorio?')) return;
  try {
    const res  = await fetch(`/api/recordatorios/${id}`, { method: 'DELETE' });
    const datos = await res.json();
    if (!datos.success) return;
    listaRecordatorios = listaRecordatorios.filter(r => r.id !== id);
    renderizar_recordatorios();
    cargar_badge_recordatorios();
  } catch { /* silencioso */ }
}

// Revisa si la fecha ya paso, es hoy o viene despues.

function vencido_o_hoy(fechaStr) {
  if (!fechaStr) return false;
  const f = new Date(fechaStr);
  f.setHours(23, 59, 59);
  return !isNaN(f) && f <= new Date();
}

function es_vencido(fechaStr) {
  if (!fechaStr) return false;
  const f   = new Date(fechaStr);
  const hoy = new Date();
  f.setHours(0, 0, 0);
  hoy.setHours(0, 0, 0);
  return !isNaN(f) && f < hoy;
}

function es_hoy(fechaStr) {
  if (!fechaStr) return false;
  return new Date(fechaStr).toDateString() === new Date().toDateString();
}

function formatear_fecha(iso) {
  if (!iso) return '–';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  if (es_vencido(iso)) return `Vencido: ${d.toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })}`;
  if (es_hoy(iso))     return 'Hoy';
  const diff = Math.ceil((d - new Date()) / 86400000);
  if (diff === 1) return 'Mañana';
  if (diff < 7)   return `En ${diff} días`;
  return d.toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fecha_minima() {
  return new Date().toISOString().slice(0, 10);
}

function a_bool(v) { return String(v).toLowerCase() === 'true' || v === true || v === 1; }


function mostrar_alerta(msg) {
  const el  = document.getElementById('recAlerta');
  const txt = document.getElementById('recAlertaTxt');
  if (el && txt) { txt.textContent = msg; el.classList.remove('hidden'); }
}

function set_cargando(estado) {
  const btn = document.getElementById('btnGuardarRec');
  const sp  = document.getElementById('recSpinner');
  const txt = document.getElementById('recBtnTxt');
  if (btn) btn.disabled = estado;
  sp?.classList.toggle('hidden', !estado);
  txt?.classList.toggle('hidden', estado);
}

function escapar(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
