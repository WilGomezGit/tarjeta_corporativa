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
    return '$' + value.toLocaleString('es-CO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Función para formatear la fecha de YYYYMMDD a YYYY-MM-DD
function formatDate(dateStr) {
    if (dateStr.length === 8) {
        return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
    }
    return dateStr;
}

// Función para obtener el nombre del establecimiento
function getEstablecimiento(uniqueCode, tipoMovimiento) {
    // Caso especial: código 00000000
    if (uniqueCode === "00000000") {
        if (tipoMovimiento && tipoMovimiento.toUpperCase().includes("CARGOS")) {
            return "DESCARGA TARJETA COMFACAUCA";
        } else if (tipoMovimiento && tipoMovimiento.toUpperCase().includes("ABONO")) {
            return "CARGA TARJETA COMFACAUCA";
        }
        return "SIN COMERCIO";
    }

    // Eliminar los dos primeros ceros del código
    let codigoLimpio = uniqueCode;
    if (codigoLimpio.startsWith("00")) {
        codigoLimpio = codigoLimpio.substring(2);
    }

    const nombre = comercios[codigoLimpio];
    return nombre || "NO ENCONTRADO";
}

function processData(content) {
    data = [];
    const lines = content.split('\n');

    lines.forEach(line => {
        if (line.trim() !== '') {
            const cardNumber = line.substring(9, 26).trim();
            const rawValue = parseFloat(line.substring(124, 139).replace(/^0+/, '').trim().replace(/,/g, ""));
            const date = line.substring(158, 166).trim();
            const uniqueCode = line.substring(333, 341).trim();

            let tipoMovimiento = "";
            if (line.includes("CARGOS")) {
                tipoMovimiento = "CARGOS";
            } else if (line.includes("ABONO")) {
                tipoMovimiento = "ABONO";
            }

            if (!isNaN(rawValue)) {
                const establecimiento = getEstablecimiento(uniqueCode, tipoMovimiento);
                const formattedValue = formatCOP(rawValue);
                const formattedDate = formatDate(date);

                data.push({
                    cardNumber,
                    value: formattedValue,
                    rawValue,
                    date: formattedDate,
                    originalDate: date,
                    uniqueCode,
                    establecimiento,
                    tipoMovimiento
                });
            }
        }
    });

    sortDataByDate();
    renderTable();
    calculateTotal();
}

// Función para ordenar los datos por fecha y luego por establecimiento
function sortDataByDate() {
    data.sort((a, b) => {
        const dateA = `${a.originalDate.slice(0, 4)}${a.originalDate.slice(4, 6)}${a.originalDate.slice(6, 8)}`;
        const dateB = `${b.originalDate.slice(0, 4)}${b.originalDate.slice(4, 6)}${b.originalDate.slice(6, 8)}`;
        const dateCompare = parseInt(dateA) - parseInt(dateB);

        if (dateCompare !== 0) {
            return dateCompare;
        }

        const getPriority = (est) => {
            if (est === "CARGA TARJETA COMFACAUCA" ||
                est === "DESCARGA TARJETA COMFACAUCA") {
                return 1;
            }
            return 0;
        };

        const priorityA = getPriority(a.establecimiento);
        const priorityB = getPriority(b.establecimiento);

        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }

        return a.establecimiento.localeCompare(b.establecimiento);
    });
}

// Función para mostrar los datos en la tabla
function renderTable() {
    const tableBody = document.getElementById('dataBody');
    tableBody.innerHTML = '';

    let rowNumber = 1;

    const dates = Array.from(new Set(data.map(item => item.date)));

    dates.forEach(date => {
        const filteredData = data.filter(item => item.date === date);
        filteredData.forEach(item => {
            const row = tableBody.insertRow();
            row.innerHTML = `
                <td>${rowNumber}</td>
                <td>${item.cardNumber}</td>
                <td>${item.value}</td>
                <td>${item.date}</td>
                <td>${item.uniqueCode}</td>
                <td>${item.establecimiento}</td>
            `;
            rowNumber++;
        });

        const total = filteredData.reduce((acc, item) => acc + item.rawValue, 0);
        const totalRow = tableBody.insertRow();
        totalRow.innerHTML = `
            <td colspan="5" style="text-align: center; font-weight: bold; background-color: #f2f2f2;">Total: ${date}</td>
            <td style="text-align: center; font-weight: bold; background-color: #f2f2f2;">${formatCOP(total)}</td>
        `;
        totalRow.style.fontWeight = 'bold';
        totalRow.style.backgroundColor = '#f2f2f2';
    });
}

// Función para calcular el total de todos los datos
function calculateTotal() {
    const totalValue = data.reduce((acc, item) => acc + item.rawValue, 0);
    const totalElement = document.getElementById('totalValue');

    // Crear una fila completa para el total general
    const tableBody = document.getElementById('dataBody');
    const totalRow = tableBody.insertRow();
    totalRow.innerHTML = `
        <td colspan="6" style="text-align: center; font-weight: bold; background-color: #e8e8e8;">TOTAL GENERAL: ${formatCOP(totalValue)}</td>
    `;
    totalRow.style.fontWeight = 'bold';
    totalRow.style.backgroundColor = '#e8e8e8';

    // Limpiar el totalValue del tfoot ya que ahora está en el body
    totalElement.textContent = '';
}

// Función para limpiar la tabla y el archivo seleccionado
function clearTable() {
    data = [];
    const fileInput = document.getElementById('fileInput');
    fileInput.value = '';
    document.getElementById('dataBody').innerHTML = '';
    document.getElementById('totalValue').textContent = '';
}

// Función para exportar los datos a CSV
function exportToCSV() {
    if (data.length === 0) {
        alert('No hay datos para exportar.');
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,"
        + "N°,No. de Tarjeta,Valor,Fecha,Código Único,Establecimiento\n";

    data.forEach((item, index) => {
        csvContent += `${index + 1},${item.cardNumber},${item.rawValue},${item.date},${item.uniqueCode},"${item.establecimiento}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Función para exportar los datos a Excel
function exportToExcel() {
    if (data.length === 0) {
        alert('No hay datos para exportar.');
        return;
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data.map((item, index) => ({
        "N°": index + 1,
        "No. de Tarjeta": item.cardNumber,
        "Valor": item.rawValue,
        "Fecha": item.date,
        "Código Único": item.uniqueCode,
        "Establecimiento": item.establecimiento
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
