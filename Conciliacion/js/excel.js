const Excel = (function () {
  function leerArchivoExcel(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = function (e) {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];

          if (!firstSheetName) {
            reject(new Error('El archivo no contiene hojas.'));
            return;
          }

          const worksheet = workbook.Sheets[firstSheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet, { defval: null, raw: false });
          const headerRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null, raw: false });
          const headers = headerRows.length > 0
            ? headerRows[0].map((h) => String(h ?? '').trim())
            : [];

          resolve({ rows, headers });
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = function () {
        reject(new Error('No fue posible leer el archivo.'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  function normalizarEncabezado(valor) {
    return String(valor ?? '')
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9Ñ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function buscarColumna(headers, aliasPosibles) {
    const headersNormales = headers.map((h) => ({
      original: h,
      normalizado: normalizarEncabezado(h)
    }));

    for (const alias of aliasPosibles) {
      const aliasNormalizado = normalizarEncabezado(alias);
      if (!aliasNormalizado) continue;

      const encontrada = headersNormales.find((h) => {
        if (h.normalizado === aliasNormalizado) return true;
        return aliasNormalizado.length > 3 && h.normalizado.includes(aliasNormalizado);
      });

      if (encontrada) return encontrada.original;
    }

    return null;
  }

  function validarColumnas(archivo, mapeoRequerido, nombreArchivo) {
    const filas = archivo.rows || [];
    let headers = archivo.headers || [];

    if (!headers.length && filas.length) {
      headers = Object.keys(filas[0]);
    }

    headers = headers.map((h) => String(h));

    const encontradas = [];
    const faltantes = [];
    const mapeo = {};

    for (const [clave, alias] of Object.entries(mapeoRequerido)) {
      const columna = buscarColumna(headers, alias);
      if (columna) {
        mapeo[clave] = columna;
        encontradas.push(columna);
      } else {
        faltantes.push({ clave, alias: alias[0] || clave });
      }
    }

    return {
      ok: faltantes.length === 0,
      faltantes,
      encontradas,
      mapeo,
      headers
    };
  }

  function generarReporteExcel(resultados, inconsistencias) {
    const diferencias = resultados.filter((r) => r.estado === 'DIFERENCIA');

    const datosDiferencias = diferencias.map((r) => ({
      Documento: r.documento,
      Nombre: r.nombre,
      'No. Tarjeta': r.tarjeta,
      'Saldo en Contabilidad': r.saldoAjustado ?? 0,
      'Saldo en Tesorería': r.saldoTesoreria ?? 0,
      Diferencia: r.diferencia ?? 0
    }));

    const datosDetalle = resultados.map((r) => ({
      Documento: r.documento,
      Nombre: r.nombre,
      'Número de tarjeta': r.tarjeta,
      'Saldo original Contabilidad': r.saldoContabilidad ?? '',
      'Total consumos': r.consumos ?? 0,
      'Saldo Contable Ajustado': r.saldoAjustado ?? '',
      'Saldo Tesorería': r.saldoTesoreria ?? '',
      Diferencia: r.diferencia ?? '',
      Estado: r.estado,
      Observaciones: r.detalle || ''
    }));

    const datosInconsistencias = inconsistencias.map((i) => ({
      Tipo: i.tipo,
      Documento: i.documento || '',
      'Número de tarjeta': i.tarjeta || '',
      Detalle: i.detalle || '',
      Fila: i.fila || ''
    }));

    const libro = XLSX.utils.book_new();
    const hojaDiferencias = XLSX.utils.json_to_sheet(datosDiferencias);
    XLSX.utils.book_append_sheet(libro, hojaDiferencias, 'Diferencias');

    const hojaDetalle = XLSX.utils.json_to_sheet(datosDetalle);
    XLSX.utils.book_append_sheet(libro, hojaDetalle, 'Detalle');

    if (datosInconsistencias.length) {
      const hojaInconsistencias = XLSX.utils.json_to_sheet(datosInconsistencias);
      XLSX.utils.book_append_sheet(libro, hojaInconsistencias, 'Inconsistencias');
    }

    XLSX.writeFile(libro, 'reporte_conciliacion.xlsx');
  }

  return {
    leerArchivoExcel,
    normalizarEncabezado,
    buscarColumna,
    validarColumnas,
    generarReporteExcel
  };
})();

window.Excel = Excel;