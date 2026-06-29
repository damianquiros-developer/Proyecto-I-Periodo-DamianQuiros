// Muestra toda la informacion de un contacto.
'use strict';

// Guarda el contacto abierto para poder editarlo o eliminarlo.

let contactoActual = null;

const PALETA = {
  VIP:       { bg: '#d6ede6', color: '#2e7a5e', tagClass: 'tag-vip' },
  Familia:   { bg: '#f5dede', color: '#8a3d4a', tagClass: 'tag-familia' },
  Trabajo:   { bg: '#d6e5f0', color: '#2e5f8a', tagClass: 'tag-trabajo' },
  Amigos:    { bg: '#ddddf5', color: '#4c4fa0', tagClass: 'tag-amigos' },
  Otro:      { bg: '#e8ecf0', color: '#4a5568', tagClass: 'tag-otro' },
  Cliente:   { bg: '#d6e5f0', color: '#2e5f8a', tagClass: 'tag-cliente' },
  Socio:     { bg: '#ddddf5', color: '#4c4fa0', tagClass: 'tag-socio' },
  Prospecto: { bg: '#f0e8d5', color: '#8a6a1f', tagClass: 'tag-prospecto' },
};

// Al abrir, revisa quien entro y carga los datos del contacto.

document.addEventListener('DOMContentLoaded', iniciar);

async function iniciar() {
  await verificar_sesion();
  const id = get_id_de_url();
  if (!id) { window.location.href = '/dashboard'; return; }
  await cargar_contacto(id);
  await cargar_actividad_reciente();
  if (typeof init_interacciones === 'function') await init_interacciones(id);
  if (typeof init_recordatorios  === 'function') await init_recordatorios(id);
  if (typeof cargar_badge_recordatorios === 'function') cargar_badge_recordatorios();
}

async function verificar_sesion() {
  try {
    const res  = await fetch('/api/me');
    const datos = await res.json();
    if (!datos.success) { window.location.href = '/'; return; }
    set_texto('usuarioNombre', `${datos.user.name || ''} ${datos.user.lastname || ''}`.trim());
    set_texto('usuarioRol', datos.user.role || '–');
    const elAvatar = document.getElementById('usuarioAvatar');
    if (elAvatar) elAvatar.textContent = (datos.user.name?.[0] || 'U').toUpperCase();
  } catch { window.location.href = '/'; }
}

// Busca el contacto. Si no existe, vuelve a la pagina principal.

async function cargar_contacto(id) {
  try {
    const res  = await fetch(`/api/contactos/${id}`);
    const datos = await res.json();
    if (!datos.success) { window.location.href = '/dashboard'; return; }
    contactoActual = datos.contacto;
    poblar_detalle(contactoActual);
  } catch {
    window.location.href = '/dashboard';
  }
}

async function cargar_actividad_reciente() {
  try {
    const res  = await fetch('/api/actividad');
    const datos = await res.json();
    if (!datos.success) return;
    renderizar_actividad(datos.actividad.slice(0, 4));
  } catch { /* silencioso */ }
}

// Rellena la pantalla con los datos del contacto.

function poblar_detalle(c) {
  const colores   = PALETA[c.categoria] || { bg: '#e8ecf0', color: '#4a5568', tagClass: '' };
  const iniciales = ((c.nombre?.[0] || '') + (c.apellido?.[0] || '')).toUpperCase();

  const elAvatar = document.getElementById('detalleAvatar');
  if (elAvatar) {
    elAvatar.textContent      = iniciales;
    elAvatar.style.background = colores.bg;
    elAvatar.style.color      = colores.color;
  }

  set_texto('detalleNombre',   `${c.nombre} ${c.apellido}`);
  set_texto('detalleSub',       [c.cargo, c.empresa].filter(Boolean).join(' · '));
  set_texto('detalleEmail',     c.email     || '–');
  set_texto('detalleTelefono',  c.telefono  || '–');
  set_texto('detalleEmpresa',   c.empresa   || '–');
  set_texto('detalleTipo',      c.es_favorito ? 'Favorito' : 'Normal');
  set_texto('detalleFavorito',  c.es_favorito ? 'Sí ★' : 'No');
  set_texto('detalleFecha',     formatear_fecha(c.creado_en));

  const elNotas = document.getElementById('detalleNotas');
  if (elNotas) elNotas.textContent = c.notas || '–';

  // Estado simple para mostrar conectado o desconectado.
  const segundos = c.creado_en ? new Date(c.creado_en).getSeconds() : 0;
  const estado   = segundos % 2 === 0 ? 'Conectado' : 'Desconectado';
  const elEstado = document.getElementById('detalleEstado');
  if (elEstado) {
    elEstado.textContent  = estado;
    elEstado.style.color  = estado === 'Conectado' ? '#2e7a5e' : '#888';
    elEstado.style.fontWeight = '500';
  }

  const elTag = document.getElementById('detalleTag');
  if (elTag) {
    elTag.textContent      = c.categoria || '';
    elTag.style.background = colores.bg;
    elTag.style.color      = colores.color;
  }

  set_texto('detalleMeta', c.modificado_en
    ? `Última modificación: ${formatear_fecha_relativa(c.modificado_en)} · Por: ${c.modificado_por || '–'}`
    : '');
}

// Muestra las ultimas acciones debajo del detalle.

function renderizar_actividad(actividad) {
  const lista = document.getElementById('actividadDetalle');
  if (!lista) return;
  lista.innerHTML = '';

  if (!actividad?.length) {
    lista.innerHTML = '<p style="font-size:.8rem;color:var(--text-light);padding:8px 0;">Sin actividad registrada.</p>';
    return;
  }

  const SVG = {
    email:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg>`,
    llamada: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.86 19.86 0 0 1 3.08 4.18 2 2 0 0 1 5.07 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L9.09 9.91a16 16 0 0 0 5 5l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    nota:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
    reunion: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
    default: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`,
  };

  const TIPO_MAPA = {
    creado:   { icono: SVG.nota,    verde: false, label: 'Contacto Agregado' },
    editado:  { icono: SVG.nota,    verde: false, label: 'Contacto Actualizado' },
    favorito: { icono: SVG.default, verde: false, label: 'Marcado favorito' },
  };

  actividad.forEach(item => {
    const cfg    = TIPO_MAPA[item.tipo] || { icono: SVG.default, verde: false };
    const div    = document.createElement('div');
    div.className = 'actividad-item-detalle';
    const esVerde = cfg.verde || item.tipo === 'reunion';
    div.innerHTML = `
      <div class="act-icono ${esVerde ? 'act-icono-verde' : ''}">${cfg.icono}</div>
      <div class="act-texto">
        <p class="act-desc">${escapar(item.descripcion || cfg.label || item.tipo)}</p>
        <span class="act-hora">${formatear_fecha_corta(item.fecha)}</span>
      </div>
    `;
    lista.appendChild(div);
  });
}

// Editar abre el formulario. Eliminar pregunta antes de borrar.

function ir_a_editar() {
  if (!contactoActual) return;
  window.location.href = `/contacto/editar?id=${contactoActual.id}`;
}

function mostrar_confirm_eliminar() {
  document.getElementById('vistaDetalle').classList.add('hidden');
  document.getElementById('vistaConfirmEliminar').classList.remove('hidden');
}

function ocultar_confirm_eliminar() {
  document.getElementById('vistaConfirmEliminar').classList.add('hidden');
  document.getElementById('vistaDetalle').classList.remove('hidden');
}

async function ejecutar_eliminacion() {
  if (!contactoActual) return;

  set_cargando_eliminar(true);
  try {
    const res  = await fetch(`/api/contactos/${contactoActual.id}`, { method: 'DELETE' });
    const datos = await res.json();

    if (!datos.success) {
      alert(datos.mensaje || 'Error al eliminar');
      set_cargando_eliminar(false);
      return;
    }

    window.location.href = '/dashboard';

  } catch {
    alert('Error de conexión. Intenta de nuevo.');
    set_cargando_eliminar(false);
  }
}

// Cosas pequenas que se usan abajo para fechas, texto y botones.

function get_id_de_url() {
  return new URLSearchParams(window.location.search).get('id');
}

function set_texto(id, texto) {
  const el = document.getElementById(id);
  if (el) el.textContent = texto;
}

function escapar(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatear_fecha(iso) {
  if (!iso) return '–';
  const d = new Date(iso);
  return isNaN(d) ? iso : d.toLocaleDateString('es-CR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatear_fecha_corta(iso) {
  if (!iso) return '–';
  const d = new Date(iso);
  return isNaN(d) ? iso : d.toLocaleString('es-CR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function formatear_fecha_relativa(iso) {
  if (!iso) return '–';
  const d    = new Date(iso);
  const diff = Math.floor((Date.now() - d) / 86400000);
  if (diff === 0) return 'hoy';
  if (diff === 1) return 'hace 1 día';
  return `hace ${diff} días`;
}

function set_cargando_eliminar(estado) {
  const btn     = document.querySelector('.btn-eliminar-confirm');
  const texto   = document.getElementById('eliminarTexto');
  const spinner = document.getElementById('eliminarSpinner');
  if (btn)    btn.disabled = estado;
  texto?.classList.toggle('hidden', estado);
  spinner?.classList.toggle('hidden', !estado);
}
