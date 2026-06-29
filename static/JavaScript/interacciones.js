// Guarda llamadas, notas y mensajes relacionados con un contacto.
'use strict';

// Aqui se guarda lo que ya se cargo del contacto que esta abierto.

let listaInteracciones = [];
let idContactoActual   = null;

const TIPOS_INTERACCION = [
  { valor: 'email',    label: 'Email enviado',     icono: svg_email()    },
  { valor: 'llamada',  label: 'Llamada realizada',  icono: svg_telefono() },
  { valor: 'reunion',  label: 'Reunión',             icono: svg_check()   },
  { valor: 'nota',     label: 'Nota interna',        icono: svg_lapiz()   },
  { valor: 'whatsapp', label: 'WhatsApp',            icono: svg_chat()    },
];

let tipoElegido = TIPOS_INTERACCION[0].valor;

// Esto se usa cuando se abre el detalle del contacto.
// Carga las notas o llamadas guardadas de ese contacto.

async function init_interacciones(idContacto) {
  idContactoActual = idContacto;
  await cargar_interacciones();
  iniciar_selector_tipo();
}

// Pide las conversaciones guardadas y las muestra.

async function cargar_interacciones() {
  const lista = document.getElementById('interaccionesLista');
  if (!lista) return;
  lista.innerHTML = '<div class="spinner-wrapper"><div class="spinner"></div></div>';

  try {
    const res  = await fetch(`/api/contactos/${idContactoActual}/interacciones`);
    const datos = await res.json();
    listaInteracciones = datos.success ? (datos.interacciones || []) : [];
  } catch {
    listaInteracciones = [];
  }

  renderizar_interacciones();
}

// Muestra cada registro en la lista.
// Si no hay nada, deja un mensaje diciendo que esta vacio.

function renderizar_interacciones() {
  const lista = document.getElementById('interaccionesLista');
  if (!lista) return;
  lista.innerHTML = '';

  if (!listaInteracciones.length) {
    lista.innerHTML = '<p class="int-vacio">Sin interacciones registradas aún.</p>';
    return;
  }

  listaInteracciones.forEach(item => {
    const cfg     = TIPOS_INTERACCION.find(t => t.valor === item.tipo) || TIPOS_INTERACCION[3];
    const esVerde = item.tipo === 'reunion';
    const div     = document.createElement('div');
    div.className = 'int-item';
    div.innerHTML = `
      <div class="int-icono ${esVerde ? 'int-icono-verde' : ''}">${cfg.icono}</div>
      <div class="int-cuerpo">
        <div class="int-header-row">
          <span class="int-tipo">${cfg.label}</span>
          <span class="int-fecha">${formatear_fecha(item.fecha)}</span>
        </div>
        ${item.descripcion ? `<p class="int-desc">${escapar(item.descripcion)}</p>` : ''}
        ${item.creado_por  ? `<span class="int-autor">Por: ${escapar(item.creado_por)}</span>` : ''}
      </div>
      <button class="int-eliminar" title="Eliminar" onclick="eliminar_interaccion('${item.id}')">✕</button>
    `;
    lista.appendChild(div);
  });
}

// Abre el formulario para agregar una llamada, nota o mensaje.
// Cuando se guarda, aparece arriba de la lista.

function abrir_modal_interaccion() {
  resetear_form_interaccion();
  document.getElementById('modalInteraccionOverlay')?.classList.remove('hidden');
}

function cerrar_modal_interaccion() {
  document.getElementById('modalInteraccionOverlay')?.classList.add('hidden');
}

function cerrar_interaccion_si_overlay(e) {
  if (e.target === e.currentTarget) cerrar_modal_interaccion();
}

// Crea los botones para escoger el tipo de registro.

function iniciar_selector_tipo() {
  const contenedor = document.getElementById('tipoInteraccionSelector');
  if (!contenedor) return;
  contenedor.innerHTML = '';
  TIPOS_INTERACCION.forEach((t, i) => {
    const btn = document.createElement('button');
    btn.type          = 'button';
    btn.className     = `int-tipo-btn ${i === 0 ? 'activo' : ''}`;
    btn.dataset.valor = t.valor;
    btn.innerHTML     = `${t.icono}<span>${t.label}</span>`;
    btn.onclick       = () => seleccionar_tipo(btn);
    contenedor.appendChild(btn);
  });
}

function seleccionar_tipo(btn) {
  document.querySelectorAll('.int-tipo-btn').forEach(b => b.classList.remove('activo'));
  btn.classList.add('activo');
  tipoElegido = btn.dataset.valor;
}

function resetear_form_interaccion() {
  tipoElegido = TIPOS_INTERACCION[0].valor;
  document.querySelectorAll('.int-tipo-btn').forEach((b, i) => b.classList.toggle('activo', i === 0));
  const elDesc = document.getElementById('intDescripcion');
  if (elDesc) elDesc.value = '';
  document.getElementById('intAlerta')?.classList.add('hidden');
}

// Guarda el nuevo registro y lo pone al inicio de la lista.

async function guardar_interaccion() {
  const descripcion = (document.getElementById('intDescripcion')?.value || '').trim();

  if (!descripcion) {
    const elAlerta = document.getElementById('intAlerta');
    const elTxt    = document.getElementById('intAlertaTxt');
    if (elAlerta && elTxt) { elTxt.textContent = 'La descripción es requerida'; elAlerta.classList.remove('hidden'); }
    return;
  }

  set_cargando(true);
  try {
    const res  = await fetch(`/api/contactos/${idContactoActual}/interacciones`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ tipo: tipoElegido, descripcion })
    });
    const datos = await res.json();

    if (!datos.success) {
      const elTxt    = document.getElementById('intAlertaTxt');
      const elAlerta = document.getElementById('intAlerta');
      if (elTxt && elAlerta) { elTxt.textContent = datos.mensaje || 'Error al guardar'; elAlerta.classList.remove('hidden'); }
      return;
    }

    listaInteracciones.unshift(datos.interaccion);
    renderizar_interacciones();
    cerrar_modal_interaccion();

  } catch {
    const elTxt    = document.getElementById('intAlertaTxt');
    const elAlerta = document.getElementById('intAlerta');
    if (elTxt && elAlerta) { elTxt.textContent = 'Error de conexión'; elAlerta.classList.remove('hidden'); }
  } finally {
    set_cargando(false);
  }
}

// Pregunta antes de borrar y luego quita el registro de la lista.

async function eliminar_interaccion(id) {
  if (!confirm('¿Eliminar esta interacción?')) return;
  try {
    const res  = await fetch(`/api/interacciones/${id}`, { method: 'DELETE' });
    const datos = await res.json();
    if (!datos.success) return;
    listaInteracciones = listaInteracciones.filter(i => i.id !== id);
    renderizar_interacciones();
  } catch { /* silencioso */ }
}

// Cosas pequenas que se usan varias veces en esta pantalla.

function formatear_fecha(iso) {
  if (!iso) return '–';
  const d    = new Date(iso);
  if (isNaN(d)) return iso;
  const diff = Math.floor((Date.now() - d) / 86400000);
  if (diff === 0) return `Hoy, ${d.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}`;
  if (diff === 1) return `Ayer, ${d.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}`;
  return d.toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function set_cargando(estado) {
  const btn  = document.getElementById('btnGuardarInt');
  const sp   = document.getElementById('intSpinner');
  const txt  = document.getElementById('intBtnTxt');
  if (btn) btn.disabled = estado;
  sp?.classList.toggle('hidden', !estado);
  txt?.classList.toggle('hidden', estado);
}

function escapar(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}


function svg_envolver(p) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${p}</svg>`; }
function svg_email()    { return svg_envolver('<rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/>'); }
function svg_telefono() { return svg_envolver('<path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.86 19.86 0 0 1 3.08 4.18 2 2 0 0 1 5.07 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L9.09 9.91a16 16 0 0 0 5 5l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>'); }
function svg_check()    { return svg_envolver('<polyline points="20 6 9 17 4 12"/>'); }
function svg_lapiz()    { return svg_envolver('<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>'); }
function svg_chat()     { return svg_envolver('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'); }
