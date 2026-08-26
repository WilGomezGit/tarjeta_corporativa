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

// Función para formatear el valor en pesos colombianos
function formatCOP(value) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

// Procesa el contenido del archivo FIBATCH
function processData(content) {
    data = []; // Limpiamos los datos anteriores
    const lines = content.split('\n');

    // Procesamos todas las líneas excepto las dos últimas (dependiendo del formato)
    for (let i = 0; i < lines.length - 2; i++) {
        const line = lines[i].trim();
        if (line !== '') {
            // Posiciones específicas para FIBATCH
            const documentNumber = line.substring(75, 94).trim();
            const value = parseFloat(
                line.substring(179, 194)
                    .replace(/^0+/, '')
                    .replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                    .trim()
                    .replace(/,/g, "")
            );
            const commerce = line.substring(489, 550).trim();

            if (!isNaN(value)) {
                data.push({ documentNumber, value, commerce });
            }
        }
    }

    // Mostramos los datos en la tabla
    renderTable();

    // Calculamos y mostramos el total del valor
    calculateTotal();
}

// Dibuja la tabla con los datos procesados
function renderTable() {
    const tableBody = document.getElementById('dataBody');
    tableBody.innerHTML = '';

    data.forEach(item => {
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${item.documentNumber}</td>
            <td>${formatCOP(item.value)}</td>
            <td>${item.commerce}</td>
        `;
    });
}

// Calcula el total y lo muestra en ambos lugares (tabla y contenedor superior)
function calculateTotal() {
    const totalValue = data.reduce((acc, item) => acc + item.value, 0);

    // Actualizamos el total del pie de tabla
    document.getElementById('totalValue').textContent = formatCOP(totalValue);
    // Actualizamos el total del contenedor superior
    document.getElementById('totalProcessedValue').textContent = formatCOP(totalValue);
}

// Limpia todo (tabla, totales, archivo y zona de drag & drop)
function clearTable() {
    // Limpiar los datos
    data = [];

    // Limpiar la tabla
    document.getElementById('dataBody').innerHTML = '';

    // Limpiar los totales
    document.getElementById('totalValue').textContent = '$0,00';
    document.getElementById('totalProcessedValue').textContent = '$0,00';

    // Limpiar el input file
    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.value = '';

    // Restaurar la zona de drag & drop
    const dropZone = document.getElementById('dropZone');
    if (dropZone) {
        dropZone.classList.remove('file-loaded', 'dragover');
        const dropTitle = dropZone.querySelector('.drop-title');
        const dropSubtitle = dropZone.querySelector('.drop-subtitle');
        if (dropTitle) dropTitle.innerHTML = 'Arrastra archivos aquí o haz clic para seleccionar';
        if (dropSubtitle) dropSubtitle.innerHTML = 'Formatos soportados: .txt';
    }
}

// Exportar a CSV
function exportToCSV() {
    if (data.length === 0) {
        alert('No hay datos para exportar.');
        return;
    }

    const csvContent = "data:text/csv;charset=utf-8,"
        + "Número de Documento,Valor,Comercio\n"
        + data.map(item => {
            return `${item.documentNumber},${item.value},"${item.commerce}"`;
        }).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "fibatch.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Exportar a Excel
function exportToExcel() {
    if (data.length === 0) {
        alert('No hay datos para exportar.');
        return;
    }

    const formattedData = data.map(item => ({
        "Número de Documento": item.documentNumber,
        "Valor": item.value,
        "Comercio": item.commerce
    }));

    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Datos");
    XLSX.writeFile(wb, "fibatch.xlsx");
}
