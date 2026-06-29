// Hace funcionar la pagina principal.
'use strict';

// Cuando abre la pagina, revisa si el usuario entro y carga los datos.

document.addEventListener('DOMContentLoaded', iniciar);

async function iniciar() {
  await verificar_sesion();
  await cargar_contactos();
  await cargar_actividad();
  if (typeof cargar_badge_recordatorios === 'function') cargar_badge_recordatorios();
}

async function verificar_sesion() {
  try {
    const res  = await fetch('/api/me');
    const datos = await res.json();
    if (!datos.success) {
      window.location.href = '/';
      return;
    }
    mostrar_usuario(datos.user);
  } catch {
    window.location.href = '/';
  }
}

// Cambia entre secciones del menu lateral.

function cambiar_seccion(event, nombreSeccion) {
  event.preventDefault();

  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('activo'));
  event.currentTarget.classList.add('activo');

  document.querySelectorAll('.seccion').forEach(el => el.classList.remove('activa'));
  document.getElementById(`seccion-${nombreSeccion}`)?.classList.add('activa');

  if (nombreSeccion === 'favoritos') renderizar_favoritos();

  return false;
}

// Busca contactos mientras el usuario escribe.

function aplicar_busqueda(texto) {
  set_busqueda(texto);
  renderizar_contactos(get_contactos_filtrados());

  const btnLimpiar = document.getElementById('btnLimpiarBusqueda');
  if (btnLimpiar) btnLimpiar.classList.toggle('hidden', !texto.trim());
}

function limpiar_busqueda() {
  const elInput = document.getElementById('inputBusqueda');
  if (elInput) elInput.value = '';
  aplicar_busqueda('');
}

// Muestra solo la categoria que el usuario escogio.

function aplicar_filtro(event, categoria) {
  document.querySelectorAll('.filtro-btn').forEach(btn => btn.classList.remove('activo'));
  event.currentTarget.classList.add('activo');

  set_filtro(categoria);
  renderizar_contactos(get_contactos_filtrados());
}

// Ordena la lista de A a Z.

let ordenAscendente = false;

function ordenar_az() {
  ordenAscendente = !ordenAscendente;
  const btn = document.getElementById('btnOrdenarAZ');

  const filtrados = get_contactos_filtrados().slice();
  if (ordenAscendente) {
    filtrados.sort((a, b) => `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`, 'es'));
    if (btn) btn.classList.add('activo');
  } else {
    if (btn) btn.classList.remove('activo');
  }

  renderizar_contactos(filtrados);
}

// Abre el formulario limpio para meter un contacto nuevo.

function abrir_modal_nuevo() {
  limpiar_formulario();
  set_texto('modalTitulo',     'Nuevo Contacto');
  set_texto('btnGuardarTexto', 'Guardar');
  document.getElementById('modalOverlay')?.classList.remove('hidden');
  document.getElementById('inputNombre')?.focus();
}

function cerrar_modal() {
  document.getElementById('modalOverlay')?.classList.add('hidden');
}

function cerrar_modal_si_overlay(event) {
  if (event.target === event.currentTarget) cerrar_modal();
}

// El mismo boton sirve para guardar nuevo o actualizar.
// Si ya venia con contacto, actualiza. Si no, crea uno nuevo.

async function guardar_contacto() {
  limpiar_errores_form();
  ocultar_alertas_modal();

  const datos   = get_datos_formulario();
  const errores = validar_formulario(datos);

  if (errores.length) {
    const error = errores[0];
    mostrar_alerta_modal_error(error.mensaje || error);
    const idCampo = id_campo_contacto('modal', error.campo);
    if (idCampo) marcar_error_campo(idCampo);
    return;
  }

  set_cargando_btn(true);

  try {
    const idExistente = get_valor('contactoId');
    let resultado;

    if (idExistente) {
      if (!confirmar_actualizacion_contacto()) return;
      resultado = await editar_contacto(idExistente, datos);
    } else {
      resultado = await crear_contacto(datos);
    }

    if (!resultado.success) {
      mostrar_alerta_modal_error(resultado.mensaje || 'Ocurrió un error');
      return;
    }

    if (idExistente) {
      actualizar_contacto_local(resultado.contacto);
    } else {
      agregar_contacto_local(resultado.contacto);
    }

    actualizar_meta();
    renderizar_contactos(get_contactos_filtrados());

    mostrar_alerta_modal_exito(idExistente ? 'Contacto actualizado correctamente' : 'Contacto creado correctamente');
    setTimeout(cerrar_modal, 1200);

  } catch (error) {
    console.error('[dashboard] guardar_contacto:', error);
    mostrar_alerta_modal_error('Error de conexión. Intenta de nuevo.');
  } finally {
    set_cargando_btn(false);
  }
}

// Abre la pantalla de mas informacion.

function abrir_detalle(id) {
  if (!id) return;
  window.location.href = `/contacto/detalle?id=${encodeURIComponent(id)}`;
}

// Prende o apaga la estrella de favorito.

async function handle_toggle_favorito(event, id) {
  event.stopPropagation();

  const btn      = event.currentTarget;
  const contacto = get_contacto_por_id(id);
  if (!contacto) return;

  try {
    const resultado = await alternar_favorito(id);
    if (!resultado.success) return;

    contacto.es_favorito = resultado.es_favorito;
    btn.textContent      = resultado.es_favorito ? '★' : '☆';
    btn.classList.toggle('es-favorito', resultado.es_favorito);
    btn.title = resultado.es_favorito ? 'Quitar de favoritos' : 'Marcar como favorito';

  } catch (error) {
    console.error('[dashboard] handle_toggle_favorito:', error);
  }
}

// Con Escape se cierra el formulario si esta abierto.

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!document.getElementById('modalOverlay')?.classList.contains('hidden')) cerrar_modal();
});
