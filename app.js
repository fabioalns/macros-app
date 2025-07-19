/**
 * Módulo principal de la aplicación de Macros Médicos.
 * Encapsula toda la lógica para evitar la contaminación del espacio de nombres global.
 */
const MedicalMacrosApp = (() => {
    // Referencias a elementos del DOM
    const dom = {
        mainContent: document.getElementById('main-content'),
        categoriesNav: document.getElementById('categories-nav'),
        macroCardTemplate: document.getElementById('macro-card-template'),
        searchInput: document.getElementById('search-input'),
        addMacroBtn: document.getElementById('add-macro-btn'),
        macroModal: document.getElementById('macro-modal'),
        modalTitle: document.getElementById('modal-title'),
        closeModalBtn: document.getElementById('close-modal-btn'),
        macroForm: document.getElementById('macro-form'),
        macroId: document.getElementById('macro-id'),
        macroCategory: document.getElementById('macro-category'),
        macroSubCategory: document.getElementById('macro-subCategory'),
        macroTitle: document.getElementById('macro-title'),
        macroContent: document.getElementById('macro-content'),
        deleteMacroBtn: document.getElementById('delete-macro-btn'),
        toast: document.getElementById('toast'),
        welcomeMessage: document.getElementById('welcome-message'),
        categoryDatalist: document.getElementById('category-datalist'),
        subCategoryDatalist: document.getElementById('subCategory-datalist'),
        importBtn: document.getElementById('import-btn'),
        importInput: document.getElementById('import-input'),
        exportBtn: document.getElementById('export-btn'),
    };

    // Estado de la aplicación
    let state = {
        macros: [],
        searchFilter: '',
        debounceTimer: null,
    };

    const STORAGE_KEY = 'medicalMacrosData';

    /**
     * Inicializa la aplicación: carga los datos y configura los event listeners.
     */
    const init = async () => {
        await loadData();
        renderSidebar();
        setupEventListeners();
        updateDatalists();
    };

    /**
     * Carga los datos de macros. Intenta desde un JSON local, si falla,
     * usa localStorage. Si no hay nada, inicializa con un array vacío.
     */
    const loadData = async () => {
        try {
            const response = await fetch('macros.json');
            if (!response.ok) throw new Error('Network response was not ok');
            const jsonData = await response.json();
            
            const localData = localStorage.getItem(STORAGE_KEY);
            if (localData) {
                state.macros = JSON.parse(localData);
                console.log('Datos cargados desde localStorage.');
            } else {
                state.macros = jsonData;
                saveData(); // Guarda los datos iniciales en localStorage
                console.log('Datos iniciales cargados desde macros.json.');
            }
        } catch (error) {
            console.warn('No se pudo cargar macros.json. Usando localStorage como fallback.', error);
            const localData = localStorage.getItem(STORAGE_KEY);
            state.macros = localData ? JSON.parse(localData) : [];
        }
    };

    /**
     * Guarda el estado actual de los macros en localStorage.
     */
    const saveData = () => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state.macros));
        } catch (error) {
            console.error('Error al guardar datos en localStorage:', error);
            alert('No se pudieron guardar los cambios. El almacenamiento podría estar lleno.');
        }
    };

    /**
     * Renderiza la barra lateral con las categorías y subcategorías.
     */
    const renderSidebar = () => {
        const groupedData = groupMacros(state.macros);
        dom.categoriesNav.innerHTML = ''; // Limpiar antes de renderizar

        for (const category in groupedData) {
            const details = document.createElement('details');
            details.className = 'category-item';
            
            const summary = document.createElement('summary');
            summary.textContent = category;
            details.appendChild(summary);

            const subCategoryList = document.createElement('ul');
            subCategoryList.className = 'subcategory-list';

            for (const subCategory in groupedData[category]) {
                const subCategoryTitle = document.createElement('li');
                subCategoryTitle.className = 'subcategory-title';
                subCategoryTitle.textContent = subCategory;
                subCategoryTitle.dataset.category = category;
                subCategoryTitle.dataset.subcategory = subCategory;
                subCategoryTitle.setAttribute('role', 'button');
                subCategoryTitle.setAttribute('tabindex', '0');
                subCategoryList.appendChild(subCategoryTitle);
            }
            details.appendChild(subCategoryList);
            dom.categoriesNav.appendChild(details);
        }
    };

    /**
     * Renderiza las tarjetas de macros para una categoría/subcategoría específica.
     * @param {string} category - La categoría a mostrar.
     * @param {string} subCategory - La subcategoría a mostrar.
     */
    const renderMacros = (category, subCategory) => {
        dom.mainContent.innerHTML = ''; // Limpiar contenido
        dom.welcomeMessage.style.display = 'none';

        const filteredMacros = state.macros.filter(group => 
            group.category === category && group.subCategory === subCategory
        );

        if (filteredMacros.length === 0 || !filteredMacros[0].items) {
            dom.mainContent.innerHTML = '<p>No hay macros en esta sección.</p>';
            return;
        }

        filteredMacros[0].items.forEach(macro => {
            const card = createMacroCard(macro);
            dom.mainContent.appendChild(card);
        });
    };

    /**
     * Filtra y renderiza los macros basados en el término de búsqueda.
     */
    const renderSearchResults = () => {
        dom.mainContent.innerHTML = '';
        dom.welcomeMessage.style.display = 'none';

        const searchTerm = state.searchFilter.toLowerCase().trim();
        if (!searchTerm) {
            dom.mainContent.appendChild(dom.welcomeMessage);
            dom.welcomeMessage.style.display = 'block';
            return;
        }

        const results = [];
        state.macros.forEach(group => {
            group.items.forEach(item => {
                const titleMatch = item.title.toLowerCase().includes(searchTerm);
                const contentMatch = item.content.toLowerCase().includes(searchTerm);
                if (titleMatch || contentMatch) {
                    results.push(item);
                }
            });
        });

        if (results.length === 0) {
            dom.mainContent.innerHTML = '<p>No se encontraron resultados para su búsqueda.</p>';
            return;
        }
        
        results.forEach(macro => {
            const card = createMacroCard(macro);
            dom.mainContent.appendChild(card);
        });
    };

    /**
     * Crea un elemento de tarjeta de macro a partir de la plantilla.
     * @param {object} macroData - Los datos del macro.
     * @returns {Node} El elemento de la tarjeta clonado y rellenado.
     */
    const createMacroCard = (macroData) => {
        const card = dom.macroCardTemplate.content.cloneNode(true);
        card.querySelector('.macro-card').dataset.id = macroData.id;
        card.querySelector('.macro-title').textContent = macroData.title;
        card.querySelector('.macro-content').textContent = macroData.content;
        return card;
    };

    /**
     * Agrupa los macros por categoría y luego por subcategoría.
     * @param {Array} macros - La lista de grupos de macros.
     * @returns {object} Un objeto con los macros agrupados.
     */
    const groupMacros = (macros) => {
        return macros.reduce((acc, group) => {
            if (!acc[group.category]) {
                acc[group.category] = {};
            }
            if (!acc[group.category][group.subCategory]) {
                acc[group.category][group.subCategory] = [];
            }
            acc[group.category][group.subCategory].push(...group.items);
            return acc;
        }, {});
    };

    /**
     * Configura todos los event listeners de la aplicación.
     */
    const setupEventListeners = () => {
        // Clic en la barra lateral para mostrar macros
        dom.categoriesNav.addEventListener('click', (e) => {
            if (e.target.classList.contains('subcategory-title')) {
                const { category, subcategory } = e.target.dataset;
                renderMacros(category, subcategory);
            }
        });
        
        // Clic en las tarjetas de macro (copiar, editar)
        dom.mainContent.addEventListener('click', (e) => {
            const copyBtn = e.target.closest('.copy-btn');
            const editBtn = e.target.closest('.edit-btn');
            
            if (copyBtn) {
                const card = copyBtn.closest('.macro-card');
                const content = card.querySelector('.macro-content').textContent;
                copyToClipboard(content, card);
            } else if (editBtn) {
                const card = editBtn.closest('.macro-card');
                const macroId = card.dataset.id;
                openModalForEdit(macroId);
            }
        });

        // Búsqueda en tiempo real con debounce
        dom.searchInput.addEventListener('input', () => {
            clearTimeout(state.debounceTimer);
            state.debounceTimer = setTimeout(() => {
                state.searchFilter = dom.searchInput.value;
                renderSearchResults();
            }, 300);
        });

        // Atajo de teclado para la búsqueda
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                dom.searchInput.focus();
            }
        });

        // Lógica del modal
        dom.addMacroBtn.addEventListener('click', openModalForAdd);
        dom.closeModalBtn.addEventListener('click', closeModal);
        dom.macroModal.addEventListener('click', (e) => {
            if (e.target === dom.macroModal) closeModal();
        });
        dom.macroForm.addEventListener('submit', handleFormSubmit);
        dom.deleteMacroBtn.addEventListener('click', handleDelete);
        
        // Importar/Exportar
        dom.importBtn.addEventListener('click', () => dom.importInput.click());
        dom.importInput.addEventListener('change', handleImport);
        dom.exportBtn.addEventListener('click', handleExport);
    };
    
    /**
     * Copia texto al portapapeles y muestra una notificación.
     * @param {string} text - El texto a copiar.
     * @param {HTMLElement} element - El elemento que se copió, para resaltarlo.
     */
    const copyToClipboard = (text, element) => {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Copiado ✔');
            if (element) {
                element.classList.add('highlight');
                setTimeout(() => element.classList.remove('highlight'), 1000);
            }
        }).catch(err => {
            console.error('Error al copiar:', err);
            showToast('Error al copiar');
        });
    };

    /**
     * Muestra una notificación toast.
     * @param {string} message - El mensaje a mostrar.
     */
    const showToast = (message) => {
        dom.toast.textContent = message;
        dom.toast.classList.add('show');
        setTimeout(() => {
            dom.toast.classList.remove('show');
        }, 2000);
    };

    /**
     * Abre el modal para añadir un nuevo macro.
     */
    const openModalForAdd = () => {
        dom.macroForm.reset();
        dom.macroId.value = '';
        dom.modalTitle.textContent = 'Añadir Nuevo Macro';
        dom.deleteMacroBtn.style.display = 'none';
        dom.macroModal.style.display = 'flex';
        dom.macroCategory.focus();
    };

    /**
     * Abre el modal para editar un macro existente.
     * @param {string} macroId - El ID del macro a editar.
     */
    const openModalForEdit = (macroId) => {
        const { group, item } = findMacroById(macroId);
        if (!item) return;

        dom.macroForm.reset();
        dom.macroId.value = item.id;
        dom.macroCategory.value = group.category;
        dom.macroSubCategory.value = group.subCategory;
        dom.macroTitle.value = item.title;
        dom.macroContent.value = item.content;

        dom.modalTitle.textContent = 'Editar Macro';
        dom.deleteMacroBtn.style.display = 'inline-block';
        dom.macroModal.style.display = 'flex';
    };

    /**
     * Cierra el modal.
     */
    const closeModal = () => {
        dom.macroModal.style.display = 'none';
    };

    /**
     * Maneja el envío del formulario para crear o actualizar un macro.
     * @param {Event} e - El evento de envío del formulario.
     */
    const handleFormSubmit = (e) => {
        e.preventDefault();
        const id = dom.macroId.value;
        const formData = {
            category: dom.macroCategory.value.trim(),
            subCategory: dom.macroSubCategory.value.trim(),
            title: dom.macroTitle.value.trim(),
            content: dom.macroContent.value.trim(),
        };

        if (id) {
            // Actualizar
            updateMacro(id, formData);
        } else {
            // Crear
            createMacro(formData);
        }

        closeModal();
        saveData();
        renderSidebar();
        updateDatalists();
        // Opcional: re-renderizar la vista actual si es relevante
        if (dom.searchInput.value) {
            renderSearchResults();
        } else {
            renderMacros(formData.category, formData.subCategory);
        }
    };

    /**
     * Crea un nuevo macro y lo añade al estado.
     * @param {object} data - Datos del nuevo macro.
     */
    const createMacro = (data) => {
        const newMacro = {
            id: generateId(data.title),
            title: data.title,
            content: data.content,
        };

        let group = state.macros.find(g => g.category === data.category && g.subCategory === data.subCategory);

        if (group) {
            group.items.push(newMacro);
        } else {
            state.macros.push({
                category: data.category,
                subCategory: data.subCategory,
                items: [newMacro],
            });
        }
    };

    /**
     * Actualiza un macro existente.
     * @param {string} id - El ID del macro a actualizar.
     * @param {object} data - Los nuevos datos del macro.
     */
    const updateMacro = (id, data) => {
        // Primero, elimina el macro de su ubicación actual
        deleteMacroById(id);
        // Luego, créalo de nuevo con los datos actualizados. Esto maneja casos donde la categoría/subcategoría cambia.
        const updatedMacro = {
            id: id, // Conserva el ID original
            title: data.title,
            content: data.content,
        };
        let group = state.macros.find(g => g.category === data.category && g.subCategory === data.subCategory);
        if (group) {
            group.items.push(updatedMacro);
        } else {
            state.macros.push({
                category: data.category,
                subCategory: data.subCategory,
                items: [updatedMacro],
            });
        }
    };

    /**
     * Maneja la eliminación de un macro.
     */
    const handleDelete = () => {
        const id = dom.macroId.value;
        if (id && confirm('¿Estás seguro de que quieres eliminar este macro? Esta acción no se puede deshacer.')) {
            const { group } = findMacroById(id);
            deleteMacroById(id);
            closeModal();
            saveData();
            renderSidebar();
            // Re-renderizar la vista
            if (group) {
               renderMacros(group.category, group.subCategory);
            } else {
               dom.mainContent.innerHTML = '';
               dom.welcomeMessage.style.display = 'block';
            }
        }
    };
    
    /**
     * Elimina un macro del estado por su ID.
     * @param {string} id - El ID del macro a eliminar.
     */
    const deleteMacroById = (id) => {
        state.macros.forEach((group, groupIndex) => {
            const itemIndex = group.items.findIndex(item => item.id === id);
            if (itemIndex > -1) {
                group.items.splice(itemIndex, 1);
                // Si el grupo se queda vacío, eliminarlo
                if (group.items.length === 0) {
                    state.macros.splice(groupIndex, 1);
                }
            }
        });
    };

    /**
     * Encuentra un macro y su grupo por ID.
     * @param {string} id - El ID del macro a encontrar.
     * @returns {{group: object, item: object}} El grupo y el item encontrados.
     */
    const findMacroById = (id) => {
        for (const group of state.macros) {
            const item = group.items.find(i => i.id === id);
            if (item) {
                return { group, item };
            }
        }
        return { group: null, item: null };
    };

    /**
     * Genera un ID único para un nuevo macro.
     * @param {string} title - El título del macro.
     * @returns {string} Un ID generado.
     */
    const generateId = (title) => {
        const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        return `${base}_${Date.now()}`;
    };
    
    /**
     * Actualiza las listas de autocompletado para categorías y subcategorías.
     */
    const updateDatalists = () => {
        const categories = new Set(state.macros.map(g => g.category));
        const subCategories = new Set(state.macros.map(g => g.subCategory));

        dom.categoryDatalist.innerHTML = [...categories].map(c => `<option value="${c}"></option>`).join('');
        dom.subCategoryDatalist.innerHTML = [...subCategories].map(sc => `<option value="${sc}"></option>`).join('');
    };
    
    /**
     * Maneja la importación de un archivo JSON.
     * @param {Event} e - El evento de cambio del input de archivo.
     */
    const handleImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                if (!Array.isArray(importedData)) throw new Error('El JSON no es un array válido.');
                
                if (confirm('¿Deseas combinar los datos importados con los existentes? "Cancelar" reemplazará los datos actuales.')) {
                    // Lógica de merge simple: añade nuevos, no sobreescribe existentes por ID
                    const existingIds = new Set(state.macros.flatMap(g => g.items.map(i => i.id)));
                    importedData.forEach(importedGroup => {
                        let localGroup = state.macros.find(g => g.category === importedGroup.category && g.subCategory === importedGroup.subCategory);
                        if (!localGroup) {
                            localGroup = { category: importedGroup.category, subCategory: importedGroup.subCategory, items: [] };
                            state.macros.push(localGroup);
                        }
                        importedGroup.items.forEach(importedItem => {
                            if (!existingIds.has(importedItem.id)) {
                                localGroup.items.push(importedItem);
                            }
                        });
                    });
                } else {
                    state.macros = importedData;
                }
                
                saveData();
                renderSidebar();
                updateDatalists();
                dom.mainContent.innerHTML = '';
                dom.welcomeMessage.style.display = 'block';
                showToast('Datos importados con éxito.');
            } catch (error) {
                alert('Error al importar el archivo. Asegúrate de que es un JSON válido con la estructura correcta.');
                console.error('Error de importación:', error);
            } finally {
                // Resetea el input para poder importar el mismo archivo de nuevo
                dom.importInput.value = '';
            }
        };
        reader.readAsText(file);
    };

    /**
     * Maneja la exportación de los datos actuales a un archivo JSON.
     */
    const handleExport = () => {
        const dataStr = JSON.stringify(state.macros, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `macros_medicos_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast('Datos exportados.');
    };

    // Exponer el método de inicialización
    return {
        init,
    };
})();

// Iniciar la aplicación cuando el DOM esté listo.
document.addEventListener('DOMContentLoaded', MedicalMacrosApp.init);
