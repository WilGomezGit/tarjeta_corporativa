const Conciliacion = (function () {
  const MAPEOS = {
    contabilidad: {
      documento: ['DOCUMENTO', 'CEDULA', 'DOC'],
      nombre: ['APELLIDOS Y NOMBRES', 'NOMBRES', 'NOMBRE', 'APELLIDOS'],
      saldo: ['SALDO']
    },
    tesoreria: {
      documento: ['CEDULA TRABAJADOR', 'CEDULA', 'DOCUMENTO'],
      tarjeta: ['NUMERO TARJETA', 'NO DE TARJETA', 'TARJETA', 'NRO TARJETA'],
      bolsillo: ['BOLSILLO'],
      saldo: ['SALDO'],
      ultimaCarga: ['ULTIMA CARGA TARJETA COMFACAUCA'],
      ultimoCobro: ['ULTIMO COBRO USUARIO']
    },
    consumos: {
      numero: ['N°', 'N', 'NO'],
      tarjeta: ['NO DE TARJETA', 'NUMERO TARJETA', 'TARJETA', 'NRO TARJETA'],
      valor: ['VALOR'],
      fecha: ['FECHA'],
      codigoUnico: ['CODIGO UNICO', 'CODIGO'],
      establecimiento: ['ESTABLECIMIENTO']
    }
  };

  function redondear(valor) {
    if (typeof valor !== 'number' || !isFinite(valor)) return 0;
    return Math.round((valor + Number.EPSILON) * 100) / 100;
  }

  function parseMoneda(valor) {
    if (valor === null || valor === undefined) return 0;
    if (typeof valor === 'number') return redondear(valor);

    let texto = String(valor).trim();
    if (!texto) return 0;

    let negativo = false;
    if (/^\(.*\)$/.test(texto)) {
      negativo = true;
      texto = texto.slice(1, -1);
    }

    texto = texto.replace(/[$€£\s']/g, '');
    if (!texto) return 0;

    if (texto.startsWith('-')) {
      negativo = true;
      texto = texto.substring(1);
    } else if (texto.startsWith('+')) {
      texto = texto.substring(1);
    }

    if (texto.includes(',') && texto.includes('.')) {
      if (texto.lastIndexOf(',') > texto.lastIndexOf('.')) {
        texto = texto.replace(/\./g, '').replace(',', '.');
      } else {
        texto = texto.replace(/,/g, '');
      }
    } else if (texto.includes(',')) {
      const partes = texto.split(',');
      if (partes.length === 2 && partes[1].length > 0 && partes[1].length <= 2) {
        texto = texto.replace(',', '.');
      } else {
        texto = texto.replace(/,/g, '');
      }
    } else if (texto.includes('.')) {
      const partes = texto.split('.');
      if (partes.length === 2 && partes[1].length > 0 && partes[1].length <= 2) {
        // decimal correcto
      } else {
        texto = texto.replace(/\./g, '');
      }
    }

    let numero = Number(texto);
    if (isNaN(numero)) return 0;
    if (negativo) numero = -numero;
    return redondear(numero);
  }

  function normalizarDocumento(valor) {
    if (valor === null || valor === undefined) return '';
    return String(valor).trim().replace(/\s+/g, '').toUpperCase();
  }

  function normalizarTarjeta(valor) {
    if (valor === null || valor === undefined) return '';
    // Quitar espacios, guiones, puntos, comas, etc.
    return String(valor)
      .trim()
      .replace(/[\s\-_.]/g, '')
      .toUpperCase();
  }

  function normalizarTexto(valor) {
    return String(valor ?? '').trim();
  }

  function normalizarContabilidad(filas, mapeo) {
    return filas.map((fila, indice) => ({
      fila: indice + 2,
      documento: normalizarDocumento(fila[mapeo.documento]),
      nombre: normalizarTexto(fila[mapeo.nombre]),
      saldo: parseMoneda(fila[mapeo.saldo])
    }));
  }

  function normalizarTesoreria(filas, mapeo) {
    return filas.map((fila, indice) => ({
      fila: indice + 2,
      documento: normalizarDocumento(fila[mapeo.documento]),
      tarjeta: normalizarTarjeta(fila[mapeo.tarjeta]),
      bolsillo: normalizarTexto(fila[mapeo.bolsillo]),
      saldo: parseMoneda(fila[mapeo.saldo]),
      ultimaCarga: normalizarTexto(fila[mapeo.ultimaCarga]),
      ultimoCobro: normalizarTexto(fila[mapeo.ultimoCobro])
    }));
  }

  function normalizarConsumos(filas, mapeo) {
    return filas.map((fila, indice) => ({
      fila: indice + 2,
      tarjeta: normalizarTarjeta(fila[mapeo.tarjeta]),
      valor: parseMoneda(fila[mapeo.valor]),
      fecha: normalizarTexto(fila[mapeo.fecha]),
      codigoUnico: normalizarTexto(fila[mapeo.codigoUnico]),
      establecimiento: normalizarTexto(fila[mapeo.establecimiento]),
      invalido: false,
      ignorado: false
    }));
  }

  function esTarjetaValida(tarjeta) {
    // La tarjeta debe contener solo dígitos
    return /^\d+$/.test(tarjeta);
  }

  function validarIntegridad(contabilidad, tesoreria) {
    const inconsistencias = [];
    const documentosInvalidos = new Set();
    const tarjetasInvalidas = new Set();

    const contabilidadPorDocumento = new Map();
    contabilidad.forEach((registro) => {
      if (!registro.documento) {
        inconsistencias.push({
          tipo: 'DOCUMENTO VACÍO EN CONTABILIDAD',
          documento: '',
          tarjeta: '',
          fila: registro.fila,
          detalle: 'Registro sin número de documento en Contabilidad.'
        });
        return;
      }

      const registros = contabilidadPorDocumento.get(registro.documento) || [];
      registros.push(registro);
      contabilidadPorDocumento.set(registro.documento, registros);
    });

    for (const [documento, registros] of contabilidadPorDocumento.entries()) {
      if (registros.length > 1) {
        inconsistencias.push({
          tipo: 'DOCUMENTO DUPLICADO EN CONTABILIDAD',
          documento: documento,
          tarjeta: '',
          fila: registros.map((r) => r.fila).join(', '),
          detalle: `Se encontraron ${registros.length} registros con el mismo documento.`
        });
        documentosInvalidos.add(documento);
      }
    }

    const tesoreriaPorDocumento = new Map();
    const tesoreriaPorTarjeta = new Map();

    tesoreria.forEach((registro) => {
      if (!registro.documento) {
        inconsistencias.push({
          tipo: 'DOCUMENTO VACÍO EN TESORERÍA',
          documento: '',
          tarjeta: registro.tarjeta || '',
          fila: registro.fila,
          detalle: 'Registro de Tesorería sin cédula de trabajador.'
        });
        return;
      }

      if (!registro.tarjeta) {
        inconsistencias.push({
          tipo: 'TARJETA VACÍA EN TESORERÍA',
          documento: registro.documento,
          tarjeta: '',
          fila: registro.fila,
          detalle: 'Registro de Tesorería sin número de tarjeta.'
        });
        documentosInvalidos.add(registro.documento);
        return;
      }

      // Validación de tarjeta numérica
      if (!esTarjetaValida(registro.tarjeta)) {
        inconsistencias.push({
          tipo: 'TARJETA NO NUMÉRICA',
          documento: registro.documento,
          tarjeta: registro.tarjeta,
          fila: registro.fila,
          detalle: `La tarjeta "${registro.tarjeta}" no es un número válido. Registro excluido de la conciliación.`
        });
        documentosInvalidos.add(registro.documento);
        return;
      }

      const porDocumento = tesoreriaPorDocumento.get(registro.documento) || [];
      porDocumento.push(registro);
      tesoreriaPorDocumento.set(registro.documento, porDocumento);

      const tarjetas = tesoreriaPorTarjeta.get(registro.tarjeta) || new Set();
      tarjetas.add(registro.documento);
      tesoreriaPorTarjeta.set(registro.tarjeta, tarjetas);
    });

    for (const [documento, registros] of tesoreriaPorDocumento.entries()) {
      const tarjetas = new Set(registros.map((r) => r.tarjeta).filter(Boolean));
      if (tarjetas.size > 1) {
        inconsistencias.push({
          tipo: 'MÚLTIPLES TARJETAS',
          documento: documento,
          tarjeta: [...tarjetas].join(', '),
          fila: registros.map((r) => r.fila).join(', '),
          detalle: `El documento ${documento} tiene ${tarjetas.size} tarjetas diferentes.`
        });
        documentosInvalidos.add(documento);
        tarjetas.forEach((tarjeta) => tarjetasInvalidas.add(tarjeta));
      }
    }

    for (const [tarjeta, documentos] of tesoreriaPorTarjeta.entries()) {
      if (documentos.size > 1) {
        inconsistencias.push({
          tipo: 'TARJETA ASOCIADA A MÚLTIPLES DOCUMENTOS',
          documento: [...documentos].join(', '),
          tarjeta: tarjeta,
          fila: '',
          detalle: `La tarjeta ${tarjeta} está asociada a ${documentos.size} documentos diferentes.`
        });
        tarjetasInvalidas.add(tarjeta);
        documentos.forEach((documento) => documentosInvalidos.add(documento));
      }
    }

    const docToCardValido = new Map();
    const cardToDocValido = new Map();

    tesoreria.forEach((registro) => {
      if (!registro.documento || !registro.tarjeta) return;
      if (documentosInvalidos.has(registro.documento) || tarjetasInvalidas.has(registro.tarjeta)) return;

      if (!docToCardValido.has(registro.documento)) {
        docToCardValido.set(registro.documento, registro.tarjeta);
      } else if (docToCardValido.get(registro.documento) !== registro.tarjeta) {
        return;
      }

      if (!cardToDocValido.has(registro.tarjeta)) {
        cardToDocValido.set(registro.tarjeta, registro.documento);
      } else if (cardToDocValido.get(registro.tarjeta) !== registro.documento) {
        return;
      }
    });

    return {
      inconsistencias,
      documentosInvalidos,
      tarjetasInvalidas,
      docToCardValido,
      cardToDocValido,
      contabilidadPorDocumento,
      tesoreriaPorDocumento,
      tesoreriaPorTarjeta
    };
  }

  function procesarConsumos(consumos, integridad) {
    const consumosPorTarjeta = new Map();
    const totalValid = { cantidad: 0, valorTotal: 0 };

    consumos.forEach((consumo) => {
      if (!consumo.tarjeta) {
        integridad.inconsistencias.push({
          tipo: 'CONSUMO SIN NÚMERO DE TARJETA',
          documento: '',
          tarjeta: '',
          fila: consumo.fila,
          detalle: 'Registro de consumo sin número de tarjeta.'
        });
        consumo.invalido = true;
        return;
      }

      // Si la tarjeta no existe en Tesorería, se ignora (no es inconsistencia)
      if (!integridad.tesoreriaPorTarjeta.has(consumo.tarjeta)) {
        consumo.ignorado = true;
        return;
      }

      const documento = integridad.cardToDocValido.get(consumo.tarjeta);
      if (!documento) {
        if (integridad.tarjetasInvalidas.has(consumo.tarjeta)) {
          integridad.inconsistencias.push({
            tipo: 'CONSUMO CON TARJETA INVÁLIDA',
            documento: '',
            tarjeta: consumo.tarjeta,
            fila: consumo.fila,
            detalle: 'La tarjeta presenta inconsistencias estructurales (múltiples documentos, etc.).'
          });
        } else {
          integridad.inconsistencias.push({
            tipo: 'CONSUMO SIN TERCERO ASOCIADO',
            documento: '',
            tarjeta: consumo.tarjeta,
            fila: consumo.fila,
            detalle: 'No fue posible asociar la tarjeta a un documento válido.'
          });
        }
        consumo.invalido = true;
        return;
      }

      const acumulado = consumosPorTarjeta.get(consumo.tarjeta) || { total: 0, filas: [] };
      acumulado.total = redondear(acumulado.total + consumo.valor);
      acumulado.filas.push(consumo.fila);
      consumosPorTarjeta.set(consumo.tarjeta, acumulado);

      consumo.documentoRelacionado = documento;
      totalValid.cantidad += 1;
      totalValid.valorTotal = redondear(totalValid.valorTotal + consumo.valor);
    });

    return { consumosPorTarjeta, totalValid };
  }

  function construirResumen(resultados, contabilidad, tesoreria, totalConsumosValid, inconsistencias) {
    const contabilidadUnicos = new Set(contabilidad.filter((r) => r.documento).map((r) => r.documento)).size;
    const tesoreriaUnicos = new Set(tesoreria.filter((r) => r.documento).map((r) => r.documento)).size;

    return {
      totalTercerosContabilidad: contabilidadUnicos,
      totalTercerosTesoreria: tesoreriaUnicos,
      totalConciliados: resultados.filter((r) => r.estado === 'CONCILIADO').length,
      totalDiferencias: resultados.filter((r) => r.estado === 'DIFERENCIA').length,
      totalInconsistencias: inconsistencias.length,
      totalConsumosProcesados: totalConsumosValid.cantidad,
      valorTotalConsumos: totalConsumosValid.valorTotal
    };
  }

  function realizarConciliacion(contabilidad, tesoreria, consumos) {
    const integridad = validarIntegridad(contabilidad, tesoreria);
    const { consumosPorTarjeta, totalValid } = procesarConsumos(consumos, integridad);

    const tesoreriaValidaPorDocumento = new Map();

    tesoreria.forEach((registro) => {
      if (!registro.documento || !registro.tarjeta) return;
      if (integridad.documentosInvalidos.has(registro.documento) || integridad.tarjetasInvalidas.has(registro.tarjeta)) return;

      const tarjetaValida = integridad.docToCardValido.get(registro.documento);
      if (!tarjetaValida || tarjetaValida !== registro.tarjeta) return;

      const acumulado = tesoreriaValidaPorDocumento.get(registro.documento) || {
        tarjeta: tarjetaValida,
        saldoTotal: 0,
        filas: []
      };
      acumulado.saldoTotal = redondear(acumulado.saldoTotal + registro.saldo);
      acumulado.filas.push(registro.fila);
      tesoreriaValidaPorDocumento.set(registro.documento, acumulado);
    });

    const contabilidadValidaPorDocumento = new Map();
    contabilidad.forEach((registro) => {
      if (!registro.documento) return;
      if (integridad.documentosInvalidos.has(registro.documento)) return;
      if (contabilidadValidaPorDocumento.has(registro.documento)) return;
      contabilidadValidaPorDocumento.set(registro.documento, registro);
    });

    const documentosUnicos = new Set();
    contabilidad.forEach((r) => { if (r.documento) documentosUnicos.add(r.documento); });
    tesoreria.forEach((r) => { if (r.documento) documentosUnicos.add(r.documento); });

    const resultados = [];

    documentosUnicos.forEach((documento) => {
      const registroContabilidad = contabilidadValidaPorDocumento.get(documento) || null;
      const saldoContabilidad = registroContabilidad ? registroContabilidad.saldo : null;

      const tesoreriaValida = tesoreriaValidaPorDocumento.get(documento) || null;
      const saldoTesoreria = tesoreriaValida ? tesoreriaValida.saldoTotal : null;
      const tarjeta = tesoreriaValida ? tesoreriaValida.tarjeta : (
        [...new Set(tesoreria.filter((r) => r.documento === documento).map((r) => r.tarjeta))].join(', ')
      );

      let totalConsumos = 0;
      if (tesoreriaValida && !integridad.tarjetasInvalidas.has(tesoreriaValida.tarjeta)) {
        const consumosTarjeta = consumosPorTarjeta.get(tesoreriaValida.tarjeta);
        if (consumosTarjeta) totalConsumos = consumosTarjeta.total;
      }

      const saldoAjustado = saldoContabilidad !== null
        ? redondear(saldoContabilidad - totalConsumos)
        : null;

      let estado = 'INCONSISTENCIA';
      let diferencia = null;
      let detalle = '';

      if (
        registroContabilidad &&
        tesoreriaValida &&
        !integridad.documentosInvalidos.has(documento) &&
        !integridad.tarjetasInvalidas.has(tesoreriaValida.tarjeta)
      ) {
        const diff = redondear(saldoAjustado - saldoTesoreria);
        diferencia = diff;
        estado = Math.abs(diff) < 0.005 ? 'CONCILIADO' : 'DIFERENCIA';
        detalle = estado === 'CONCILIADO' ? 'Sin diferencias.' : 'Diferencia detectada.';
      } else if (registroContabilidad && !tesoreriaValida) {
        estado = 'INCONSISTENCIA';
        detalle = integridad.documentosInvalidos.has(documento)
          ? 'Inconsistencia en Tesorería: revise el documento o las tarjetas asociadas.'
          : 'No existe en Tesorería.';
      } else if (!registroContabilidad && tesoreriaValida) {
        estado = 'INCONSISTENCIA';
        detalle = 'No existe en Contabilidad.';
      } else {
        estado = 'INCONSISTENCIA';
        detalle = 'Inconsistencia detectada.';
      }

      resultados.push({
        documento: documento,
        nombre: registroContabilidad ? registroContabilidad.nombre : 'NO REGISTRADO EN CONTABILIDAD',
        tarjeta: tarjeta || '',
        saldoContabilidad: saldoContabilidad,
        consumos: totalConsumos,
        saldoAjustado: saldoAjustado,
        saldoTesoreria: saldoTesoreria,
        diferencia: diferencia,
        estado: estado,
        detalle: detalle
      });
    });

    const resumen = construirResumen(resultados, contabilidad, tesoreria, totalValid, integridad.inconsistencias);

    return {
      resultados,
      inconsistencias: integridad.inconsistencias,
      resumen
    };
  }

  return {
    MAPEOS,
    parseMoneda,
    redondear,
    normalizarDocumento,
    normalizarTarjeta,
    normalizarTexto,
    normalizarContabilidad,
    normalizarTesoreria,
    normalizarConsumos,
    validarIntegridad,
    procesarConsumos,
    realizarConciliacion,
    esTarjetaValida
  };
})();

window.Conciliacion = Conciliacion;