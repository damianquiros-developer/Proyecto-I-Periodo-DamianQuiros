// Muestra lo ultimo que se hizo en el sistema.
'use strict';

// Cada accion tiene su color y texto para entenderla rapido.

const TIPO_CONFIG = {
  creado:    { svg: svg_usuario(),  clase: 'act-icono-azul',  label: 'Contacto agregado',    badge: 'Creado'    },
  editado:   { svg: svg_check(),    clase: 'act-icono-verde', label: 'Contacto actualizado', badge: 'Editado'   },
  eliminado: { svg: svg_x(),        clase: 'act-icono-rojo',  label: 'Contacto eliminado',   badge: 'Eliminado' },
  favorito:  { svg: svg_estrella(), clase: 'act-icono-dorado', label: 'Marcado favorito',      badge: 'Favorito'  },
  email:     { svg: svg_email(),    clase: 'act-icono-azul',  label: 'Email enviado',         badge: 'Email'     },
  llamada:   { svg: svg_telefono(), clase: 'act-icono-azul',  label: 'Llamada realizada',     badge: 'Llamada'   },
  nota:      { svg: svg_lapiz(),    clase: 'act-icono-azul',  label: 'Nota actualizada',      badge: 'Nota'      },
  reunion:   { svg: svg_check(),    clase: 'act-icono-verde', label: 'Reunión completada',    badge: 'Reunión'   },
};

let actividadCompleta = [];
let filtroActivo = 'todos';

// Revisa que el usuario haya entrado y carga la actividad.

document.addEventListener('DOMContentLoaded', iniciar);

async function iniciar() {
  await verificar_sesion();
  await cargar_actividad();
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

// Carga la lista de actividad.
// Si algo falla, deja la pantalla vacia en vez de romper todo.

async function cargar_actividad() {
  try {
    const res  = await fetch('/api/actividad');
    const datos = await res.json();
    if (!datos.success) throw new Error();
    actividadCompleta = datos.actividad || [];
    actualizar_resumen(actividadCompleta);
    renderizar(actividadCompleta);
  } catch {
    actividadCompleta = [];
    actualizar_resumen([]);
    renderizar([]);
  } finally {
    document.getElementById('spinnerActividad')?.classList.add('hidden');
  }
}

// Muestra cada accion en orden.
// Si no hay nada, muestra el mensaje vacio.

function renderizar(actividad) {
  const lista   = document.getElementById('actividadLista');
  const elVacio = document.getElementById('estadoVacio');
  if (!lista) return;

  lista.innerHTML = '';
  lista.classList.add('hidden');
  elVacio?.classList.add('hidden');

  if (!actividad.length) {
    elVacio?.classList.remove('hidden');
    return;
  }

  lista.classList.remove('hidden');

  let diaActual = '';
  actividad.forEach(item => {
    const cfg = TIPO_CONFIG[item.tipo] || {
      svg: svg_usuario(),
      clase: 'act-icono-azul',
      label: item.tipo || 'Actividad',
      badge: item.tipo || 'Actividad',
    };
    const dia = formatear_dia(item.fecha);
    if (dia !== diaActual) {
      diaActual = dia;
      const separador = document.createElement('div');
      separador.className = 'act-dia';
      separador.textContent = dia;
      lista.appendChild(separador);
    }

    const div = document.createElement('div');
    div.className = 'act-item';
    div.innerHTML = `
      <div class="act-icono-wrap ${cfg.clase}">${cfg.svg}</div>
      <div class="act-body">
        <div class="act-topline">
          <span class="act-badge">${escapar(cfg.badge)}</span>
          <span class="act-hora">${formatear_fecha(item.fecha)}</span>
        </div>
        <p class="act-desc">${escapar(item.descripcion || cfg.label)}</p>
      </div>
    `;
    lista.appendChild(div);
  });
}

function filtrar_actividad(tipo) {
  filtroActivo = tipo || 'todos';
  const filtrada = filtroActivo === 'todos'
    ? actividadCompleta
    : actividadCompleta.filter(item => item.tipo === filtroActivo);
  renderizar(filtrada);
}

function actualizar_resumen(actividad) {
  set_texto('actTotal', actividad.length);
  set_texto('actHoy', contar_actividad_hoy(actividad));
  set_texto('actUltima', actividad[0] ? formatear_fecha_corta(actividad[0].fecha) : '–');
}

function contar_actividad_hoy(actividad) {
  const hoy = new Date().toDateString();
  return actividad.filter(item => {
    const fecha = new Date(item.fecha);
    return !isNaN(fecha) && fecha.toDateString() === hoy;
  }).length;
}

// Convierte la fecha a algo mas facil de leer.

function formatear_fecha(iso) {
  if (!iso) return '–';
  const d    = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
}

function formatear_fecha_corta(iso) {
  if (!iso) return '–';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleString('es-CR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function formatear_dia(iso) {
  if (!iso) return 'Sin fecha';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  const hoy = new Date();
  const ayer = new Date();
  ayer.setDate(hoy.getDate() - 1);

  if (d.toDateString() === hoy.toDateString()) return 'Hoy';
  if (d.toDateString() === ayer.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es-CR', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Los iconos se dibujan aqui para no usar archivos aparte.

function svg_envolver(path) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${path}</svg>`;
}
function svg_usuario()  { return svg_envolver('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'); }
function svg_check()    { return svg_envolver('<polyline points="20 6 9 17 4 12"/>'); }
function svg_x()        { return svg_envolver('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'); }
function svg_estrella() { return svg_envolver('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'); }
function svg_email()    { return svg_envolver('<rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/>'); }
function svg_telefono() { return svg_envolver('<path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.86 19.86 0 0 1 3.08 4.18 2 2 0 0 1 5.07 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L9.09 9.91a16 16 0 0 0 5 5l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>'); }
function svg_lapiz()    { return svg_envolver('<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>'); }


function set_texto(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function escapar(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
