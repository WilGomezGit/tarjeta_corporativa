const UI = (function () {
  let resultadosActuales = [];
  let inconsistenciasActuales = [];
  let sortKey = 'documento';
  let sortDir = 'asc';

  const estadoBadge = {
    CONCILIADO: 'success',
    DIFERENCIA: 'danger',
    INCONSISTENCIA: 'warning'
  };

  function init() {
    document.querySelectorAll('#tablaResultados th[data-sort]').forEach((th) => {
      th.addEventListener('click', () => {
        const clave = th.dataset.sort;
        if (sortKey === clave) {
          sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          sortKey = clave;
          sortDir = 'asc';
        }
        actualizarIconosOrden();
        renderTabla();
      });
    });

    ['buscarDocumento', 'buscarNombre', 'buscarTarjeta'].forEach((id) => {
      document.getElementById(id).addEventListener('input', renderTabla);
    });

    document.getElementById('checkSoloDiferencias').addEventListener('change', renderTabla);
    document.getElementById('btnLimpiarFiltros').addEventListener('click', limpiarFiltros);
  }

  function actualizarIconosOrden() {
    document.querySelectorAll('#tablaResultados th[data-sort]').forEach((th) => {
      th.classList.remove('sorted-asc', 'sorted-desc');
      if (th.dataset.sort === sortKey) {
        th.classList.add(sortDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
      }
    });
  }

  function limpiarFiltros() {
    document.getElementById('buscarDocumento').value = '';
    document.getElementById('buscarNombre').value = '';
    document.getElementById('buscarTarjeta').value = '';
    document.getElementById('checkSoloDiferencias').checked = false;
    renderTabla();
  }

  function filtrarYOrdenar() {
    const textoDocumento = document.getElementById('buscarDocumento').value.trim().toLowerCase();
    const textoNombre = document.getElementById('buscarNombre').value.trim().toLowerCase();
    const textoTarjeta = document.getElementById('buscarTarjeta').value.trim().toLowerCase();
    const soloDiferencias = document.getElementById('checkSoloDiferencias').checked;

    let datos = [...resultadosActuales];

    if (textoDocumento) {
      datos = datos.filter((r) => String(r.documento || '').toLowerCase().includes(textoDocumento));
    }
    if (textoNombre) {
      datos = datos.filter((r) => String(r.nombre || '').toLowerCase().includes(textoNombre));
    }
    if (textoTarjeta) {
      datos = datos.filter((r) => String(r.tarjeta || '').toLowerCase().includes(textoTarjeta));
    }
    if (soloDiferencias) {
      datos = datos.filter((r) => r.estado === 'DIFERENCIA');
    }

    datos.sort((a, b) => {
      const valorA = a[sortKey];
      const valorB = b[sortKey];

      if (valorA === null || valorA === undefined) return 1;
      if (valorB === null || valorB === undefined) return -1;

      if (typeof valorA === 'number' && typeof valorB === 'number') {
        return sortDir === 'asc' ? valorA - valorB : valorB - valorA;
      }

      const comparacion = String(valorA).localeCompare(String(valorB), 'es', { numeric: true });
      return sortDir === 'asc' ? comparacion : -comparacion;
    });

    return datos;
  }

  function renderTabla() {
    const datos = filtrarYOrdenar();
    const tbody = document.getElementById('tablaResultadosBody');
    tbody.innerHTML = '';

    if (!datos.length) {
      const fila = document.createElement('tr');
      fila.innerHTML = '<td colspan="9" class="text-center">No hay registros para mostrar.</td>';
      tbody.appendChild(fila);
      actualizarContador(0);
      return;
    }

    datos.forEach((resultado) => {
      const fila = document.createElement('tr');
      fila.className = `estado-${resultado.estado.toLowerCase()}`;
      fila.setAttribute('title', resultado.detalle || '');

      fila.innerHTML = `
        <td>${escapeHtml(resultado.documento)}</td>
        <td>${escapeHtml(resultado.nombre)}</td>
        <td>${escapeHtml(resultado.tarjeta)}</td>
        <td class="numeric">${formatoMoneda(resultado.saldoContabilidad)}</td>
        <td class="numeric">${formatoMoneda(resultado.consumos)}</td>
        <td class="numeric">${formatoMoneda(resultado.saldoAjustado)}</td>
        <td class="numeric">${formatoMoneda(resultado.saldoTesoreria)}</td>
        <td class="numeric">${formatoMoneda(resultado.diferencia)}</td>
        <td><span class="badge badge-${estadoBadge[resultado.estado] || 'secondary'}">${resultado.estado}</span></td>
      `;

      tbody.appendChild(fila);
    });

    actualizarContador(datos.length);
  }

  function actualizarContador(cantidad) {
    const total = resultadosActuales.length;
    document.getElementById('resultadosCount').textContent =
      `Mostrando ${cantidad} de ${total} registros.`;
  }

  function mostrarResultados(resultados, inconsistencias) {
    resultadosActuales = resultados || [];
    inconsistenciasActuales = inconsistencias || [];
    sortKey = 'documento';
    sortDir = 'asc';
    document.getElementById('resultadosSection').hidden = false;
    renderTabla();
  }

  function mostrarInconsistencias(inconsistencias) {
    inconsistenciasActuales = inconsistencias || [];
    const tbody = document.getElementById('tablaInconsistenciasBody');
    tbody.innerHTML = '';
    document.getElementById('inconsistenciasSection').hidden = false;

    if (!inconsistenciasActuales.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center">No se detectaron inconsistencias.</td></tr>';
      return;
    }

    inconsistenciasActuales.forEach((item) => {
      const fila = document.createElement('tr');
      fila.innerHTML = `
        <td><span class="badge badge-warning">${escapeHtml(item.tipo)}</span></td>
        <td>${escapeHtml(item.documento || '')}</td>
        <td>${escapeHtml(item.tarjeta || '')}</td>
        <td>${escapeHtml(item.detalle || '')}</td>
      `;
      tbody.appendChild(fila);
    });
  }

  function mostrarResumen(resumen) {
    document.getElementById('resumenTercerosCont').textContent = resumen.totalTercerosContabilidad.toLocaleString('es-CO');
    document.getElementById('resumenTercerosTes').textContent = resumen.totalTercerosTesoreria.toLocaleString('es-CO');
    document.getElementById('resumenConciliados').textContent = resumen.totalConciliados.toLocaleString('es-CO');
    document.getElementById('resumenDiferencias').textContent = resumen.totalDiferencias.toLocaleString('es-CO');
    document.getElementById('resumenConsumos').textContent = resumen.totalConsumosProcesados.toLocaleString('es-CO');
    document.getElementById('resumenValorConsumos').textContent = formatoMoneda(resumen.valorTotalConsumos);
    document.getElementById('resumenInconsistencias').textContent = resumen.totalInconsistencias.toLocaleString('es-CO');
    document.getElementById('resumenSection').hidden = false;
  }

  function actualizarEstadoArchivo(tipo, mensaje, ok) {
    const elemento = document.getElementById(`estado-${tipo}`);
    if (elemento) {
      elemento.textContent = mensaje;
      elemento.className = `file-status ${ok ? 'success' : 'error'}`;
    }

    const tarjeta = document.getElementById(`card-${tipo}`);
    if (tarjeta) {
      tarjeta.classList.toggle('has-error', !ok);
    }
  }

  function mostrarMensaje(mensaje, tipo = 'info') {
    const contenedor = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.textContent = mensaje;
    contenedor.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  function formatoMoneda(valor) {
    if (valor === null || valor === undefined || isNaN(valor)) return '—';
    const numero = Number(valor);
    const esNegativo = numero < 0;
    const valorAbsoluto = Math.abs(numero).toFixed(2);
    const [entero, decimal] = valorAbsoluto.split('.');
    const enteroConPuntos = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const resultado = `$${enteroConPuntos},${decimal}`;
    return esNegativo ? `-${resultado}` : resultado;
  }

  function escapeHtml(texto) {
    if (texto === null || texto === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(texto);
    return div.innerHTML;
  }

  return {
    init,
    mostrarMensaje,
    mostrarResumen,
    mostrarResultados,
    mostrarInconsistencias,
    actualizarEstadoArchivo,
    formatoMoneda,
    escapeHtml,
    limpiarFiltros
  };
})();

window.UI = UI;
