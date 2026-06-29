'use strict';

// Pantalla para editar un contacto.
// El numero viene en la direccion y dice cual contacto abrir.

let idContacto = null;

document.addEventListener('DOMContentLoaded', iniciar);

async function iniciar() {
  await verificar_sesion();
  idContacto = new URLSearchParams(window.location.search).get('id');
  if (!idContacto) { window.location.href = '/dashboard'; return; }

  const urlDetalle = `/contacto/detalle?id=${idContacto}`;
  document.getElementById('btnVolver').href      = urlDetalle;
  document.getElementById('btnCancelar').onclick = () => window.location.href = urlDetalle;

  await cargar_contacto();
}

async function verificar_sesion() {
  try {
    const res   = await fetch('/api/me');
    const datos = await res.json();
    if (!datos.success) { window.location.href = '/'; return; }
    set_texto('usuarioNombre', `${datos.user.name || ''} ${datos.user.lastname || ''}`.trim());
    set_texto('usuarioRol', datos.user.role || '–');
    const av = document.getElementById('usuarioAvatar');
    if (av) av.textContent = (datos.user.name?.[0] || 'U').toUpperCase();
  } catch { window.location.href = '/'; }
}


async function cargar_contacto() {
  // Primero trae los datos actuales para llenar el formulario.
  try {
    const res   = await fetch(`/api/contactos/${idContacto}`);
    const datos = await res.json();
    if (!datos.success) { window.location.href = '/dashboard'; return; }
    poblar_formulario(datos.contacto);
  } catch {
    window.location.href = '/dashboard';
  }
}

function poblar_formulario(c) {
  set_valor('contactoId', c.id        || '');
  set_valor('fNombre',    c.nombre    || '');
  set_valor('fApellido',  c.apellido  || '');
  set_valor('fTelefono',  c.telefono  || '');
  set_valor('fEmail',     c.email     || '');
  set_valor('fDireccion', c.notas     || '');
  set_valor('fCategoria', c.categoria || '');
  set_valor('fEmpresa',   c.empresa   || '');
  set_valor('fCargo',     c.cargo     || '');
}


async function guardar_cambios() {
  // Antes de guardar pregunta, porque cambia datos que ya existian.
  limpiar_errores();
  ocultar_alerta();

  const datos = get_datos_formulario();
  const error = validar_datos_contacto(datos);
  if (error) {
    marcar_error(id_campo_contacto('f', error.campo));
    mostrar_alerta(error.mensaje);
    return;
  }

  if (!confirmar_actualizacion_contacto()) return;

  set_cargando(true);
  try {
    const res  = await fetch(`/api/contactos/${idContacto}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(datos),
    });
    const resp = await res.json();
    if (!resp.success) { mostrar_alerta(resp.mensaje || 'Error al guardar'); return; }
    mostrar_exito();
  } catch {
    mostrar_alerta('Error de conexión. Intenta de nuevo.');
  } finally {
    set_cargando(false);
  }
}

function ver_contacto() {
  window.location.href = `/contacto/detalle?id=${idContacto}`;
}

function mostrar_exito() {
  document.getElementById('vistaFormulario').classList.add('hidden');
  document.getElementById('vistaExito').classList.remove('hidden');
}


function get_datos_formulario() {
  return {
    nombre:    get_valor('fNombre').trim(),
    apellido:  get_valor('fApellido').trim(),
    telefono:  get_valor('fTelefono').trim(),
    email:     get_valor('fEmail').trim().toLowerCase(),
    notas:     get_valor('fDireccion').trim(),
    categoria: get_valor('fCategoria'),
    empresa:   get_valor('fEmpresa').trim(),
    cargo:     get_valor('fCargo').trim(),
  };
}


function mostrar_alerta(msg) {
  const el  = document.getElementById('alertaError');
  const txt = document.getElementById('alertaErrorTexto');
  if (!el || !txt) return;
  txt.textContent = msg;
  el.classList.remove('hidden');
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function ocultar_alerta() { document.getElementById('alertaError')?.classList.add('hidden'); }
function marcar_error(id) { document.getElementById(id)?.classList.add('input-error'); }
function limpiar_errores() { document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error')); }

function set_cargando(estado) {
  const btn     = document.querySelector('.btn-guardar-form');
  const texto   = document.getElementById('guardarTexto');
  const spinner = document.getElementById('guardarSpinner');
  if (btn) btn.disabled = estado;
  texto?.classList.toggle('hidden', estado);
  spinner?.classList.toggle('hidden', !estado);
}

function set_texto(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function set_valor(id, val) { const el = document.getElementById(id); if (el) el.value = val; }
function get_valor(id)      { return document.getElementById(id)?.value || ''; }
