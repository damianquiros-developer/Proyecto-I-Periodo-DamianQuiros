// Guarda la lista de contactos mientras la pagina esta abierta.
'use strict';

// Aqui queda la lista, el filtro y lo que se esta buscando.

let listaContactos = [];
let filtroActivo   = 'todos';
let textoBusqueda  = '';

const CATEGORIAS_VALIDAS = ['Familia', 'Trabajo', 'Amigos', 'VIP', 'Otro'];

// Carga contactos y actividad del usuario.

async function cargar_contactos() {
  try {
    mostrar_spinner(true);
    const res  = await fetch('/api/contactos');
    const datos = await res.json();

    if (!datos.success) throw new Error(datos.mensaje || 'Error al cargar contactos');

    listaContactos = datos.contactos;
    actualizar_meta();
    renderizar_contactos(get_contactos_filtrados());
    renderizar_favoritos();

  } catch (error) {
    console.error('[contactos] cargar_contactos:', error);
    mostrar_estado_vacio('contactos', 'Error al cargar. Intenta de nuevo.');
  } finally {
    mostrar_spinner(false);
  }
}

async function cargar_actividad() {
  try {
    const res  = await fetch('/api/actividad');
    const datos = await res.json();
    if (!datos.success) return;
    renderizar_actividad(datos.actividad);
  } catch (error) {
    console.error('[contactos] cargar_actividad:', error);
  }
}

// Estas funciones guardan cambios y devuelven lo que responde Python.

async function crear_contacto(datos) {
  const res = await fetch('/api/contactos/nuevo', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(datos)
  });
  return await res.json();
}

async function editar_contacto(id, datos) {
  const res = await fetch(`/api/contactos/${id}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(datos)
  });
  return await res.json();
}

async function eliminar_contacto(id) {
  const res = await fetch(`/api/contactos/${id}`, { method: 'DELETE' });
  return await res.json();
}

async function alternar_favorito(id) {
  const res = await fetch(`/api/contactos/${id}/favorito`, { method: 'POST' });
  return await res.json();
}

// El filtro trabaja con la lista ya cargada.
// Es como buscar en una copia local, por eso no carga todo cada vez.

function get_contactos_filtrados() {
  let resultado = listaContactos;

  if (filtroActivo !== 'todos') {
    resultado = resultado.filter(c => c.categoria === filtroActivo);
  }

  if (textoBusqueda.trim()) {
    const consulta = textoBusqueda.toLowerCase().trim();
    resultado = resultado.filter(c =>
      `${c.nombre} ${c.apellido}`.toLowerCase().includes(consulta) ||
      (c.empresa || '').toLowerCase().includes(consulta)           ||
      (c.cargo   || '').toLowerCase().includes(consulta)           ||
      (c.email   || '').toLowerCase().includes(consulta)
    );
  }

  return resultado;
}

function get_favoritos() {
  return listaContactos.filter(c => c.es_favorito);
}

function set_filtro(valor)   { filtroActivo  = valor; }
function set_busqueda(texto) { textoBusqueda = texto; }

// Revisa que el contacto tenga los datos necesarios.

function validar_formulario(datos) {
  const error = validar_datos_contacto(datos);
  if (error) return [error];

  if (datos.categoria && !CATEGORIAS_VALIDAS.includes(datos.categoria)) {
    return [{ campo: 'categoria', mensaje: 'Categoría inválida' }];
  }

  return [];
}

// Actualiza la lista que ya esta cargada sin volver a pedir todo.

function get_contacto_por_id(id) {
  return listaContactos.find(c => c.id === id) || null;
}

function actualizar_contacto_local(contactoActualizado) {
  const idx = listaContactos.findIndex(c => c.id === contactoActualizado.id);
  if (idx !== -1) listaContactos[idx] = contactoActualizado;
}

function eliminar_contacto_local(id) {
  listaContactos = listaContactos.filter(c => c.id !== id);
}

function agregar_contacto_local(contacto) {
  listaContactos.unshift(contacto);
}

// Actualiza los datos pequenos del encabezado, como total y fecha.

function actualizar_meta() {
  const elTotal = document.getElementById('totalContactos');
  if (elTotal) elTotal.textContent = listaContactos.length;

  const elFecha = document.getElementById('ultimaActualizacion');
  if (elFecha) {
    elFecha.textContent = new Date().toLocaleDateString('es-CR', { day: 'numeric', month: 'short' });
  }
}
