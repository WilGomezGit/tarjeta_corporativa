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
    data = []; // Limpiamos los datos anteriores
    const lines = content.split('\n');

    // Procesamos todas las líneas excepto las dos últimas
    for (let i = 0; i < lines.length - 2; i++) {
        const line = lines[i].trim();
        if (line !== '') {
            const documentNumber = line.substring(75, 94).trim();
            const value = parseFloat(line.substring(179, 194).replace(/^0+/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',').trim().replace(/,/g, ""));
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

// MODIFICADO: Formatea un número como pesos colombianos con 2 decimales SIEMPRE
function formatCOP(value) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 2, // MODIFICADO: de 0 a 2
        maximumFractionDigits: 2  // MODIFICADO: de 0 a 2
    }).format(value);
}

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

function calculateTotal() {
    const totalValue = data.reduce((acc, item) => acc + item.value, 0);

    document.getElementById('totalValue').textContent = formatCOP(totalValue);
    document.getElementById('totalProcessedValue').textContent = formatCOP(totalValue);
}

function clearTable() {
    // 1. Limpiar los datos
    data = [];

    // 2. Limpiar la tabla
    document.getElementById('dataBody').innerHTML = '';

    // 3. Limpiar los totales
    document.getElementById('totalValue').textContent = '';
    document.getElementById('totalProcessedValue').textContent = '';

    // 4. Limpiar el input file (resetear el valor)
    const fileInput = document.getElementById('fileInput');
    fileInput.value = '';

    // 5. Limpiar el nombre del archivo mostrado
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    if (fileNameDisplay) {
        fileNameDisplay.textContent = '';
    }

    // 6. Si usas un label personalizado para el input file
    const fileLabel = document.querySelector('label[for="fileInput"]');
    if (fileLabel) {
        const originalText = fileLabel.getAttribute('data-original-text');
        if (originalText) {
            fileLabel.textContent = originalText;
        } else {
            fileLabel.textContent = 'Seleccionar archivo';
        }
    }
}

function exportToCSV() {
    if (data.length === 0) {
        alert('No hay datos para exportar.');
        return;
    }

    const csvContent = "data:text/csv;charset=utf-8,"
        + data.map(item => {
            const formattedItem = {
                documentNumber: item.documentNumber,
                value: formatCOP(item.value),
                commerce: item.commerce
            };
            return Object.values(formattedItem).join(',');
        }).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "data.csv");
    document.body.appendChild(link);
    link.click();
}

function exportToExcel() {
    if (data.length === 0) {
        alert('No hay datos para exportar.');
        return;
    }

    const formattedData = data.map(item => ({
        documentNumber: item.documentNumber,
        value: formatCOP(item.value),
        commerce: item.commerce
    }));

    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Datos");
    XLSX.writeFile(wb, "data.xlsx");
}

function updateFileName(input) {
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const fileLabel = document.querySelector('label[for="fileInput"]');

    if (input.files && input.files[0]) {
        const fileName = input.files[0].name;

        if (fileNameDisplay) {
            fileNameDisplay.textContent = fileName;
        }

        if (fileLabel) {
            if (!fileLabel.getAttribute('data-original-text')) {
                fileLabel.setAttribute('data-original-text', fileLabel.textContent);
            }
            fileLabel.textContent = fileName;
        }
    } else {
        if (fileNameDisplay) {
            fileNameDisplay.textContent = '';
        }
        if (fileLabel) {
            const originalText = fileLabel.getAttribute('data-original-text');
            fileLabel.textContent = originalText || 'Seleccionar archivo';
        }
    }
}
