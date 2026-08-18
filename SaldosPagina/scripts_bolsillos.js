let data = []; // Variable para almacenar los datos procesados

function processFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (!file) {
        alert('Por favor selecciona un archivo.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        processData(content);
    };
    reader.readAsText(file);
}

function processData(content) {
    data = [];
    const lines = content.split('\n');

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
                    data.push({ cedtar, nombres, bolsillo, saldo });
                }
            }
        }
    });

    // Ordenar alfabéticamente por nombres
    data.sort((a, b) => {
        const bolsilloCompare = a.bolsillo.localeCompare(b.bolsillo);
        if (bolsilloCompare !== 0) {
            return bolsilloCompare;
        }
        return a.nombres.localeCompare(b.nombres, 'es', { sensitivity: 'base' });
    });

    renderTable();
}

function fixEncoding(text) {
    let result = text;

    // ============================================
    // PASO 1: CORREGIR CASOS CON MÚLTIPLES Ã
    // (Esto debe hacerse ANTES de los reemplazos individuales)
    // ============================================

    // Dos Ã se convierten en una Ñ
    result = result.replace(/ÃÃ/g, 'Ñ');
    // Tres Ã se convierten en una Ñ
    result = result.replace(/ÃÃÃ/g, 'Ñ');

    // ============================================
    // PASO 2: CORREGIR CASOS ESPECÍFICOS
    // ============================================

    // CORREGIR MUÑOZ
    result = result.replace(/MUÃOZ/g, 'MUÑOZ');
    result = result.replace(/MUÃÃOZ/g, 'MUÑOZ');

    // CORREGIR ZUÑIGA
    result = result.replace(/ZUÃIGA/g, 'ZUÑIGA');
    result = result.replace(/ZUÃÃIGA/g, 'ZUÑIGA');

    // CORREGIR CASTAÑO
    result = result.replace(/CASTAÃO/g, 'CASTAÑO');
    result = result.replace(/CASTAÃÃO/g, 'CASTAÑO');

    // ============================================
    // PASO 3: CORREGIR CUALQUIER Ã RESTANTE
    // ============================================

    result = result.replace(/Ã/g, 'Ñ');

    // ============================================
    // PASO 4: CORREGIR TILDES
    // ============================================

    result = result.replace(/Ã¡/g, 'á');
    result = result.replace(/Ã©/g, 'é');
    result = result.replace(/Ã­/g, 'í');
    result = result.replace(/Ã³/g, 'ó');
    result = result.replace(/Ãº/g, 'ú');
    result = result.replace(/Ã‰/g, 'É');
    result = result.replace(/Ã“/g, 'Ó');
    result = result.replace(/Ãš/g, 'Ú');
    result = result.replace(/Ã/g, 'Í');
    result = result.replace(/Ã/g, 'Á');

    // ============================================
    // PASO 5: LIMPIAR CARACTERES SOBRANTES
    // ============================================

    result = result.replace(/Â/g, '');
    result = result.replace(/â/g, '');
    result = result.replace(/€/g, '');
    result = result.replace(/˜/g, '');
    result = result.replace(/ƒ/g, '');

    return result;
}
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

function clearTable() {
    data = [];
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.value = '';
    }
    const tableBody = document.getElementById('dataBody');
    if (tableBody) {
        tableBody.innerHTML = '';
    }
}

function exportToExcel(filteredData, filename) {
    if (filteredData.length === 0) {
        alert('No hay datos para exportar.');
        return;
    }

    // SOLO 3 COLUMNAS: DOCUMENTO, NOMBRES, BOLSILLO (SIN SALDO Y SIN ENCABEZADOS)
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

function maskCedtar(cedtar) {
    if (!cedtar) return '';
    const str = cedtar.toString();
    if (str.length <= 3) return '******' + str;
    return '******' + str.slice(-3);
}

function exportToFOSFEC() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const formattedDate = formatDate(yesterday);
    const fileName = `SaldosPagina a ${formattedDate} Fosfec.xlsx`;

    const filteredData = data
        .filter(item => item.bolsillo === 'BONO ALIMENTACION FOSFEC' || item.bolsillo === 'FOSFEC')
        .map(item => ({
            cedtar: maskCedtar(item.cedtar),
            nombres: item.nombres,
            bolsillo: item.bolsillo
        }))
        .sort((a, b) => a.nombres.localeCompare(b.nombres, 'es', { sensitivity: 'base' }));

    if (filteredData.length === 0) {
        alert('No se encontraron datos para FOSFEC.');
        return;
    }

    exportToExcel(filteredData, fileName);
}

function exportToSUBFLIAR() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const formattedDate = formatDate(yesterday);
    const fileName = `SaldosPagina a ${formattedDate} Subsidio.xlsx`;

    const filteredData = data
        .filter(item => item.bolsillo === 'SUBSIDIO')
        .map(item => ({
            cedtar: maskCedtar(item.cedtar),
            nombres: item.nombres,
            bolsillo: item.bolsillo
        }))
        .sort((a, b) => a.nombres.localeCompare(b.nombres, 'es', { sensitivity: 'base' }));

    if (filteredData.length === 0) {
        alert('No se encontraron datos para SUBSIDIO.');
        return;
    }

    exportToExcel(filteredData, fileName);
}

function formatDate(date) {
    const day = ('0' + date.getDate()).slice(-2);
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}
