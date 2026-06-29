'use strict';

// Pide el resumen y lo muestra en pantalla.
// El reporte es como una foto rapida de como esta la agenda.

document.addEventListener('DOMContentLoaded', iniciar);

async function iniciar() {
  await verificar_sesion();
  await cargar_reporte();
}

async function verificar_sesion() {
  try {
    const res = await fetch('/api/me');
    const datos = await res.json();
    if (!datos.success) {
      window.location.href = '/';
      return;
    }
    const nombre = `${datos.user.name || ''} ${datos.user.lastname || ''}`.trim();
    set_texto('usuarioNombre', nombre || '–');
    set_texto('usuarioRol', datos.user.role || '–');
    const av = document.getElementById('usuarioAvatar');
    if (av) av.textContent = (datos.user.name?.[0] || 'U').toUpperCase();
  } catch {
    window.location.href = '/';
  }
}

async function cargar_reporte() {
  mostrar_cargando(true);

  try {
    const res = await fetch('/api/reporte');
    const datos = await res.json();
    if (!datos.success) throw new Error(datos.message || 'No se pudo cargar el reporte');

    renderizar_reporte(datos.reporte || {});
  } catch {
    mostrar_error_reporte();
  } finally {
    mostrar_cargando(false);
  }
}

function renderizar_reporte(reporte) {
  // Con estos numeros se llenan las barras de favoritos y normales.
  const total = Number(reporte.total || 0);
  const favoritos = Number(reporte.favoritos || 0);
  const normales = Number(reporte.normales || 0);
  const porcentajeFav = total ? Math.round((favoritos / total) * 100) : 0;
  const porcentajeNormal = total ? 100 - porcentajeFav : 0;

  set_texto('rtTotal', total);
  set_texto('rtFavoritos', favoritos);
  set_texto('rtNormales', normales);
  set_texto('rtPorcentaje', `${porcentajeFav}%`);
  set_texto('leyendaFav', favoritos);
  set_texto('leyendaNormal', normales);

  set_barra('barraFavoritos', porcentajeFav);
  set_barra('barraNormales', porcentajeNormal);
  renderizar_categorias(reporte.por_categoria || {}, total);

  const fecha = new Date().toLocaleDateString('es-CR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  set_texto('reporteFecha', `Generado el ${fecha}`);
  document.getElementById('contenidoReporte')?.classList.remove('hidden');
}

function renderizar_categorias(porCategoria, totalContactos) {
  // Pone arriba las categorias que tienen mas contactos.
  const wrapper = document.getElementById('tablaCategoriasWrapper');
  if (!wrapper) return;

  const entradas = Object.entries(porCategoria)
    .sort((a, b) => b[1] - a[1]);

  wrapper.innerHTML = '';
  if (!entradas.length) {
    wrapper.innerHTML = '<p class="reporte-vacio">Sin contactos registrados.</p>';
    return;
  }

  const lista = document.createElement('div');
  lista.className = 'categoria-lista';

  entradas.forEach(([categoria, cantidad]) => {
    const porcentaje = totalContactos ? Math.round((cantidad / totalContactos) * 100) : 0;
    const fila = document.createElement('div');
    fila.className = 'categoria-row';
    fila.innerHTML = `
      <div class="categoria-top">
        <span class="categoria-nombre">${escapar(categoria)}</span>
        <span class="categoria-total">${cantidad} · ${porcentaje}%</span>
      </div>
      <div class="categoria-bar">
        <span class="categoria-bar-fill"></span>
      </div>
    `;
    fila.querySelector('.categoria-bar-fill').style.width = `${porcentaje}%`;
    lista.appendChild(fila);
  });

  wrapper.appendChild(lista);
}

function mostrar_cargando(estado) {
  document.getElementById('spinnerReporte')?.classList.toggle('hidden', !estado);
  document.getElementById('reporteError')?.classList.add('hidden');
  if (estado) {
    document.getElementById('contenidoReporte')?.classList.add('hidden');
  }
}

function mostrar_error_reporte() {
  document.getElementById('contenidoReporte')?.classList.add('hidden');
  document.getElementById('reporteError')?.classList.remove('hidden');
}

function imprimir_reporte() {
  window.print();
}

function set_barra(id, porcentaje) {
  const el = document.getElementById(id);
  if (el) el.style.width = `${Math.max(0, Math.min(100, porcentaje))}%`;
}

function set_texto(id, valor) {
  const el = document.getElementById(id);
  if (el) el.textContent = valor;
}

function escapar(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
