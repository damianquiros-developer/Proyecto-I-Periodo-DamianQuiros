// Hace las partes visibles de la pagina principal.
'use strict';

// Cada categoria usa colores distintos para verse mas ordenado.

const COLORES_CATEGORIA = {
  VIP:       { avatar: 'card-avatar-vip',       tag: 'tag-vip' },
  Familia:   { avatar: 'card-avatar-familia',   tag: 'tag-familia' },
  Trabajo:   { avatar: 'card-avatar-trabajo',   tag: 'tag-trabajo' },
  Amigos:    { avatar: 'card-avatar-amigos',    tag: 'tag-amigos' },
  Otro:      { avatar: 'card-avatar-otro',      tag: 'tag-otro' },
  Cliente:   { avatar: 'card-avatar-cliente',   tag: 'tag-cliente' },
  Socio:     { avatar: 'card-avatar-socio',     tag: 'tag-socio' },
  Prospecto: { avatar: 'card-avatar-prospecto', tag: 'tag-prospecto' }
};

// Muestra la lista de contactos en pantalla.
// Si no hay contactos, muestra el mensaje vacio.

function renderizar_contactos(contactos) {
  const cuadricula = document.getElementById('contactosGrid');
  const elVacio    = document.getElementById('estadoVacio');
  if (!cuadricula) return;

  cuadricula.innerHTML = '';

  if (!contactos.length) {
    elVacio?.classList.remove('hidden');
    return;
  }

  elVacio?.classList.add('hidden');
  contactos.forEach(c => cuadricula.appendChild(crear_tarjeta(c)));
}

function renderizar_favoritos() {
  const cuadricula = document.getElementById('favoritosGrid');
  const elVacio    = document.getElementById('estadoVacioFavoritos');
  const elTotal    = document.getElementById('totalFavoritos');
  if (!cuadricula) return;

  const favoritos      = get_favoritos();
  cuadricula.innerHTML = '';

  if (elTotal) elTotal.textContent = favoritos.length;

  if (!favoritos.length) {
    elVacio?.classList.remove('hidden');
    return;
  }

  elVacio?.classList.add('hidden');
  favoritos.forEach(c => cuadricula.appendChild(crear_tarjeta(c)));
}

// Arma cada tarjeta con nombre, datos, boton de mas informacion y estrella.

function crear_tarjeta(contacto) {
  const { id, nombre, apellido, telefono, email, cargo, empresa, categoria, es_favorito } = contacto;
  const colores    = COLORES_CATEGORIA[categoria] || { avatar: 'card-avatar-default', tag: '' };
  const iniciales  = get_iniciales(nombre, apellido);
  const nombreComp = `${nombre} ${apellido}`;
  const tipoContacto = es_favorito ? 'Favorito' : 'Normal';

  const tarjeta = document.createElement('div');
  tarjeta.className          = 'contacto-card';
  tarjeta.dataset.id         = id;
  tarjeta.dataset.categoria  = categoria || '';

  tarjeta.innerHTML = `
    <div class="card-avatar ${colores.avatar}">${iniciales}</div>
    <div class="card-info">
      <span class="card-nombre">${escapar_html(nombreComp)}</span>
      <span class="card-telefono">${escapar_html(telefono || 'Sin teléfono')}</span>
      <span class="card-email">${escapar_html(email || 'Sin correo')}</span>
      ${cargo   ? `<span class="card-cargo">${escapar_html(cargo)}</span>`   : ''}
      ${empresa ? `<span class="card-empresa">${escapar_html(empresa)}</span>` : ''}
      <div class="card-meta">
        ${categoria ? `<span class="card-tag ${colores.tag}">${escapar_html(categoria)}</span>` : ''}
        <span class="card-tipo">${tipoContacto}</span>
      </div>
    </div>
    <button class="card-mas-info" onclick="abrir_detalle('${id}')">Más información</button>
    <button
      class="card-favorito ${es_favorito ? 'es-favorito' : ''}"
      title="${es_favorito ? 'Quitar de favoritos' : 'Marcar como favorito'}"
      onclick="handle_toggle_favorito(event, '${id}')"
    >${es_favorito ? '★' : '☆'}</button>
    <span class="card-flecha">›</span>
  `;

  tarjeta.addEventListener('click', e => {
    if (e.target.closest('button')) return;
    abrir_detalle(id);
  });

  return tarjeta;
}

// Formulario que se abre encima de la pagina.
// Se limpia para crear o se rellena cuando se va a editar.

function limpiar_formulario() {
  ['contactoId','inputNombre','inputApellido','inputEmail',
   'inputTelefono','inputCategoria','inputEmpresa','inputCargo','inputNotas'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  limpiar_errores_form();
  ocultar_alertas_modal();
}

function poblar_formulario(contacto) {
  set_valor('contactoId',     contacto.id        || '');
  set_valor('inputNombre',    contacto.nombre    || '');
  set_valor('inputApellido',  contacto.apellido  || '');
  set_valor('inputEmail',     contacto.email     || '');
  set_valor('inputTelefono',  contacto.telefono  || '');
  set_valor('inputCategoria', contacto.categoria || '');
  set_valor('inputEmpresa',   contacto.empresa   || '');
  set_valor('inputCargo',     contacto.cargo     || '');
  set_valor('inputNotas',     contacto.notas     || '');
}

function get_datos_formulario() {
  return {
    nombre:    get_valor('inputNombre').trim(),
    apellido:  get_valor('inputApellido').trim(),
    email:     get_valor('inputEmail').trim(),
    telefono:  get_valor('inputTelefono').trim(),
    categoria: get_valor('inputCategoria'),
    empresa:   get_valor('inputEmpresa').trim(),
    cargo:     get_valor('inputCargo').trim(),
    notas:     get_valor('inputNotas').trim()
  };
}

function marcar_error_campo(idCampo) {
  document.getElementById(idCampo)?.classList.add('input-error');
}

function limpiar_errores_form() {
  ['inputNombre','inputApellido','inputEmail','inputTelefono','inputCategoria'].forEach(id => {
    document.getElementById(id)?.classList.remove('input-error');
  });
}

// Muestra mensajes dentro del formulario para saber que paso.

function mostrar_alerta_modal_error(mensaje) {
  const el  = document.getElementById('modalAlertaError');
  const txt = document.getElementById('modalMensajeError');
  if (!el || !txt) return;
  txt.textContent = mensaje;
  el.classList.remove('hidden');
  document.getElementById('modalAlertaExito')?.classList.add('hidden');
}

function mostrar_alerta_modal_exito(mensaje) {
  const el  = document.getElementById('modalAlertaExito');
  const txt = document.getElementById('modalMensajeExito');
  if (!el || !txt) return;
  txt.textContent = mensaje;
  el.classList.remove('hidden');
  document.getElementById('modalAlertaError')?.classList.add('hidden');
}

function ocultar_alertas_modal() {
  document.getElementById('modalAlertaError')?.classList.add('hidden');
  document.getElementById('modalAlertaExito')?.classList.add('hidden');
}

// Mientras guarda, bloquea el boton para no tocarlo dos veces.

function set_cargando_btn(estado) {
  const btn     = document.getElementById('btnGuardar');
  const texto   = document.getElementById('btnGuardarTexto');
  const spinner = document.getElementById('btnGuardarSpinner');
  if (!btn) return;
  btn.disabled = estado;
  texto?.classList.toggle('hidden', estado);
  spinner?.classList.toggle('hidden', !estado);
}

// Muestra la ruedita de carga mientras llegan los contactos.

function mostrar_spinner(visible) {
  const elSpinner  = document.getElementById('spinnerContactos');
  const cuadricula = document.getElementById('contactosGrid');
  if (visible) {
    elSpinner?.classList.remove('hidden');
    cuadricula?.classList.add('hidden');
  } else {
    elSpinner?.classList.add('hidden');
    cuadricula?.classList.remove('hidden');
  }
}

// Muestra las acciones recientes en el panel lateral.

function renderizar_actividad(actividad) {
  const lista = document.getElementById('actividadLista');
  if (!lista) return;
  lista.innerHTML = '';

  if (!actividad?.length) {
    lista.innerHTML = '<p style="color:var(--text-light);font-size:.85rem;padding:20px 0;">Sin actividad registrada aún.</p>';
    return;
  }

  const ICONOS = { creado: '＋', editado: '✎', eliminado: '✕', favorito: '★' };

  actividad.forEach(item => {
    const div    = document.createElement('div');
    div.className = 'actividad-item';
    const icono  = ICONOS[item.tipo] || '·';
    const fecha  = new Date(item.fecha);
    const hora   = isNaN(fecha) ? item.fecha : fecha.toLocaleString('es-CR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    div.innerHTML = `
      <div class="actividad-icono">${icono}</div>
      <div class="actividad-texto">
        <p class="actividad-desc">${escapar_html(item.descripcion)}</p>
        <span class="actividad-hora">${hora}</span>
      </div>
    `;
    lista.appendChild(div);
  });
}

// Muestra los datos del usuario que entro.

function mostrar_usuario(usuario) {
  if (!usuario) return;
  const nombre    = `${usuario.name || ''} ${usuario.lastname || ''}`.trim();
  const iniciales = get_iniciales(usuario.name || '', usuario.lastname || '');

  set_texto('usuarioNombre', nombre || usuario.username || '–');
  set_texto('usuarioRol',    usuario.role || '–');

  const elAvatar = document.getElementById('usuarioAvatar');
  if (elAvatar) elAvatar.textContent = iniciales || (usuario.username?.[0] || 'U').toUpperCase();
}

// Muestra un mensaje cuando no hay resultados.

function mostrar_estado_vacio(seccion, mensaje) {
  const elVacio = seccion === 'contactos'
    ? document.getElementById('estadoVacio')
    : document.getElementById('estadoVacioFavoritos');
  const elSub   = document.getElementById('estadoVacioSub');
  if (elVacio) elVacio.classList.remove('hidden');
  if (elSub && mensaje) elSub.textContent = mensaje;
}

// Cosas pequenas para leer y escribir texto en la pagina.

function set_texto(id, texto) {
  const el = document.getElementById(id);
  if (el) el.textContent = texto;
}

function set_valor(id, valor) {
  const el = document.getElementById(id);
  if (el) el.value = valor;
}

function get_valor(id) {
  return document.getElementById(id)?.value || '';
}

function get_iniciales(nombre, apellido) {
  const n = (nombre?.[0]   || '').toUpperCase();
  const a = (apellido?.[0] || '').toUpperCase();
  return n + a || '?';
}

function escapar_html(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}
