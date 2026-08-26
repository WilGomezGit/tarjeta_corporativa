let fileContent = '';
let fileName = '';

// ====== Lógica de Drag & Drop ======
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const processButton = document.getElementById('processButton');
const clearButton = document.getElementById('clearButton');

// Eventos de arrastre
['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('dragover');
    }, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('dragover');
    }, false);
});

// Al soltar el archivo
dropZone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (file) {
        fileInput.files = e.dataTransfer.files;
        dropZone.classList.add('file-loaded');
        dropZone.querySelector('.drop-title').innerHTML = `<i class="fas fa-check-circle"></i> ${file.name}`;
        setTimeout(() => dropZone.classList.remove('file-loaded'), 1000);

        // Cargar el archivo
        loadFile(file);
    }
});

// Click en la zona para abrir selector
dropZone.addEventListener('click', () => fileInput.click());

// Cambio de archivo en el input
fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        dropZone.classList.add('file-loaded');
        dropZone.querySelector('.drop-title').innerHTML = `<i class="fas fa-check-circle"></i> ${file.name}`;
        setTimeout(() => dropZone.classList.remove('file-loaded'), 1000);

        // Cargar el archivo
        loadFile(file);
    }
});

// ====== Lógica de carga de archivo ======
function loadFile(file) {
    if (file && (file.type === 'text/plain' || file.name.endsWith('.txt'))) {
        fileName = file.name;
        const reader = new FileReader();
        reader.onload = function(e) {
            fileContent = e.target.result;
            processButton.disabled = false;
        };
        reader.readAsText(file);
    } else {
        alert('Por favor, selecciona un archivo de texto (.txt).');
        clearTable();
    }
}

// ====== Botón Procesar ======
processButton.addEventListener('click', function() {
    if (!fileContent) {
        alert('Por favor cargue un archivo.');
        return;
    }
    validateFileContent(fileContent);
});

// ====== Botón Cancelar (Limpiar TODO) ======
clearButton.addEventListener('click', function() {
    clearTable();
});

// ====== Función de Validación ======
function validateFileContent(content) {
    const lines = content.split('\n');
    const expectedLength = 513; // Longitud esperada para cada línea
    const specialCharactersRegex = /[!@#$%^&*(),.?":{}|<>¡¿ñÑ\uFFFD+\-\/]/; // Incluye símbolo de reemplazo
    const tildesRegex = /[áéíóúÁÉÍÓÚ]/;

    let output = 'Los errores se presentan en las siguientes líneas:\n\n';
    let hasErrors = false;

    // Validar todas las líneas excepto la última
    lines.slice(0, -1).forEach((line, index) => {
        const lineNumber = index + 1;

        // Validar longitud de línea
        if (line.length !== expectedLength) {
            output += `<span class="highlight">Línea ${lineNumber} (Longitud incorrecta):</span> ${line}\n\n`;
            hasErrors = true;
        }

        // Validar caracteres especiales y tildes
        if (specialCharactersRegex.test(line) || tildesRegex.test(line)) {
            output += `<span class="highlight">Línea ${lineNumber} (Carácter especial o tilde):</span> ${line}\n\n`;
            hasErrors = true;
        }
    });

    // Si no hay errores, mostrar un mensaje de éxito
    if (!hasErrors) {
        output = '<div class="success-message">Archivo procesado sin errores, puede cargarlo a ASOPAGOS.</div>';
    }

    // Mostrar el resultado en el contenedor de salida
    document.getElementById('output').innerHTML = output;
}

// ====== Función para limpiar TODO ======
function clearTable() {
    fileContent = '';
    fileName = '';

    // Limpiar input file
    fileInput.value = '';

    // Limpiar salida
    document.getElementById('output').innerHTML = '';

    // Deshabilitar botón procesar
    processButton.disabled = true;

    // Restaurar zona de Drag & Drop
    dropZone.classList.remove('file-loaded', 'dragover');
    const dropTitle = dropZone.querySelector('.drop-title');
    const dropSubtitle = dropZone.querySelector('.drop-subtitle');
    if (dropTitle) dropTitle.innerHTML = 'Arrastra archivos aquí o haz clic para seleccionar';
    if (dropSubtitle) dropSubtitle.innerHTML = 'Formatos soportados: .txt';
}
