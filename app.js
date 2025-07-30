document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DEL DOM ---
    const appContainer = document.getElementById('app-container');
    const searchBox = document.getElementById('search-box');
    const categoryFilters = document.getElementById('category-filters');
    const macrosList = document.getElementById('macros-list');
    const reportArea = document.getElementById('report-area');
    const copyReportBtn = document.getElementById('copy-report-btn');
    const clearReportBtn = document.getElementById('clear-report-btn');
    const addNewMacroBtn = document.getElementById('add-new-macro-btn');
    const importMacrosBtn = document.getElementById('import-macros-btn');
    const exportMacrosBtn = document.getElementById('export-macros-btn');
    const importFileInput = document.getElementById('import-file-input');
    const focusModeBtn = document.getElementById('focus-mode-btn');

    // Modales
    const macroModal = document.getElementById('macro-modal');
    const macroModalTitle = document.getElementById('modal-title');
    const macroForm = document.getElementById('macro-form');
    const cancelMacroModalBtn = document.getElementById('cancel-modal-btn');
    const macroIdInput = document.getElementById('macro-id');
    const macroTitleInput = document.getElementById('macro-title');
    const macroCategoryInput = document.getElementById('macro-category');
    const macroContentInput = document.getElementById('macro-content');

    const templateModal = document.getElementById('template-modal');
    const templateModalTitle = document.getElementById('template-modal-title');
    const templateForm = document.getElementById('template-form');
    const templateFieldsDiv = document.getElementById('template-fields');
    const cancelTemplateBtn = document.getElementById('cancel-template-btn');

    // --- ESTADO DE LA APLICACIÓN ---
    let allMacros = [];
    let currentFilter = 'All';
    let currentMacroForTemplate = null; // Para el modal de plantillas

    // --- INICIALIZACIÓN ---
    const init = async () => {
        await loadMacros();
        renderCategories();
        renderMacros();
        addEventListeners();
    };

    // --- CARGA Y GESTIÓN DE DATOS ---
    const loadMacros = async () => {
        const storedMacros = localStorage.getItem('orlMacros');
        if (storedMacros) {
            allMacros = JSON.parse(storedMacros);
        } else {
            try {
                const response = await fetch('macros.json');
                if (!response.ok) throw new Error('Network response was not ok');
                const fetchedMacros = await response.json();
                // Adaptación del formato del JSON del usuario si es necesario
                allMacros = fetchedMacros.flatMap(group => {
                    if (group.items) {
                        return group.items.map(item => ({
                            id: item.id,
                            title: item.title,
                            category: group.subCategory, // Usar subCategory como categoría principal
                            content: item.content,
                            favorite: false // Inicializar como no favorito
                        }));
                    } else {
                        // Si ya está en el formato esperado, solo añadir favorite
                        return { ...group, favorite: false };
                    }
                });
                saveMacrosToLocalStorage();
            } catch (error) {
                console.error('Error al cargar las macros iniciales:', error);
                macrosList.innerHTML = '<p>No se pudieron cargar las macros. Asegúrate de que el archivo macros.json exista y sea accesible.</p>';
            }
        }
    };

    const saveMacrosToLocalStorage = () => {
        localStorage.setItem('orlMacros', JSON.stringify(allMacros));
    };

    const handleExportMacros = () => {
        const dataStr = JSON.stringify(allMacros, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `macros-orl-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleImportMacros = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                let importedMacros = [];

                // Detectar si el formato es el antiguo (con category y subCategory)
                if (Array.isArray(importedData) && importedData.every(item => item.category && item.items)) {
                    importedMacros = importedData.flatMap(group => 
                        group.items.map(item => ({
                            id: item.id,
                            title: item.title,
                            category: group.subCategory,
                            content: item.content,
                            favorite: false
                        }))
                    );
                } else if (Array.isArray(importedData) && importedData.every(item => item.id && item.title && item.category && item.content)) {
                    // Si ya está en el formato nuevo
                    importedMacros = importedData.map(item => ({ ...item, favorite: item.favorite || false }));
                } else {
                    throw new Error('Formato de archivo JSON no reconocido.');
                }

                // Evitar duplicados por ID y añadir nuevas macros
                const existingIds = new Set(allMacros.map(m => m.id));
                const newMacros = importedMacros.filter(m => !existingIds.has(m.id));

                if (newMacros.length > 0) {
                    allMacros.push(...newMacros);
                    saveMacrosToLocalStorage();
                    renderCategories();
                    renderMacros();
                    alert(`${newMacros.length} macros nuevas importadas con éxito.`);
                } else {
                    alert('No se encontraron macros nuevas o el formato no es válido.');
                }
            } catch (error) {
                alert(`Error al leer o procesar el archivo JSON: ${error.message}. Asegúrate de que el formato es correcto.`);
                console.error('Error en importación:', error);
            }
        };
        reader.readAsText(file);
        // Reset input para poder cargar el mismo archivo de nuevo
        importFileInput.value = '';
    };

    // --- RENDERIZADO ---
    const renderMacros = () => {
        macrosList.innerHTML = '';
        const searchTerm = searchBox.value.toLowerCase();

        const filteredMacros = allMacros.filter(macro => {
            const matchesCategory = currentFilter === 'All' || macro.category === currentFilter;
            const matchesSearch = macro.title.toLowerCase().includes(searchTerm) || macro.content.toLowerCase().includes(searchTerm);
            return matchesCategory && matchesSearch;
        }).sort((a, b) => {
            // Ordenar favoritos primero, luego alfabéticamente
            if (a.favorite && !b.favorite) return -1;
            if (!a.favorite && b.favorite) return 1;
            return a.title.localeCompare(b.title);
        });

        if (filteredMacros.length === 0) {
            macrosList.innerHTML = '<p>No se encontraron macros que coincidan con tu búsqueda.</p>';
            return;
        }

        filteredMacros.forEach(macro => {
            const macroEl = document.createElement('div');
            macroEl.className = 'macro-item';
            macroEl.innerHTML = `
                <div class="macro-header">
                    <span class="macro-title">${macro.title}</span>
                    <span class="macro-category">${macro.category}</span>
                </div>
                <button class="favorite-btn" data-id="${macro.id}">${macro.favorite ? '⭐' : '☆'}</button>
                <div class="macro-content">${macro.content.replace(/\n/g, '<br>')}</div>
                <div class="macro-actions">
                    <button class="btn btn-primary btn-sm add-to-report-btn" data-id="${macro.id}">Añadir al Informe</button>
                    <button class="btn btn-secondary btn-sm copy-macro-btn" data-id="${macro.id}">Copiar</button>
                    <button class="btn btn-light btn-sm edit-macro-btn" data-id="${macro.id}">Editar</button>
                    <button class="btn btn-danger btn-sm delete-macro-btn" data-id="${macro.id}">Eliminar</button>
                </div>
            `;
            macrosList.appendChild(macroEl);
        });
    };

    const renderCategories = () => {
        const categories = ['All', 'Favoritos', ...new Set(allMacros.map(m => m.category))].sort();
        categoryFilters.innerHTML = '';
        categories.forEach(category => {
            const btn = document.createElement('button');
            btn.className = `btn ${currentFilter === category ? 'active' : ''}`;
            btn.textContent = category;
            btn.dataset.category = category;
            categoryFilters.appendChild(btn);
        });
    };

    // --- MANEJO DE EVENTOS ---
    const addEventListeners = () => {
        searchBox.addEventListener('input', renderMacros);
        copyReportBtn.addEventListener('click', handleCopyReport);
        clearReportBtn.addEventListener('click', () => reportArea.value = '');
        addNewMacroBtn.addEventListener('click', handleAddNewMacro);
        exportMacrosBtn.addEventListener('click', handleExportMacros);
        importMacrosBtn.addEventListener('click', () => importFileInput.click());
        importFileInput.addEventListener('change', handleImportMacros);
        focusModeBtn.addEventListener('click', toggleFocusMode);

        cancelMacroModalBtn.addEventListener('click', closeMacroModal);
        macroForm.addEventListener('submit', handleMacroFormSubmit);

        cancelTemplateBtn.addEventListener('click', closeTemplateModal);
        templateForm.addEventListener('submit', handleTemplateFormSubmit);

        categoryFilters.addEventListener('click', e => {
            if (e.target.tagName === 'BUTTON') {
                currentFilter = e.target.dataset.category;
                renderCategories();
                renderMacros();
            }
        });

        macrosList.addEventListener('click', e => {
            const target = e.target;
            const macroId = target.dataset.id;
            if (!macroId) return;

            if (target.classList.contains('add-to-report-btn')) handleAddToReport(macroId);
            if (target.classList.contains('copy-macro-btn')) handleCopyMacro(macroId, target);
            if (target.classList.contains('edit-macro-btn')) handleEditMacro(macroId);
            if (target.classList.contains('delete-macro-btn')) handleDeleteMacro(macroId);
            if (target.classList.contains('favorite-btn')) toggleFavorite(macroId);
        });

        // Atajos de teclado
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F2') {
                e.preventDefault();
                searchBox.focus();
            }
            if (e.key === 'Enter' && searchBox === document.activeElement) {
                e.preventDefault();
                const firstMacroBtn = macrosList.querySelector('.add-to-report-btn');
                if (firstMacroBtn) firstMacroBtn.click();
            }
            if (e.ctrlKey && e.key === 's' && macroModal.style.display === 'flex') {
                e.preventDefault();
                macroForm.dispatchEvent(new Event('submit'));
            }
        });
    };

    // --- LÓGICA DE ACCIONES ---
    const handleCopy = (text, button) => {
        navigator.clipboard.writeText(text).then(() => {
            if (button) {
                const originalText = button.textContent;
                button.textContent = '¡Copiado!';
                button.classList.add('btn-success');
                setTimeout(() => {
                    button.textContent = originalText;
                    button.classList.remove('btn-success');
                }, 2000);
            }
        }).catch(err => console.error('Error al copiar:', err));
    };

    const handleCopyReport = () => handleCopy(reportArea.value, copyReportBtn);

    const handleCopyMacro = (id, button) => {
        const macro = allMacros.find(m => m.id === id);
        if (macro) handleCopy(macro.content, button);
    };

    const handleAddToReport = (id) => {
        const macro = allMacros.find(m => m.id === id);
        if (macro) {
            const variables = macro.content.match(/{{(.*?)}}/g);
            if (variables && variables.length > 0) {
                currentMacroForTemplate = macro;
                openTemplateModal(variables);
            } else {
                const separator = reportArea.value.length > 0 ? '\n\n' : '';
                reportArea.value += separator + macro.content;
                reportArea.scrollTop = reportArea.scrollHeight; // Auto-scroll
            }
        }
    };

    const handleTemplateFormSubmit = (e) => {
        e.preventDefault();
        let content = currentMacroForTemplate.content;
        const inputs = templateFieldsDiv.querySelectorAll('input');
        inputs.forEach(input => {
            const varName = input.dataset.varname;
            const varValue = input.value;
            content = content.replace(new RegExp(`{{${varName}}}`, 'g'), varValue);
        });

        const separator = reportArea.value.length > 0 ? '\n\n' : '';
        reportArea.value += separator + content;
        reportArea.scrollTop = reportArea.scrollHeight;
        closeTemplateModal();
    };

    const handleAddNewMacro = () => {
        macroForm.reset();
        macroIdInput.value = '';
        macroModalTitle.textContent = 'Añadir Nueva Macro';
        openMacroModal();
    };

    const handleEditMacro = (id) => {
        const macro = allMacros.find(m => m.id === id);
        if (macro) {
            macroIdInput.value = macro.id;
            macroTitleInput.value = macro.title;
            macroCategoryInput.value = macro.category;
            macroContentInput.value = macro.content;
            macroModalTitle.textContent = 'Editar Macro';
            openMacroModal();
        }
    };

    const handleDeleteMacro = (id) => {
        if (confirm('¿Estás seguro de que quieres eliminar esta macro?')) {
            allMacros = allMacros.filter(m => m.id !== id);
            saveMacrosToLocalStorage();
            renderCategories();
            renderMacros();
        }
    };

    const handleMacroFormSubmit = (e) => {
        e.preventDefault();
        const id = macroIdInput.value;
        const newMacroData = {
            title: macroTitleInput.value.trim(),
            category: macroCategoryInput.value.trim(),
            content: macroContentInput.value.trim(),
        };

        if (id) { // Editar
            allMacros = allMacros.map(m => m.id === id ? { ...m, ...newMacroData } : m);
        } else { // Crear
            newMacroData.id = Date.now().toString();
            newMacroData.favorite = false; // Las nuevas macros no son favoritas por defecto
            allMacros.push(newMacroData);
        }

        saveMacrosToLocalStorage();
        renderCategories();
        renderMacros();
        closeMacroModal();
    };

    const toggleFavorite = (id) => {
        allMacros = allMacros.map(macro => 
            macro.id === id ? { ...macro, favorite: !macro.favorite } : macro
        );
        saveMacrosToLocalStorage();
        renderMacros(); // Re-render para actualizar el estado del botón y el orden
    };

    const toggleFocusMode = () => {
        appContainer.classList.toggle('focus-mode');
        // Ajustar el tamaño del textarea si es necesario
        if (appContainer.classList.contains('focus-mode')) {
            reportArea.style.height = '70vh';
        } else {
            reportArea.style.height = '450px'; // Volver al tamaño original
        }
    };

    // --- FUNCIONES DE MODAL ---
    const openMacroModal = () => macroModal.style.display = 'flex';
    const closeMacroModal = () => macroModal.style.display = 'none';

    const openTemplateModal = (variables) => {
        templateFieldsDiv.innerHTML = '';
        variables.forEach(variable => {
            const varName = variable.replace(/{{|}}/g, '');
            const formGroup = document.createElement('div');
            formGroup.className = 'form-group';
            formGroup.innerHTML = `
                <label for="template-var-${varName}">${varName.charAt(0).toUpperCase() + varName.slice(1)}:</label>
                <input type="text" id="template-var-${varName}" data-varname="${varName}" placeholder="Introduce ${varName}">
            `;
            templateFieldsDiv.appendChild(formGroup);
        });
        templateModal.style.display = 'flex';
    };
    const closeTemplateModal = () => templateModal.style.display = 'none';

    // --- INICIAR LA APP ---
    init();
});