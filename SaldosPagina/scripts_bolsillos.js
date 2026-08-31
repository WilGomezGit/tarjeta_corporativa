let data = [];          // Datos finales (sin duplicados, con máscara)
let rawData = [];       // Datos completos (con duplicados, sin máscara) para verificación

// ============================================
// MOSTRAR / OCULTAR LOADING
// ============================================
function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'flex';
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'none';
}

// ============================================
// PROCESAR ARCHIVO
// ============================================
function processFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (!file) {
        alert('Por favor selecciona un archivo.');
        return;
    }

    showLoading();
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        processData(content);
        hideLoading();
    };
    reader.readAsText(file);
}

// ============================================
// PROCESAMIENTO DE DATOS
// ============================================
function processData(content) {
    rawData = [];
    data = [];

    // Omitir la primera línea (cabecera)
    const lines = content.split('\n').slice(1);

    lines.forEach(line => {
        if (line.trim() !== '') {
            const columns = line.split(';');
            if (columns.length >= 4) {
                const cedtar = columns[0].trim();
                const nombres = fixEncoding(columns[1].trim());
                const bolsillo = columns[2].trim();
                const saldoStr = columns[3].trim().replace(/\./g, '').replace(',', '.');
                const saldo = parseFloat(saldoStr);

                if (!isNaN(saldo)) {
                    // Guardar TODOS los datos (incluye duplicados) para verificación
                    rawData.push({ cedtar, nombres, bolsillo, saldo });
                }
            }
        }
    });

    // Eliminar duplicados exactos (mismo documento, nombre y bolsillo)
    data = removeDuplicates(rawData);

    // Ordenar alfabéticamente por nombres (sin agrupar por bolsillo)
    data.sort((a, b) => a.nombres.localeCompare(b.nombres, 'es', { sensitivity: 'base' }));

    renderTable();
}

// ============================================
// ELIMINAR DUPLICADOS (por documento, nombre y bolsillo)
// ============================================
function removeDuplicates(arr) {
    const seen = new Set();
    return arr.filter(item => {
        const key = `${item.cedtar}|${item.nombres}|${item.bolsillo}`;
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}

// ============================================
// CORRECCIÓN DE ENCODING (ampliada)
// ============================================
function fixEncoding(text) {
    let result = text;

    // Reemplazar ? por Ñ
    result = result.replace(/\?/g, 'Ñ');

    // Reemplazar combinaciones de Ã con Ñ
    result = result.replace(/ÃƒÂ/g, 'Ñ');
    result = result.replace(/ÃƒÂ/g, 'Ñ');
    result = result.replace(/ÃÂ/g, 'Ñ');
    result = result.replace(/Ã/g, 'Ñ');
    result = result.replace(/Ã/g, 'Ñ');

    // Reemplazar combinaciones de Ã con ñ
    result = result.replace(/ÃƒÂ±/g, 'ñ');
    result = result.replace(/Ã±/g, 'ñ');

    // Casos específicos
    result = result.replace(/MUÑOÑOZ/g, 'MUÑOZ');
    result = result.replace(/MUOZ/g, 'MUÑOZ');
    result = result.replace(/CASTAÑOÑO/g, 'CASTAÑO');
    result = result.replace(/CASTAO/g, 'CASTAÑO');
    result = result.replace(/ZUÑIÑIGA/g, 'ZUÑIGA');
    result = result.replace(/ZUIGA/g, 'ZUÑIGA');

    // Tildes
    result = result.replace(/Ã¡/g, 'á');
    result = result.replace(/Ã©/g, 'é');
    result = result.replace(/Ã­/g, 'í');
    result = result.replace(/Ã³/g, 'ó');
    result = result.replace(/Ãº/g, 'ú');

    // Tildes adicionales
    result = result.replace(/Ã¼/g, 'ü');
    result = result.replace(/Ã¤/g, 'ä');
    result = result.replace(/Ã¶/g, 'ö');
    result = result.replace(/Ã§/g, 'ç');
    result = result.replace(/Ã¨/g, 'è');
    result = result.replace(/Ã /g, ' ');

    // Limpiar caracteres sobrantes
    result = result.replace(/Â/g, '');
    result = result.replace(/â/g, '');
    result = result.replace(/€/g, '');
    result = result.replace(/˜/g, '');
    result = result.replace(/ƒ/g, '');

    return result;
}

// ============================================
// RENDERIZAR TABLA EN PANTALLA
// ============================================
function renderTable() {
    const tableBody = document.getElementById('dataBody');
    tableBody.innerHTML = '';

    data.forEach((item) => {
        const row = tableBody.insertRow();
        const saldoFormateado = '$' + item.saldo.toLocaleString('es-CO', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        row.innerHTML = `
            <td>${item.cedtar}</td>
            <td>${item.nombres}</td>
            <td>${item.bolsillo}</td>
            <td>${saldoFormateado}</td>
        `;
    });
}

// ============================================
// LIMPIAR TODO (Incluyendo Drag & Drop)
// ============================================
function clearTable() {
    data = [];
    rawData = [];

    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.value = '';

    const dropZone = document.getElementById('dropZone');
    if (dropZone) {
        dropZone.classList.remove('file-loaded', 'dragover');
        const dropTitle = dropZone.querySelector('.drop-title');
        const dropSubtitle = dropZone.querySelector('.drop-subtitle');
        if (dropTitle) dropTitle.innerHTML = 'Arrastra archivos aquí o haz clic para seleccionar';
        if (dropSubtitle) dropSubtitle.innerHTML = 'Formatos soportados: .txt, .csv';
    }

    const tableBody = document.getElementById('dataBody');
    if (tableBody) tableBody.innerHTML = '';
}

// ============================================
// EXPORTAR EXCEL (genérico)
// ============================================
function exportToExcel(filteredData, filename) {
    if (filteredData.length === 0) {
        alert('No hay datos para exportar.');
        return;
    }

    const dataToExport = filteredData.map(item => [
        item.cedtar,
        item.nombres,
        item.bolsillo
    ]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(dataToExport);

    ws['!cols'] = [
        { wch: 18 },
        { wch: 50 },
        { wch: 25 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Saldos');

    const wbout = XLSX.write(wb, {
        bookType: 'xlsx',
        type: 'array',
        bookSST: false,
        cellStyles: true
    });

    const blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

// ============================================
// ENMASCARAR CÉDULA (6 asteriscos + últimos 3 dígitos)
// ============================================
function maskCedtar(cedtar) {
    if (!cedtar) return '';
    const str = cedtar.toString();
    if (str.length <= 3) return '******' + str;
    return '******' + str.slice(-3);
}

// ============================================
// EXPORTAR SALDOS FOSFEC (con duplicados eliminados y máscara)
// ============================================
function exportToFOSFEC() {
    showLoading();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const formattedDate = formatDate(yesterday);
    const fileName = `SaldosPagina a ${formattedDate} Fosfec.xlsx`;

    let filteredData = data
        .filter(item => item.bolsillo === 'BONO ALIMENTACION FOSFEC' || item.bolsillo === 'FOSFEC')
        .map(item => ({
            cedtar: maskCedtar(item.cedtar),
            nombres: item.nombres,
            bolsillo: item.bolsillo
        }));

    filteredData = removeDuplicates(filteredData);
    filteredData.sort((a, b) => a.nombres.localeCompare(b.nombres, 'es', { sensitivity: 'base' }));

    if (filteredData.length === 0) {
        alert('No se encontraron datos para FOSFEC.');
        hideLoading();
        return;
    }

    exportToExcel(filteredData, fileName);
    setTimeout(hideLoading, 500);
}

// ============================================
// EXPORTAR SALDOS SUBSIDIO (con duplicados eliminados y máscara)
// ============================================
function exportToSUBFLIAR() {
    showLoading();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const formattedDate = formatDate(yesterday);
    const fileName = `SaldosPagina a ${formattedDate} Subsidio.xlsx`;

    let filteredData = data
        .filter(item => item.bolsillo === 'SUBSIDIO')
        .map(item => ({
            cedtar: maskCedtar(item.cedtar),
            nombres: item.nombres,
            bolsillo: item.bolsillo
        }));

    filteredData = removeDuplicates(filteredData);
    filteredData.sort((a, b) => a.nombres.localeCompare(b.nombres, 'es', { sensitivity: 'base' }));

    if (filteredData.length === 0) {
        alert('No se encontraron datos para SUBSIDIO.');
        hideLoading();
        return;
    }

    exportToExcel(filteredData, fileName);
    setTimeout(hideLoading, 500);
}

// ============================================
// EXPORTAR VERIFICACIÓN (con duplicados y SIN asteriscos)
// ============================================
function exportToVerification() {
    showLoading();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const formattedDate = formatDate(yesterday);
    const fileName = `SaldosVerificacion a ${formattedDate}.xlsx`;

    // Usar TODOS los datos originales (con duplicados, sin máscara)
    const allData = rawData.map(item => ({
        cedtar: item.cedtar,
        nombres: item.nombres,
        bolsillo: item.bolsillo
    }));

    if (allData.length === 0) {
        alert('No hay datos para exportar.');
        hideLoading();
        return;
    }

    exportToExcel(allData, fileName);
    setTimeout(hideLoading, 500);
}

// ============================================
// FORMATO DE FECHA (dd-mm-yyyy)
// ============================================
function formatDate(date) {
    const day = ('0' + date.getDate()).slice(-2);
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}
