(function () {
  const estado = {
    archivos: { contabilidad: null, tesoreria: null, consumos: null },
    filas: { contabilidad: [], tesoreria: [], consumos: [] },
    cargado: { contabilidad: false, tesoreria: false, consumos: false },
    validos: { contabilidad: false, tesoreria: false, consumos: false },
    mapeos: { contabilidad: null, tesoreria: null, consumos: null },
    resultados: null,
    inconsistencias: null
  };

  const nombres = {
    contabilidad: 'Contabilidad',
    tesoreria: 'Tesorería',
    consumos: 'Consumos'
  };

  document.addEventListener('DOMContentLoaded', () => {
    UI.init();

    document.getElementById('inputContabilidad').addEventListener('change', (e) => manejarArchivo('contabilidad', e.target.files[0]));
    document.getElementById('inputTesoreria').addEventListener('change', (e) => manejarArchivo('tesoreria', e.target.files[0]));
    document.getElementById('inputConsumos').addEventListener('change', (e) => manejarArchivo('consumos', e.target.files[0]));

    document.getElementById('btnProcesar').addEventListener('click', ejecutarConciliacion);
    document.getElementById('btnDescargar').addEventListener('click', descargarReporte);
    document.getElementById('btnReiniciar').addEventListener('click', reiniciarTodo);
  });

  async function manejarArchivo(tipo, archivo) {
    if (!archivo) return;

    estado.archivos[tipo] = archivo;
    estado.cargado[tipo] = true;
    estado.validos[tipo] = false;

    try {
      const datosArchivo = await Excel.leerArchivoExcel(archivo);
      estado.filas[tipo] = datosArchivo.rows;

      const validacion = Excel.validarColumnas(datosArchivo, Conciliacion.MAPEOS[tipo], nombres[tipo]);
      estado.mapeos[tipo] = validacion.mapeo;

      if (validacion.ok) {
        estado.validos[tipo] = true;
        UI.actualizarEstadoArchivo(
          tipo,
          `${archivo.name} cargado correctamente (${datosArchivo.rows.length} filas)`,
          true
        );
        UI.mostrarMensaje(`✅ Archivo de ${nombres[tipo]} cargado correctamente.`, 'success');
      } else {
        const faltantes = validacion.faltantes.map((f) => `"${f.alias}"`).join(', ');
        UI.actualizarEstadoArchivo(tipo, `Faltan columnas: ${faltantes}.`, false);
        UI.mostrarMensaje(
          `⚠️ El archivo de ${nombres[tipo]} no contiene las columnas obligatorias: ${faltantes}.`,
          'error'
        );
      }
    } catch (error) {
      estado.validos[tipo] = false;
      UI.actualizarEstadoArchivo(tipo, 'Error al leer archivo.', false);
      UI.mostrarMensaje(`❌ No fue posible leer el archivo de ${nombres[tipo]}: ${error.message}`, 'error');
    }
  }

  function ejecutarConciliacion() {
    // Validar archivos obligatorios
    if (!estado.cargado.contabilidad || !estado.validos.contabilidad) {
      UI.mostrarMensaje('⚠️ Por favor cargue el archivo de Contabilidad válido.', 'error');
      return;
    }
    if (!estado.cargado.tesoreria || !estado.validos.tesoreria) {
      UI.mostrarMensaje('⚠️ Por favor cargue el archivo de Tesorería válido.', 'error');
      return;
    }
    if (estado.cargado.consumos && !estado.validos.consumos) {
      UI.mostrarMensaje('⚠️ El archivo de Consumos cargado no es válido. Corríjalo o recárguelo.', 'error');
      return;
    }

    const overlay = document.getElementById('overlayProcesando');
    const boton = document.getElementById('btnProcesar');

    overlay.hidden = false;
    boton.disabled = true;
    UI.mostrarMensaje('⏳ Procesando información...', 'info');

    setTimeout(() => {
      try {
        const contabilidad = Conciliacion.normalizarContabilidad(
          estado.filas.contabilidad,
          estado.mapeos.contabilidad
        );
        const tesoreria = Conciliacion.normalizarTesoreria(
          estado.filas.tesoreria,
          estado.mapeos.tesoreria
        );
        // Consumos opcional: si no está cargado o no válido, usar array vacío
        const consumos = estado.cargado.consumos && estado.validos.consumos
          ? Conciliacion.normalizarConsumos(estado.filas.consumos, estado.mapeos.consumos)
          : [];

        const resultado = Conciliacion.realizarConciliacion(contabilidad, tesoreria, consumos);
        estado.resultados = resultado.resultados;
        estado.inconsistencias = resultado.inconsistencias;

        UI.mostrarResumen(resultado.resumen);
        UI.mostrarResultados(resultado.resultados, resultado.inconsistencias);
        UI.mostrarInconsistencias(resultado.inconsistencias);

        document.getElementById('btnDescargar').hidden = false;

        UI.mostrarMensaje(
          `✅ Conciliación completada: ${resultado.resumen.totalConciliados} conciliados, ` +
          `${resultado.resumen.totalDiferencias} diferencias, ` +
          `${resultado.resumen.totalInconsistencias} inconsistencias.`,
          'success'
        );
      } catch (error) {
        console.error(error);
        UI.mostrarMensaje('❌ Ocurrió un error durante la conciliación.', 'error');
      } finally {
        overlay.hidden = true;
        boton.disabled = false;
      }
    }, 50);
  }

  function descargarReporte() {
    if (!estado.resultados) {
      UI.mostrarMensaje('No hay resultados para descargar.', 'error');
      return;
    }

    try {
      Excel.generarReporteExcel(estado.resultados, estado.inconsistencias);
      UI.mostrarMensaje('📥 Reporte de diferencias generado correctamente.', 'success');
    } catch (error) {
      console.error(error);
      UI.mostrarMensaje('❌ No fue posible generar el reporte.', 'error');
    }
  }

  function reiniciarTodo() {
    // Limpiar inputs de archivo
    document.getElementById('inputContabilidad').value = '';
    document.getElementById('inputTesoreria').value = '';
    document.getElementById('inputConsumos').value = '';

    // Resetear estado
    estado.archivos = { contabilidad: null, tesoreria: null, consumos: null };
    estado.filas = { contabilidad: [], tesoreria: [], consumos: [] };
    estado.cargado = { contabilidad: false, tesoreria: false, consumos: false };
    estado.validos = { contabilidad: false, tesoreria: false, consumos: false };
    estado.mapeos = { contabilidad: null, tesoreria: null, consumos: null };
    estado.resultados = null;
    estado.inconsistencias = null;

    // Actualizar UI de estados de archivo
    UI.actualizarEstadoArchivo('contabilidad', 'Sin cargar', true);
    UI.actualizarEstadoArchivo('tesoreria', 'Sin cargar', true);
    UI.actualizarEstadoArchivo('consumos', 'Sin cargar (opcional)', true);

    // Ocultar secciones de resultados
    document.getElementById('resumenSection').hidden = true;
    document.getElementById('resultadosSection').hidden = true;
    document.getElementById('inconsistenciasSection').hidden = true;
    document.getElementById('btnDescargar').hidden = true;

    // Limpiar tablas
    document.getElementById('tablaResultadosBody').innerHTML = '';
    document.getElementById('tablaInconsistenciasBody').innerHTML = '';
    document.getElementById('resultadosCount').textContent = '';

    // Limpiar filtros
    UI.limpiarFiltros();

    // Limpiar toasts
    document.getElementById('toastContainer').innerHTML = '';

    // Mostrar mensaje de reinicio
    UI.mostrarMensaje('🔄 Aplicación reiniciada correctamente.', 'info');
  }
})();