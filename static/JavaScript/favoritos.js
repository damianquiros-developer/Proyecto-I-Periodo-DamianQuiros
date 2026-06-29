// Pantalla para ver contactos con estrella.
'use strict';

// Aqui se guarda la lista que se esta viendo.

let listaFavoritos = [];
let filtroActivo   = 'todos';
let textoBusqueda  = '';

const PALETA = {
  VIP:       { avatar: 'card-avatar-vip',       tag: 'tag-vip'       },
  Cliente:   { avatar: 'card-avatar-cliente',   tag: 'tag-cliente'   },
  Socio:     { avatar: 'card-avatar-socio',     tag: 'tag-socio'     },
  Prospecto: { avatar: 'card-avatar-prospecto', tag: 'tag-prospecto' },
};

// Al abrir, carga los favoritos del usuario.

document.addEventListener('DOMContentLoaded', iniciar);

async function iniciar() {
  await verificar_sesion();
  await cargar_favoritos();
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

// agarra todos los contactos y deja solo los que tienen estrella.

async function cargar_favoritos() {
  mostrar_spinner(true);
  try {
    const res  = await fetch('/api/contactos');
    const datos = await res.json();
    if (!datos.success) throw new Error();

    listaFavoritos = datos.contactos.filter(c => a_bool(c.es_favorito));
    actualizar_meta();
    renderizar(get_filtrados());

  } catch {
    mostrar_estado_vacio('Error al cargar favoritos');
  } finally {
    mostrar_spinner(false);
  }
}

// Busca dentro de los favoritos sin cargar todo otra vez.

function get_filtrados() {
  let resultado = listaFavoritos;

  if (filtroActivo !== 'todos') {
    resultado = resultado.filter(c => c.categoria === filtroActivo);
  }

  if (textoBusqueda.trim()) {
    const consulta = textoBusqueda.toLowerCase();
    resultado = resultado.filter(c =>
      `${c.nombre} ${c.apellido}`.toLowerCase().includes(consulta) ||
      (c.empresa || '').toLowerCase().includes(consulta)           ||
      (c.cargo   || '').toLowerCase().includes(consulta)
    );
  }

  return resultado;
}

function aplicar_filtro(event, categoria) {
  document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('activo'));
  event.currentTarget.classList.add('activo');
  filtroActivo = categoria;
  renderizar(get_filtrados());
}

function aplicar_busqueda(texto) {
  textoBusqueda = texto;
  renderizar(get_filtrados());
  const btnLimpiar = document.getElementById('btnLimpiarBusqueda');
  btnLimpiar?.classList.toggle('hidden', !texto.trim());
}

function limpiar_busqueda() {
  const elInput = document.getElementById('inputBusqueda');
  if (elInput) elInput.value = '';
  aplicar_busqueda('');
}

// Muestra una tarjeta por cada favorito.
// Si no hay, muestra el mensaje vacio.

function renderizar(contactos) {
  const cuadricula = document.getElementById('favoritosGrid');
  const elVacio    = document.getElementById('estadoVacio');
  if (!cuadricula) return;

  cuadricula.innerHTML = '';

  if (!contactos.length) {
    cuadricula.classList.add('hidden');
    elVacio?.classList.remove('hidden');
    return;
  }

  elVacio?.classList.add('hidden');
  cuadricula.classList.remove('hidden');
  contactos.forEach(c => cuadricula.appendChild(crear_tarjeta(c)));
}

function crear_tarjeta(c) {
  const colores   = PALETA[c.categoria] || { avatar: 'card-avatar-default', tag: '' };
  const iniciales = ((c.nombre?.[0] || '') + (c.apellido?.[0] || '')).toUpperCase();

  const tarjeta = document.createElement('div');
  tarjeta.className          = 'contacto-card';
  tarjeta.dataset.id         = c.id;
  tarjeta.dataset.categoria  = c.categoria || '';

  tarjeta.innerHTML = `
    <div class="card-avatar ${colores.avatar}">${iniciales}</div>
    <div class="card-info">
      <span class="card-nombre">${escapar(c.nombre)} ${escapar(c.apellido)}</span>
      ${c.cargo   ? `<span class="card-cargo">${escapar(c.cargo)}</span>`   : ''}
      ${c.empresa ? `<span class="card-empresa">${escapar(c.empresa)}</span>` : ''}
      ${c.categoria ? `<span class="card-tag ${colores.tag}">${escapar(c.categoria)}</span>` : ''}
    </div>
    <button class="card-favorito es-favorito" title="Quitar de favoritos"
      onclick="quitar_favorito(event, '${c.id}')">★</button>
    <span class="card-flecha">›</span>
  `;

  tarjeta.addEventListener('click', e => {
    if (e.target.classList.contains('card-favorito')) return;
    window.location.href = `/contacto/detalle?id=${c.id}`;
  });

  return tarjeta;
}

// Si se quita la estrella, tambien se quita de esta pantalla.

async function quitar_favorito(event, id) {
  event.stopPropagation();
  try {
    const res  = await fetch(`/api/contactos/${id}/favorito`, { method: 'POST' });
    const datos = await res.json();
    if (!datos.success) return;

    if (!datos.es_favorito) {
      listaFavoritos = listaFavoritos.filter(c => c.id !== id);
      actualizar_meta();
      renderizar(get_filtrados());
    }
  } catch { /* silencioso */ }
}

// Cosas pequenas para contador, carga y mensaje vacio.

function actualizar_meta() {
  set_texto('totalFavoritos', listaFavoritos.length);
  const elFecha = document.getElementById('ultimaActualizacion');
  if (elFecha) {
    elFecha.textContent = new Date().toLocaleDateString('es-CR', { day: 'numeric', month: 'short' });
  }
}

function mostrar_spinner(visible) {
  const elSpinner  = document.getElementById('spinnerFavoritos');
  const cuadricula = document.getElementById('favoritosGrid');
  elSpinner?.classList.toggle('hidden', !visible);
  if (visible) cuadricula?.classList.add('hidden');
}

function mostrar_estado_vacio(msg) {
  document.getElementById('estadoVacio')?.classList.remove('hidden');
  const elSub = document.getElementById('estadoVacioSub');
  if (elSub && msg) elSub.textContent = msg;
}

function a_bool(v) {
  return String(v).toLowerCase() === 'true' || v === true || v === 1;
}

function set_texto(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function escapar(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
