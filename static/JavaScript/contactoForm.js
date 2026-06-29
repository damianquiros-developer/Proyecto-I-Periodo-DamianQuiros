'use strict';

// Reglas del formulario de contacto.
// Se usa en nuevo, editar y en el formulario de la pagina principal.

const CONTACTO_CONFIRMAR_ACTUALIZAR =
  '¿Está seguro/a que desea actualizar la información del contacto?\nEsta acción no puede ser revertida.';

const CONTACTO_CAMPOS_IDS = {
  f: {
    nombre: 'fNombre',
    apellido: 'fApellido',
    telefono: 'fTelefono',
    email: 'fEmail',
    categoria: 'fCategoria',
  },
  modal: {
    nombre: 'inputNombre',
    apellido: 'inputApellido',
    telefono: 'inputTelefono',
    email: 'inputEmail',
    categoria: 'inputCategoria',
  },
};

function validar_datos_contacto(d) {
  if (!d.nombre?.trim()) {
    return { campo: 'nombre', mensaje: 'El nombre es requerido.' };
  }
  if (!d.apellido?.trim()) {
    return { campo: 'apellido', mensaje: 'El apellido es requerido.' };
  }
  if (!d.telefono?.trim()) {
    return { campo: 'telefono', mensaje: 'El teléfono es requerido.' };
  }
  if (!validar_telefono_contacto(d.telefono)) {
    return { campo: 'telefono', mensaje: 'El número de teléfono debe tener exactamente 8 dígitos.' };
  }
  if (!d.email?.trim()) {
    return { campo: 'email', mensaje: 'El correo es requerido.' };
  }
  if (!validar_correo_contacto(d.email)) {
    return { campo: 'email', mensaje: 'El formato del correo no es válido (debe contener @ y un dominio).' };
  }
  if (!d.categoria) {
    return { campo: 'categoria', mensaje: 'La categoría es requerida.' };
  }
  return null;
}

function validar_telefono_contacto(tel) {
  return String(tel || '').replace(/\D/g, '').length === 8;
}

function validar_correo_contacto(correo) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo || '');
}

function id_campo_contacto(grupo, campo) {
  return CONTACTO_CAMPOS_IDS[grupo]?.[campo] || '';
}

function confirmar_actualizacion_contacto() {
  return confirm(CONTACTO_CONFIRMAR_ACTUALIZAR);
}
