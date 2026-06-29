// Muestra y cambia los datos del usuario.
'use strict';

// Aqui se guardan los datos que ya se cargaron.

let usuarioActual = null;

// Al abrir la pagina se llenan los campos del perfil.

document.addEventListener('DOMContentLoaded', iniciar);

async function iniciar() {
  await cargar_usuario();
}

async function cargar_usuario() {
  try {
    const res  = await fetch('/api/me');
    const datos = await res.json();
    if (!datos.success) { window.location.href = '/'; return; }
    usuarioActual = datos.user;
    poblar_perfil(datos.user);
  } catch { window.location.href = '/'; }
}

// Pone la informacion actual en la pantalla.

function poblar_perfil(u) {
  const nombreCompleto = `${u.name || ''} ${u.lastname || ''}`.trim();
  const inicial        = (u.name?.[0] || u.username?.[0] || 'U').toUpperCase();

  // Datos del menu lateral.
  set_texto('usuarioNombre', nombreCompleto || u.username || '–');
  set_texto('usuarioRol',    u.role || '–');
  const elAvatarSide = document.getElementById('usuarioAvatar');
  if (elAvatarSide) elAvatarSide.textContent = inicial;

  // Datos de arriba del perfil.
  set_texto('perfilNombreDisplay', `${nombreCompleto} `);
  set_texto('perfilRolDisplay',    `${capitalizar(u.role || '')} · FIDUCCI`);
  const elAvatarPerfil = document.getElementById('perfilAvatar');
  if (elAvatarPerfil) elAvatarPerfil.textContent = inicial;

  // Campos que el usuario puede cambiar.
  set_valor('pNombre',   u.name     || '');
  set_valor('pApellido', u.lastname || '');
  set_valor('pEmail',    u.email    || '');
  set_valor('pTelefono', u.telefono || '');
  set_valor('pCargo',    u.cargo    || capitalizar(u.role || ''));
  set_valor('pEmpresa',  u.empresa  || 'FIDUCCI');
}

// Revisa los campos y guarda los cambios.

async function guardar_perfil() {
  limpiar_errores();
  ocultar_alerta();

  const datos = get_datos_formulario();
  const error = validar(datos);
  if (error) { mostrar_alerta(error); return; }

  set_cargando(true);
  try {
    const res  = await fetch('/api/perfil', {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(datos)
    });
    const resp = await res.json();

    if (!resp.success) {
      mostrar_alerta(resp.mensaje || 'Error al guardar');
      return;
    }

    usuarioActual = resp.user;
    poblar_perfil(resp.user);

    // Borra las contrasenas escritas cuando todo salio bien.
    set_valor('pPwActual',  '');
    set_valor('pPwNueva',   '');
    set_valor('pPwConfirm', '');

    mostrar_exito_inline('Perfil actualizado correctamente');

  } catch {
    mostrar_alerta('Error de conexión. Intenta de nuevo.');
  } finally {
    set_cargando(false);
  }
}

// Cierra la cuenta y vuelve al inicio.

async function cerrar_sesion() {
  try {
    await fetch('/api/logout', { method: 'POST' });
  } catch { /* silencioso */ }
  window.location.href = '/';
}

// Muestra un aviso verde por unos segundos.

function mostrar_exito_inline(msg) {
  const el  = document.getElementById('alertaExito');
  const txt = document.getElementById('alertaExitoTexto');
  if (!el || !txt) return;
  txt.textContent = msg;
  el.classList.remove('hidden');
  document.getElementById('alertaError')?.classList.add('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}

// Revisa los datos antes de guardar.
// La contrasena solo se revisa si el usuario la quiso cambiar.

function get_datos_formulario() {
  const pwActual  = get_valor('pPwActual');
  const pwNueva   = get_valor('pPwNueva');
  const pwConfirm = get_valor('pPwConfirm');

  const datos = {
    nombre:   get_valor('pNombre').trim(),
    apellido: get_valor('pApellido').trim(),
    email:    get_valor('pEmail').trim().toLowerCase(),
    telefono: get_valor('pTelefono').trim(),
    cargo:    get_valor('pCargo').trim(),
    empresa:  get_valor('pEmpresa').trim(),
  };

  if (pwActual || pwNueva || pwConfirm) {
    datos.pw_actual  = pwActual;
    datos.pw_nueva   = pwNueva;
    datos.pw_confirm = pwConfirm;
  }

  return datos;
}

function validar(d) {
  if (!d.nombre)   { marcar_error('pNombre');   return 'El nombre es requerido'; }
  if (!d.apellido) { marcar_error('pApellido'); return 'El apellido es requerido'; }
  if (!d.email)    { marcar_error('pEmail');    return 'El correo es requerido'; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) {
    marcar_error('pEmail');
    return 'El formato del correo no es válido';
  }

  if ('pw_nueva' in d) {
    if (!d.pw_actual)              { marcar_error('pPwActual');  return 'Ingresa tu contraseña actual'; }
    if (d.pw_nueva.length < 8)     { marcar_error('pPwNueva');   return 'La nueva contraseña debe tener al menos 8 caracteres'; }
    if (d.pw_nueva !== d.pw_confirm){ marcar_error('pPwConfirm'); return 'Las contraseñas no coinciden'; }
  }

  return null;
}

// Cosas pequenas para avisos, errores y campos.

function mostrar_alerta(msg) {
  const el  = document.getElementById('alertaError');
  const txt = document.getElementById('alertaErrorTexto');
  if (!el || !txt) return;
  txt.textContent = msg;
  el.classList.remove('hidden');
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function ocultar_alerta()  { document.getElementById('alertaError')?.classList.add('hidden'); }
function marcar_error(id)  { document.getElementById(id)?.classList.add('input-error'); }
function limpiar_errores() { document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error')); }

function set_cargando(estado) {
  const btn     = document.querySelector('.btn-guardar-perfil');
  const texto   = document.getElementById('guardarTexto');
  const spinner = document.getElementById('guardarSpinner');
  if (btn) btn.disabled = estado;
  texto?.classList.toggle('hidden', estado);
  spinner?.classList.toggle('hidden', !estado);
}

function capitalizar(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''; }
function set_texto(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function set_valor(id, val) { const el = document.getElementById(id); if (el) el.value = val; }
function get_valor(id)      { return document.getElementById(id)?.value || ''; }
