// Filtros extra y buscador rapido de la pagina principal.
'use strict';

// Aqui se guarda lo que el usuario marco en los filtros.

let filtrosAvanzados = {
  categorias:    [],
  empresa:       '',
  ciudad:        '',
  pais:          '',
  fechaDesde:    '',
  fechaHasta:    '',
  soloFavoritos: false,
};

let panelVisible = false;

// Abre o cierra los filtros extra.
// Cuando se aplican, la lista cambia segun lo que se escogio.

function toggle_panel_avanzado() {
  panelVisible = !panelVisible;
  const panel = document.getElementById('panelAvanzado');
  const btn   = document.getElementById('btnFiltroAvanzado');

  panel?.classList.toggle('hidden', !panelVisible);
  btn?.classList.toggle('activo', panelVisible);
}

function aplicar_filtros_avanzados() {
  // Agarra todo lo que el usuario marco en el formulario.
  filtrosAvanzados.categorias = Array.from(
    document.querySelectorAll('.fa-categoria-check:checked')
  ).map(el => el.value);

  filtrosAvanzados.empresa       = (document.getElementById('faEmpresa')?.value    || '').trim().toLowerCase();
  filtrosAvanzados.ciudad        = (document.getElementById('faCiudad')?.value     || '').trim().toLowerCase();
  filtrosAvanzados.pais          = (document.getElementById('faPais')?.value       || '').trim().toLowerCase();
  filtrosAvanzados.fechaDesde    =  document.getElementById('faFechaDesde')?.value || '';
  filtrosAvanzados.fechaHasta    =  document.getElementById('faFechaHasta')?.value || '';
  filtrosAvanzados.soloFavoritos = !!document.getElementById('faSoloFavoritos')?.checked;

  // Muestra cuantos filtros estan activos.
  const total  = contar_filtros_activos();
  const elBadge = document.getElementById('badgeFiltros');
  if (elBadge) {
    elBadge.textContent = total;
    elBadge.classList.toggle('hidden', total === 0);
  }

  renderizar_contactos(get_contactos_avanzados());
}

function limpiar_filtros_avanzados() {
  filtrosAvanzados = { categorias: [], empresa: '', ciudad: '', pais: '', fechaDesde: '', fechaHasta: '', soloFavoritos: false };

  document.querySelectorAll('.fa-categoria-check').forEach(el => el.checked = false);
  ['faEmpresa','faCiudad','faPais','faFechaDesde','faFechaHasta'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const elFav = document.getElementById('faSoloFavoritos');
  if (elFav) elFav.checked = false;

  const elBadge = document.getElementById('badgeFiltros');
  if (elBadge) { elBadge.textContent = '0'; elBadge.classList.add('hidden'); }

  renderizar_contactos(get_contactos_filtrados());
}

function contar_filtros_activos() {
  let n = filtrosAvanzados.categorias.length;
  if (filtrosAvanzados.empresa)       n++;
  if (filtrosAvanzados.ciudad)        n++;
  if (filtrosAvanzados.pais)          n++;
  if (filtrosAvanzados.fechaDesde)    n++;
  if (filtrosAvanzados.fechaHasta)    n++;
  if (filtrosAvanzados.soloFavoritos) n++;
  return n;
}

// Primero usa la busqueda normal y despues aplica estos filtros extra.

function get_contactos_avanzados() {
  let resultado = get_contactos_filtrados();
  const filtros = filtrosAvanzados;

  if (filtros.categorias.length) {
    resultado = resultado.filter(c => filtros.categorias.includes(c.categoria));
  }
  if (filtros.empresa) {
    resultado = resultado.filter(c => (c.empresa || '').toLowerCase().includes(filtros.empresa));
  }
  if (filtros.ciudad) {
    resultado = resultado.filter(c => (c.ciudad || '').toLowerCase().includes(filtros.ciudad));
  }
  if (filtros.pais) {
    resultado = resultado.filter(c => (c.pais || '').toLowerCase().includes(filtros.pais));
  }
  if (filtros.fechaDesde) {
    const desde = new Date(filtros.fechaDesde);
    resultado = resultado.filter(c => c.creado_en && new Date(c.creado_en) >= desde);
  }
  if (filtros.fechaHasta) {
    const hasta = new Date(filtros.fechaHasta);
    hasta.setHours(23, 59, 59);
    resultado = resultado.filter(c => c.creado_en && new Date(c.creado_en) <= hasta);
  }
  if (filtros.soloFavoritos) {
    resultado = resultado.filter(c => c.es_favorito);
  }

  return resultado;
}

// Buscador flotante con Ctrl+K.
// Es como un atajo para ir directo a un contacto.

document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    abrir_flotante();
  }
  if (e.key === 'Escape') {
    cerrar_flotante();
  }
  if (!document.getElementById('buscadorFlotanteOverlay')?.classList.contains('hidden')) {
    if (e.key === 'ArrowDown') { e.preventDefault(); mover_seleccion(1); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); mover_seleccion(-1); }
    if (e.key === 'Enter')     { abrir_seleccionado(); }
  }
});

function abrir_flotante() {
  document.getElementById('buscadorFlotanteOverlay')?.classList.remove('hidden');
  const elInput = document.getElementById('inputBuscadorFlotante');
  if (elInput) { elInput.value = ''; elInput.focus(); }
  document.getElementById('resultadosFlotantes').innerHTML = '';
}

function cerrar_flotante() {
  document.getElementById('buscadorFlotanteOverlay')?.classList.add('hidden');
}

function cerrar_flotante_si_overlay(event) {
  if (event.target === event.currentTarget) cerrar_flotante();
}

let indiceSeleccionado = -1;

// Muestra pocos resultados para que no se llene toda la pantalla.

function buscar_flotante(texto) {
  const contenedor = document.getElementById('resultadosFlotantes');
  if (!contenedor) return;
  indiceSeleccionado = -1;

  if (!texto.trim()) {
    contenedor.innerHTML = '';
    return;
  }

  const consulta = texto.toLowerCase().trim();
  const colores  = {
    VIP:       { bg: '#d6ede6', color: '#1e6b45' },
    Cliente:   { bg: '#d6e5f0', color: '#2e5f8a' },
    Socio:     { bg: '#ddddf5', color: '#4c4fa0' },
    Prospecto: { bg: '#fef3d4', color: '#8a6a1f' },
  };

  const resultados = (listaContactos || []).filter(c =>
    `${c.nombre} ${c.apellido}`.toLowerCase().includes(consulta) ||
    (c.empresa || '').toLowerCase().includes(consulta)           ||
    (c.email   || '').toLowerCase().includes(consulta)
  ).slice(0, 8);

  if (!resultados.length) {
    contenedor.innerHTML = `<div class="flotante-vacio">Sin resultados para "${escapar(texto)}"</div>`;
    return;
  }

  contenedor.innerHTML = '';
  resultados.forEach(c => {
    const col      = colores[c.categoria] || { bg: '#e8ecf0', color: '#4a5568' };
    const iniciales = ((c.nombre?.[0] || '') + (c.apellido?.[0] || '')).toUpperCase();
    const div       = document.createElement('div');
    div.className   = 'flotante-resultado-item';
    div.dataset.id  = c.id;
    div.innerHTML   = `
      <div class="flotante-resultado-avatar" style="background:${col.bg};color:${col.color}">${iniciales}</div>
      <div class="flotante-resultado-info">
        <div class="flotante-resultado-nombre">${escapar(c.nombre)} ${escapar(c.apellido)}</div>
        <div class="flotante-resultado-sub">${escapar(c.empresa || '')}${c.categoria ? ` · ${escapar(c.categoria)}` : ''}</div>
      </div>
    `;
    div.addEventListener('click', () => {
      cerrar_flotante();
      abrir_detalle(c.id);
    });
    contenedor.appendChild(div);
  });
}

function mover_seleccion(delta) {
  const items = document.querySelectorAll('.flotante-resultado-item');
  if (!items.length) return;
  items[indiceSeleccionado]?.classList.remove('seleccionado');
  indiceSeleccionado = Math.max(0, Math.min(items.length - 1, indiceSeleccionado + delta));
  items[indiceSeleccionado]?.classList.add('seleccionado');
  items[indiceSeleccionado]?.scrollIntoView({ block: 'nearest' });
}

function abrir_seleccionado() {
  const items = document.querySelectorAll('.flotante-resultado-item');
  const item  = items[indiceSeleccionado];
  if (!item) return;
  cerrar_flotante();
  abrir_detalle(item.dataset.id);
}

function escapar(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
