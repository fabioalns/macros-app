document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DEL DOM ---
    const appContainer = document.getElementById('app-container');
    const searchBox = document.getElementById('search-box');
    const macrosPalette = document.getElementById('macros-palette');
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
    const macroForm = document.getElementById('macro-form');
    const cancelMacroModalBtn = document.getElementById('cancel-modal-btn');
    const macroIdInput = document.getElementById('macro-id');
    const macroTitleInput = document.getElementById('macro-title');
    const macroCategoryInput = document.getElementById('macro-category');
    const macroContentInput = document.getElementById('macro-content');
    const macroFavoriteCheckbox = document.getElementById('macro-favorite');

    const templateModal = document.getElementById('template-modal');
    const templateForm = document.getElementById('template-form');
    const templateFieldsDiv = document.getElementById('template-fields');
    const cancelTemplateBtn = document.getElementById('cancel-template-btn');

    // Menú Contextual
    const contextMenu = document.getElementById('context-menu');
    const ctxFavoriteBtn = document.getElementById('ctx-favorite-btn');
    const ctxEditBtn = document.getElementById('ctx-edit-btn');
    const ctxDeleteBtn = document.getElementById('ctx-delete-btn');

    // --- ESTADO DE LA APLICACIÓN ---
    let allMacros = [];
    let currentMacroForTemplate = null;
    let activeContextMenuMacroId = null;

    // --- INICIALIZACIÓN ---
    const init = async () => {
        await loadMacros();
        renderMacrosPalette();
        addEventListeners();
    };

    // --- CARGA Y GESTIÓN DE DATOS ---
    const loadMacros = async () => {
        const storedMacros = localStorage.getItem('orlMacros_v2');
        if (storedMacros) {
            allMacros = JSON.parse(storedMacros);
        } else {
            try {
                const response = await fetch('macros.json');
                if (!response.ok) throw new Error('Network response was not ok');
                const fetchedMacros = await response.json();
                // Asegurarse de que el campo favorite exista
                allMacros = fetchedMacros.map(m => ({ ...m, favorite: m.favorite || false }));
                saveMacrosToLocalStorage();
            } catch (error) {
                console.error('Error al cargar las macros iniciales:', error);
                macrosPalette.innerHTML = '<p>No se pudieron cargar las macros.</p>';
            }
        }
    };

    const saveMacrosToLocalStorage = () => {
        localStorage.setItem('orlMacros_v2', JSON.stringify(allMacros));
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
                const importedMacros = JSON.parse(e.target.result);
                if (!Array.isArray(importedMacros) || !importedMacros.every(m => m.id && m.title && m.category && m.content)) {
                    throw new Error('Formato de archivo JSON no reconocido.');
                }
                const existingIds = new Set(allMacros.map(m => m.id));
                const newMacros = importedMacros.filter(m => !existingIds.has(m.id)).map(m => ({ ...m, favorite: m.favorite || false }));

                if (newMacros.length > 0) {
                    allMacros.push(...newMacros);
                    saveMacrosToLocalStorage();
                    renderMacrosPalette();
                    alert(`${newMacros.length} macros nuevas importadas con éxito.`);
                } else {
                    alert('No se encontraron macros nuevas o ya existen.');
                }
            } catch (error) {
                alert(`Error al procesar el archivo: ${error.message}`);
            }
        };
        reader.readAsText(file);
        importFileInput.value = '';
    };

    // --- RENDERIZADO DE LA PALETA ---
    const renderMacrosPalette = () => {
        macrosPalette.innerHTML = '';
        const searchTerm = searchBox.value.toLowerCase();

        const filteredMacros = allMacros.filter(macro => 
            macro.title.toLowerCase().includes(searchTerm) || 
            macro.content.toLowerCase().includes(searchTerm)
        );

        const favoriteMacros = filteredMacros.filter(m => m.favorite);
        const regularMacros = filteredMacros.filter(m => !m.favorite);

        const macrosByCategory = regularMacros.reduce((acc, macro) => {
            (acc[macro.category] = acc[macro.category] || []).push(macro);
            return acc;
        }, {});

        // Renderizar Favoritos primero
        if (favoriteMacros.length > 0) {
            renderCategory('⭐ Favoritos', favoriteMacros, true);
        }

        // Renderizar resto de categorías
        const sortedCategories = Object.keys(macrosByCategory).sort();
        sortedCategories.forEach(category => {
            renderCategory(category, macrosByCategory[category]);
        });

        if (filteredMacros.length === 0) {
            macrosPalette.innerHTML = '<p>No se encontraron macros.</p>';
        }
    };

    const renderCategory = (category, macros, isFavoriteCategory = false) => {
        const groupEl = document.createElement('div');
        groupEl.className = 'macro-category-group';
        
        const titleEl = document.createElement('div');
        titleEl.className = 'macro-category-title';
        if (isFavoriteCategory) {
            titleEl.classList.add('favorite-title');
        }
        titleEl.textContent = category;
        titleEl.addEventListener('click', () => groupEl.classList.toggle('collapsed'));

        const pillsContainer = document.createElement('div');
        pillsContainer.className = 'macro-pills';

        macros.sort((a, b) => a.title.localeCompare(b.title)).forEach(macro => {
            const pillEl = document.createElement('div');
            pillEl.className = 'macro-pill';
            if (macro.favorite) {
                pillEl.classList.add('favorite');
            }
            pillEl.textContent = macro.title;
            pillEl.dataset.id = macro.id;
            pillsContainer.appendChild(pillEl);
        });

        groupEl.appendChild(titleEl);
        groupEl.appendChild(pillsContainer);
        macrosPalette.appendChild(groupEl);
    };

    // --- MANEJO DE EVENTOS ---
    const addEventListeners = () => {
        searchBox.addEventListener('input', renderMacrosPalette);
        copyReportBtn.addEventListener('click', handleCopyReport);
        clearReportBtn.addEventListener('click', () => { reportArea.value = ''; });
        addNewMacroBtn.addEventListener('click', handleAddNewMacro);
        exportMacrosBtn.addEventListener('click', handleExportMacros);
        importMacrosBtn.addEventListener('click', () => importFileInput.click());
        importFileInput.addEventListener('change', handleImportMacros);
        focusModeBtn.addEventListener('click', toggleFocusMode);

        // Modales
        cancelMacroModalBtn.addEventListener('click', closeMacroModal);
        macroForm.addEventListener('submit', handleMacroFormSubmit);
        cancelTemplateBtn.addEventListener('click', closeTemplateModal);
        templateForm.addEventListener('submit', handleTemplateFormSubmit);

        // Interacción con la paleta
        macrosPalette.addEventListener('click', e => {
            if (e.target.classList.contains('macro-pill')) {
                handleAddToReport(e.target.dataset.id);
            }
        });

        macrosPalette.addEventListener('contextmenu', e => {
            if (e.target.classList.contains('macro-pill')) {
                e.preventDefault();
                activeContextMenuMacroId = e.target.dataset.id;
                showContextMenu(e.clientX, e.clientY);
            }
        });

        // Menú contextual
        ctxFavoriteBtn.addEventListener('click', () => {
            if (activeContextMenuMacroId) toggleFavorite(activeContextMenuMacroId);
            hideContextMenu();
        });
        ctxEditBtn.addEventListener('click', () => {
            if (activeContextMenuMacroId) handleEditMacro(activeContextMenuMacroId);
            hideContextMenu();
        });
        ctxDeleteBtn.addEventListener('click', () => {
            if (activeContextMenuMacroId) handleDeleteMacro(activeContextMenuMacroId);
            hideContextMenu();
        });
        document.addEventListener('click', hideContextMenu);

        // Atajos de teclado
        document.addEventListener('keydown', e => {
            if (e.key === 'F2') { e.preventDefault(); searchBox.focus(); }
            if (e.ctrlKey && e.key === 's' && macroModal.style.display === 'flex') {
                e.preventDefault();
                macroForm.dispatchEvent(new Event('submit'));
            }
        });
    };

    // --- LÓGICA DE ACCIONES ---
    const handleCopyReport = () => {
        if (!reportArea.value) return;
        navigator.clipboard.writeText(reportArea.value).then(() => {
            const originalText = copyReportBtn.textContent;
            copyReportBtn.textContent = '¡Copiado!';
            setTimeout(() => { copyReportBtn.textContent = originalText; }, 2000);
        }).catch(err => console.error('Error al copiar:', err));
    };

    const handleAddToReport = (id) => {
        const macro = allMacros.find(m => m.id === id);
        if (!macro) return;

        const variables = macro.content.match(/{{(.*?)}}/g);
        if (variables && variables.length > 0) {
            currentMacroForTemplate = macro;
            openTemplateModal([...new Set(variables.map(v => v.replace(/{{|}}/g, '')))]);
        } else {
            insertTextIntoReport(macro.content);
        }
    };

    const insertTextIntoReport = (text) => {
        const separator = reportArea.value.length > 0 && !reportArea.value.endsWith('\n\n') ? '\n\n' : (reportArea.value.length > 0 ? '' : '');
        reportArea.value += separator + text;
        reportArea.scrollTop = reportArea.scrollHeight;
    };

    const handleTemplateFormSubmit = e => {
        e.preventDefault();
        let content = currentMacroForTemplate.content;
        templateFieldsDiv.querySelectorAll('input').forEach(input => {
            content = content.replace(new RegExp(`{{${input.dataset.varname}}}`, 'g'), input.value);
        });
        insertTextIntoReport(content);
        closeTemplateModal();
    };

    const handleAddNewMacro = () => {
        macroForm.reset();
        macroIdInput.value = '';
        macroFavoriteCheckbox.checked = false;
        document.getElementById('modal-title').textContent = 'Añadir Nueva Macro';
        openMacroModal();
    };

    const handleEditMacro = (id) => {
        const macro = allMacros.find(m => m.id === id);
        if (macro) {
            macroIdInput.value = macro.id;
            macroTitleInput.value = macro.title;
            macroCategoryInput.value = macro.category;
            macroContentInput.value = macro.content;
            macroFavoriteCheckbox.checked = macro.favorite || false;
            document.getElementById('modal-title').textContent = 'Editar Macro';
            openMacroModal();
        }
    };

    const handleDeleteMacro = (id) => {
        if (confirm('¿Estás seguro de que quieres eliminar esta macro?')) {
            allMacros = allMacros.filter(m => m.id !== id);
            saveMacrosToLocalStorage();
            renderMacrosPalette();
        }
    };

    const handleMacroFormSubmit = e => {
        e.preventDefault();
        const id = macroIdInput.value;
        const newMacroData = {
            title: macroTitleInput.value.trim(),
            category: macroCategoryInput.value.trim() || 'General',
            content: macroContentInput.value.trim(),
            favorite: macroFavoriteCheckbox.checked
        };

        if (id) { // Editar
            allMacros = allMacros.map(m => m.id === id ? { ...m, ...newMacroData } : m);
        } else { // Crear
            newMacroData.id = Date.now().toString();
            allMacros.push(newMacroData);
        }

        saveMacrosToLocalStorage();
        renderMacrosPalette();
        closeMacroModal();
    };

    const toggleFavorite = (id) => {
        allMacros = allMacros.map(macro => 
            macro.id === id ? { ...macro, favorite: !macro.favorite } : macro
        );
        saveMacrosToLocalStorage();
        renderMacrosPalette();
    };

    const toggleFocusMode = () => {
        appContainer.classList.toggle('focus-mode');
    };

    // --- FUNCIONES DE MODAL Y MENÚ CONTEXTUAL ---
    const openMacroModal = () => { macroModal.style.display = 'flex'; };
    const closeMacroModal = () => { macroModal.style.display = 'none'; };

    const openTemplateModal = (variables) => {
        templateFieldsDiv.innerHTML = '';
        variables.forEach(varName => {
            const formGroup = document.createElement('div');
            formGroup.className = 'form-group';
            formGroup.innerHTML = `
                <label for="template-var-${varName}">${varName.charAt(0).toUpperCase() + varName.slice(1)}:</label>
                <input type="text" id="template-var-${varName}" data-varname="${varName}" required>
            `;
            templateFieldsDiv.appendChild(formGroup);
        });
        document.getElementById('template-modal-title').textContent = `Completar "${currentMacroForTemplate.title}"`;
        templateModal.style.display = 'flex';
        const firstInput = templateFieldsDiv.querySelector('input');
        if (firstInput) setTimeout(() => firstInput.focus(), 100);
    };
    const closeTemplateModal = () => { templateModal.style.display = 'none'; };

    const showContextMenu = (x, y) => {
        const macro = allMacros.find(m => m.id === activeContextMenuMacroId);
        if (!macro) return;

        ctxFavoriteBtn.textContent = macro.favorite ? '⭐ Quitar de Favoritos' : '⭐ Añadir a Favoritos';
        contextMenu.style.left = `${x}px`;
        contextMenu.style.top = `${y}px`;
        contextMenu.style.display = 'block';
    };
    const hideContextMenu = () => {
        contextMenu.style.display = 'none';
        activeContextMenuMacroId = null;
    };

    // --- INICIAR LA APP ---
    init();
});
