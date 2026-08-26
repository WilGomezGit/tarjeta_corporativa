let data = []; // Variable para almacenar los datos procesados
let lastLineData = null; // Variable para almacenar la última línea
let totalValue = 0; // Variable para almacenar la suma total del valor

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
    data = []; // Limpiamos los datos anteriores
    totalValue = 0; // Reiniciamos el valor total
    const lines = content.split('\n');

    // Limpiar contenedores previos
    document.getElementById('duplicatesContainer').innerHTML = '';
    document.getElementById('lastLineContainer').innerHTML = '';
    document.getElementById('summaryContainer').innerHTML = '';

    const documentNumbers = [];
    const cardNumbers = [];
    const lineNumbersForDocuments = {};
    const lineNumbersForCards = {};

    // Procesar cada línea del archivo excepto la última
    lines.forEach((line, index) => {
        if (index < lines.length - 1 && line.trim() !== '') {
            const documentNumber = line.substring(30, 45).replace(/^0+/, '').trim();
            const cardNumber = line.substring(64, 81).trim();
            const rawValue = parseFloat(line.substring(83, 99).replace(/^0+/, '').trim().replace(/,/g, ""));
            const formattedValue = rawValue.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2 });

            if (!isNaN(rawValue)) {
                data.push({ documentNumber, cardNumber, value: formattedValue });
                totalValue += rawValue; // Sumar al total

                // Registrar las líneas para cada número
                if (!lineNumbersForDocuments[documentNumber]) {
                    lineNumbersForDocuments[documentNumber] = [];
                }
                lineNumbersForDocuments[documentNumber].push(index + 1); // Línea actualizada (1-based index)

                if (!lineNumbersForCards[cardNumber]) {
                    lineNumbersForCards[cardNumber] = [];
                }
                lineNumbersForCards[cardNumber].push(index + 1); // Línea actualizada (1-based index)

                // Añadir números a la lista para búsqueda de duplicados
                documentNumbers.push(documentNumber);
                cardNumbers.push(cardNumber);
            }
        }

        // Validar la última línea del archivo
        if (index === lines.length - 1 && line.trim() !== '') {
            lastLineData = parseFloat(line.substring(68, 85).replace(/^0+/, '').trim().replace(/,/g, ""));
        }
    });

    // Mostrar los datos en la tabla
    renderTable();

    // Mostrar la última línea validada
    renderLastLine();

    // Mostrar el total de la columna Valor
    displayTotal();

    // Verificar duplicados y generar el resumen
    checkDuplicatesAndGenerateSummary(documentNumbers, cardNumbers, lineNumbersForDocuments, lineNumbersForCards);
}

function renderTable() {
    const tableBody = document.getElementById('dataBody');
    tableBody.innerHTML = '';

    // Mostrar los datos en la tabla
    data.forEach((item, index) => {
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${index + 1}</td> <!-- Número de la línea -->
            <td>${item.documentNumber}</td>
            <td>${item.cardNumber}</td>
            <td>${item.value}</td>
        `;
    });
}

function renderLastLine() {
    const lastLineContainer = document.getElementById('lastLineContainer');
    if (lastLineData !== null && !isNaN(lastLineData)) {
        const formatted = lastLineData.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2 });
        lastLineContainer.innerHTML = `<div style="text-align: center;">Valor de la última línea: ${formatted}</div>`;
    } else {
        lastLineContainer.innerHTML = '<div style="text-align: center;">Sin última línea válida</div>';
    }
}

function displayTotal() {
    const totalValueContainer = document.getElementById('totalValue');
    totalValueContainer.textContent = totalValue.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2 });
}

// Nueva función para verificar duplicados y generar el resumen completo
function checkDuplicatesAndGenerateSummary(documentNumbers, cardNumbers, lineNumbersForDocuments, lineNumbersForCards) {
    const duplicateDocuments = findDuplicates(documentNumbers);
    const duplicateCards = findDuplicates(cardNumbers);

    // Calcular diferencia
    const diferencia = totalValue - (lastLineData || 0);

    // Estado del archivo: Correcto si no hay duplicados y la diferencia es 0
    const hayDuplicados = duplicateDocuments.length > 0 || duplicateCards.length > 0;
    const diferenciaOK = Math.abs(diferencia) < 0.01;
    const estadoCorrecto = !hayDuplicados && diferenciaOK;

    // Mensaje de detalle de duplicados
    let detalleDuplicados = '';
    if (hayDuplicados) {
        detalleDuplicados += 'DETALLE DE DUPLICADOS:\n';
        duplicateDocuments.forEach(doc => {
            detalleDuplicados += `Documento: ${doc} - Líneas: ${lineNumbersForDocuments[doc].join(', ')}\n`;
        });
        duplicateCards.forEach(card => {
            detalleDuplicados += `Tarjeta: ${card} - Líneas: ${lineNumbersForCards[card].join(', ')}\n`;
        });
    } else {
        detalleDuplicados = 'No se encontraron duplicados.';
    }

    // Construir HTML del resumen
    const summaryHTML = `
        <div class="summary-box">
            <h3>RESUMEN ARCHIVO PROCESADO</h3>
            <div class="summary-content">
                <div class="summary-row">
                    <span class="summary-label">Valor Total Archivo:</span>
                    <span class="summary-value valor-total">${totalValue.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2 })}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Valor Última Línea:</span>
                    <span class="summary-value valor-ultima">${(lastLineData || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2 })}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Diferencia:</span>
                    <span class="summary-value diferencia">${diferencia.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2 })}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Total Registros:</span>
                    <span class="summary-value total-registros">${data.length}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Documentos Duplicados:</span>
                    <span class="summary-value doc-duplicados">${duplicateDocuments.length}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Tarjetas Duplicadas:</span>
                    <span class="summary-value tarj-duplicados">${duplicateCards.length}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Estado del Archivo:</span>
                    <span class="summary-value ${estadoCorrecto ? 'estado-correcto' : 'estado-incorrecto'}">${estadoCorrecto ? 'ARCHIVO CORRECTO' : 'ARCHIVO INCORRECTO'}</span>
                </div>
            </div>

            <!-- Detalle de duplicados -->
            <div class="duplicados-detalle ${estadoCorrecto ? 'correcto' : ''}">
                ${detalleDuplicados}
            </div>
        </div>
    `;

    // Insertar en el contenedor
    document.getElementById('summaryContainer').innerHTML = summaryHTML;
}

function findDuplicates(arr) {
    const counts = {};
    const duplicates = [];
    arr.forEach(item => {
        counts[item] = (counts[item] || 0) + 1;
        if (counts[item] === 2) {
            duplicates.push(item);
        }
    });
    return duplicates;
}

// Función para limpiar todo
function clearTable() {
    data = [];
    lastLineData = null;
    totalValue = 0;

    // Limpiar tabla
    document.getElementById('dataBody').innerHTML = '';
    // Limpiar total
    document.getElementById('totalValue').textContent = '$0,00';
    // Limpiar última línea
    document.getElementById('lastLineContainer').innerHTML = '';
    // Limpiar duplicados
    document.getElementById('duplicatesContainer').innerHTML = '';
    // Limpiar resumen
    document.getElementById('summaryContainer').innerHTML = '';

    // Limpiar input file
    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.value = '';

    // Restaurar zona de Drag & Drop
    const dropZone = document.getElementById('dropZone');
    if (dropZone) {
        dropZone.classList.remove('file-loaded', 'dragover');
        const dropTitle = dropZone.querySelector('.drop-title');
        const dropSubtitle = dropZone.querySelector('.drop-subtitle');
        if (dropTitle) dropTitle.innerHTML = 'Arrastra archivos aquí o haz clic para seleccionar';
        if (dropSubtitle) dropSubtitle.innerHTML = 'Formatos soportados: .txt';
    }
}

// Funciones de exportación
function exportToCSV() {
    if (data.length === 0) {
        alert('No hay datos para exportar.');
        return;
    }

    const csvContent = "data:text/csv;charset=utf-8,"
        + data.map(item => `${item.documentNumber},${item.cardNumber},${item.value}`).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportToExcel() {
    if (data.length === 0) {
        alert('No hay datos para exportar.');
        return;
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data.map(item => ({
        documentNumber: item.documentNumber,
        cardNumber: item.cardNumber,
        value: item.value
    })));
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'data.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
