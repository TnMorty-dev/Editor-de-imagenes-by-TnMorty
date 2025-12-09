/**
 * Editor de Imagen by TnMorty
 * Layer-based Image Editor with Visual History
 */

// ============================================
// Layer Class
// ============================================
class Layer {
    constructor(id, name, type, data = null) {
        this.id = id;
        this.name = name;
        this.type = type; // 'image', 'text', 'overlay'
        this.visible = true;
        this.opacity = 1;
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        this.data = data; // Image data, text data, etc.
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
    }

    setSize(width, height) {
        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;
    }

    drawImage(img, x = 0, y = 0, w = null, h = null) {
        w = w || img.width;
        h = h || img.height;
        this.setSize(w, h);
        this.ctx.drawImage(img, x, y, w, h);
    }

    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    getImageData() {
        return this.ctx.getImageData(0, 0, this.width, this.height);
    }

    putImageData(imageData, x = 0, y = 0) {
        this.ctx.putImageData(imageData, x, y);
    }

    crop(x, y, width, height) {
        const imageData = this.ctx.getImageData(x, y, width, height);
        this.setSize(width, height);
        this.ctx.putImageData(imageData, 0, 0);
    }

    toDataURL() {
        return this.canvas.toDataURL();
    }
}

// ============================================
// State Management
// ============================================
const state = {
    // Canvas dimensions (the "document" size)
    canvasWidth: 800,
    canvasHeight: 600,

    // Layers
    layers: [],
    selectedLayerId: null,
    layerIdCounter: 0,

    // History
    history: [],
    historyIndex: -1,
    maxHistory: 30,

    // Format
    selectedFormat: 'png',

    // Edit modes
    editMode: null,

    // Crop state
    crop: {
        active: false,
        startX: 0,
        startY: 0,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        dragging: false,
        resizing: false,
        resizeHandle: null
    },

    // Text state
    text: {
        x: 50,
        y: 50,
        content: 'Tu Texto',
        size: 32,
        color: '#ffffff',
        font: 'Arial',
        bold: false,
        shadow: false,
        dragging: false,
        resizing: false
    },

    // Overlay state
    overlay: {
        image: null,
        x: 50,
        y: 50,
        width: 200,
        height: 150,
        opacity: 1,
        dragging: false,
        resizing: false
    },

    // View options
    view: {
        grid: false,
        snap: true,
        deform: true
    },

    // Move layer state
    move: {
        dragging: false,
        resizing: false,
        resizeHandle: null,
        startX: 0,
        startY: 0,
        layerStartX: 0,
        layerStartY: 0,
        startWidth: 0,
        startHeight: 0
    },

    // Remove background state
    removeBg: {
        selectedColor: null,
        tolerance: 30
    },

    // Original resolution (for reset)
    originalWidth: 800,
    originalHeight: 600,

    // Crop all mode
    cropAllMode: false
};

// ============================================
// DOM Elements
// ============================================
const elements = {
    canvas: document.getElementById('mainCanvas'),
    canvasContainer: document.getElementById('canvasContainer'),
    dropZone: document.getElementById('dropZone'),
    fileInput: document.getElementById('fileInput'),
    interactiveLayer: document.getElementById('interactiveLayer'),
    cropBox: document.getElementById('cropBox'),
    draggableText: document.getElementById('draggableText'),
    textPreview: document.getElementById('textPreview'),
    draggableOverlay: document.getElementById('draggableOverlay'),
    overlayPreview: document.getElementById('overlayPreview'),
    imageSize: document.getElementById('imageSize'),
    imageFormat: document.getElementById('imageFormat'),
    editMode: document.getElementById('editMode'),
    cropDimensions: document.getElementById('cropDimensions'),

    // View Options
    gridOverlay: document.getElementById('gridOverlay'),
    btnToggleGrid: document.getElementById('btnToggleGrid'),
    btnToggleSnap: document.getElementById('btnToggleSnap'),
    iconGrid: document.getElementById('iconGrid'),
    iconSnap: document.getElementById('iconSnap'),
    btnToggleDeform: document.getElementById('btnToggleDeform'),
    iconDeform: document.getElementById('iconDeform'),

    // Editor Tools
    moveBox: document.getElementById('moveBox'),

    // Panels
    panelLayers: document.getElementById('panelLayers'),
    panelHistory: document.getElementById('panelHistory'),
    layersList: document.getElementById('layersList'),
    historyList: document.getElementById('historyList'),

    // Buttons
    btnAddLayer: document.getElementById('btnAddLayer'),
    layerDropdownMenu: document.getElementById('layerDropdownMenu'),
    btnDeleteLayer: document.getElementById('btnDeleteLayer'),
    btnClearHistory: document.getElementById('btnClearHistory'),

    downloadSection: document.getElementById('downloadSection'),
    btnDownload: document.getElementById('btnDownload'),
    toastContainer: document.getElementById('toastContainer'),

    // Canvas content
    canvasContent: document.getElementById('canvasContent')
};

let mainCtx;

// ============================================
// Initialization
// ============================================
function init() {
    mainCtx = elements.canvas.getContext('2d');
    elements.canvas.width = state.canvasWidth;
    elements.canvas.height = state.canvasHeight;

    setupEventListeners();
    setupZoomEvents();
    elements.imageFormat.addEventListener('click', cycleFormatV2);
    showToast('¡Bienvenido a Editor de Imagen by TnMorty!', 'success');
}

// ============================================
// Event Listeners
// ============================================
function setupEventListeners() {
    // File handling
    elements.fileInput.addEventListener('change', handleFileSelect);
    elements.dropZone.addEventListener('click', () => elements.fileInput.click());
    elements.dropZone.addEventListener('dragover', handleDragOver);
    elements.dropZone.addEventListener('dragleave', handleDragLeave);
    elements.dropZone.addEventListener('drop', handleDrop);

    // Menu buttons
    document.getElementById('btnLoad').addEventListener('click', () => elements.fileInput.click());
    document.getElementById('btnPresetRes').addEventListener('click', () => showPanel('panelPresetRes'));
    document.getElementById('btnManualRes').addEventListener('click', () => showPanel('panelManualRes'));
    document.getElementById('btnConvert').addEventListener('click', () => showPanel('panelConvert'));
    document.getElementById('btnEditor').addEventListener('click', () => showPanel('panelEditor'));
    document.getElementById('btnExit').addEventListener('click', resetEditor);

    // View Options
    elements.btnToggleGrid.addEventListener('click', toggleGrid);
    elements.btnToggleSnap.addEventListener('click', toggleSnap);
    elements.btnToggleDeform.addEventListener('click', toggleDeform);

    // Panel close buttons
    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => {
            exitEditMode();
            hideToolPanels();
        });
    });

    // Back to editor buttons
    document.querySelectorAll('[data-back-editor]').forEach(btn => {
        btn.addEventListener('click', () => {
            exitEditMode();
            showPanel('panelEditor');
        });
    });

    // Preset resolution
    document.querySelectorAll('[data-preset]').forEach(btn => {
        btn.addEventListener('click', (e) => handlePresetResolution(e.currentTarget.dataset.preset));
    });

    // 16:9 auto
    const widthInputGroup = document.getElementById('widthInputGroup');
    document.querySelector('[data-preset="16:9"]').addEventListener('click', () => {
        widthInputGroup.hidden = !widthInputGroup.hidden;
    });

    document.getElementById('applyAutoRatio').addEventListener('click', () => {
        const width = parseInt(document.getElementById('autoWidth').value);
        if (width > 0) {
            resizeCanvas(width, Math.round(width / 16 * 9));
            widthInputGroup.hidden = true;
        }
    });

    // Manual resolution
    document.getElementById('applyManualRes').addEventListener('click', () => {
        const width = parseInt(document.getElementById('manualWidth').value);
        const height = parseInt(document.getElementById('manualHeight').value);
        if (width > 0 && height > 0) {
            resizeCanvas(width, height);
        }
    });

    // Format conversion
    document.querySelectorAll('[data-format]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('[data-format]').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            state.selectedFormat = e.currentTarget.dataset.format;
            elements.imageFormat.textContent = state.selectedFormat.toUpperCase();
            showToast(`Formato: ${state.selectedFormat.toUpperCase()}`, 'success');
        });
    });



    // Editor sub-panels
    document.querySelectorAll('[data-editor]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.currentTarget.dataset.editor;
            if (!getSelectedLayer() && action !== 'text' && action !== 'overlay') {
                showToast('Selecciona una capa primero', 'error');
                return;
            }
            switch (action) {
                case 'move': enterMoveMode(); break;
                case 'crop': enterCropModeV2(false); showPanel('panelCrop'); break;
                case 'cropAll': enterCropModeV2(true); showPanel('panelCrop'); break;
                // removeBg removed
                case 'text': enterTextMode(); showPanel('panelText'); break;
                case 'overlay': showPanel('panelOverlay'); break;
                case 'rotate': showPanel('panelRotate'); break;
                case 'flip': showPanel('panelFlip'); break;
            }
        });
    });

    // Crop
    document.getElementById('applyCrop').addEventListener('click', applyCrop);
    document.getElementById('cancelCrop').addEventListener('click', () => { exitEditMode(); showPanel('panelEditor'); });

    // Text
    setupTextControls();
    document.getElementById('applyText').addEventListener('click', applyText);
    document.getElementById('cancelText').addEventListener('click', () => { exitEditMode(); showPanel('panelEditor'); });

    // Overlay
    setupOverlayControls();
    document.getElementById('applyOverlay').addEventListener('click', applyOverlay);
    document.getElementById('cancelOverlay').addEventListener('click', () => { exitEditMode(); showPanel('panelEditor'); });

    // Rotate
    document.querySelectorAll('[data-rotate]').forEach(btn => {
        btn.addEventListener('click', (e) => rotateSelectedLayer(parseInt(e.currentTarget.dataset.rotate)));
    });
    document.getElementById('applyCustomRotate').addEventListener('click', () => {
        rotateSelectedLayer(parseInt(document.getElementById('customRotate').value) || 0);
    });

    // Flip
    document.querySelectorAll('[data-flip]').forEach(btn => {
        btn.addEventListener('click', (e) => flipSelectedLayer(e.currentTarget.dataset.flip));
    });

    // Layer dropdown menu
    elements.btnAddLayer.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.layerDropdownMenu.hidden = !elements.layerDropdownMenu.hidden;
    });

    document.querySelectorAll('[data-layer-type]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const type = e.currentTarget.dataset.layerType;
            elements.layerDropdownMenu.hidden = true;
            handleAddLayerByType(type);
        });
    });

    // Close dropdown when clicking elsewhere
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.layer-dropdown')) {
            elements.layerDropdownMenu.hidden = true;
        }
    });

    elements.btnDeleteLayer.addEventListener('click', deleteSelectedLayer);
    elements.btnClearHistory.addEventListener('click', clearHistory);

    // Download
    elements.btnDownload.addEventListener('click', downloadImage);

    // Keyboard
    document.addEventListener('keydown', handleKeyboard);

    // Interactive events
    setupInteractiveEvents();
}

// ============================================
// Layer Management
// ============================================
function createLayer(name, type, img = null) {
    const id = ++state.layerIdCounter;
    const layer = new Layer(id, name, type);

    if (img) {
        layer.drawImage(img);
        layer.x = 0;
        layer.y = 0;
    }

    state.layers.push(layer);
    state.selectedLayerId = id;

    renderLayersPanel();
    renderCanvas();

    return layer;
}

function handleAddLayerByType(type) {
    switch (type) {
        case 'blank':
            createBlankLayer('#ffffff');
            break;
        case 'transparent':
            createBlankLayer('transparent');
            break;
        case 'image':
            elements.fileInput.click();
            break;
    }
}

function createBlankLayer(fillColor) {
    const id = ++state.layerIdCounter;
    const name = fillColor === 'transparent' ? 'Capa Transparente' : 'Capa en Blanco';
    const layer = new Layer(id, name, 'image');

    layer.setSize(state.canvasWidth, state.canvasHeight);
    layer.x = 0;
    layer.y = 0;

    if (fillColor !== 'transparent') {
        layer.ctx.fillStyle = fillColor;
        layer.ctx.fillRect(0, 0, state.canvasWidth, state.canvasHeight);
    }

    state.layers.push(layer);
    state.selectedLayerId = id;

    // Show UI if first layer
    elements.canvasContainer.classList.add('has-image');
    elements.panelLayers.hidden = false;
    elements.downloadSection.hidden = false;

    saveHistory(`Crear ${name}`, '📄');
    renderLayersPanel();
    renderCanvas();
    showToast(`${name} creada`, 'success');
}

function getSelectedLayer() {
    return state.layers.find(l => l.id === state.selectedLayerId);
}

function selectLayer(id) {
    state.selectedLayerId = id;
    renderLayersPanel();
}

function deleteSelectedLayer() {
    if (state.layers.length <= 1) {
        showToast('No puedes eliminar la última capa', 'warning');
        return;
    }

    const index = state.layers.findIndex(l => l.id === state.selectedLayerId);
    if (index > -1) {
        state.layers.splice(index, 1);
        state.selectedLayerId = state.layers[Math.max(0, index - 1)].id;

        saveHistory('Eliminar capa', '🗑️');
        renderLayersPanel();
        renderCanvas();
        showToast('Capa eliminada', 'success');
    }
}

function toggleLayerVisibility(id) {
    const layer = state.layers.find(l => l.id === id);
    if (layer) {
        layer.visible = !layer.visible;
        renderLayersPanel();
        renderCanvas();
    }
}

function moveLayerUp(id) {
    const index = state.layers.findIndex(l => l.id === id);
    if (index < state.layers.length - 1) {
        const temp = state.layers[index];
        state.layers[index] = state.layers[index + 1];
        state.layers[index + 1] = temp;
        renderLayersPanel();
        renderCanvas();
    }
}

function moveLayerDown(id) {
    const index = state.layers.findIndex(l => l.id === id);
    if (index > 0) {
        const temp = state.layers[index];
        state.layers[index] = state.layers[index - 1];
        state.layers[index - 1] = temp;
        renderLayersPanel();
        renderCanvas();
    }
}

function renderLayersPanel() {
    const list = elements.layersList;

    if (state.layers.length === 0) {
        list.innerHTML = '<div class="empty-layers"><p>Carga una imagen para comenzar</p></div>';
        return;
    }

    // Render from top to bottom (reverse order for display, but index 0 is bottom)
    list.innerHTML = state.layers.slice().reverse().map(layer => `
        <div class="layer-item ${layer.id === state.selectedLayerId ? 'selected' : ''}" data-layer-id="${layer.id}">
            <div class="layer-controls-left">
                <button class="layer-visibility ${layer.visible ? '' : 'hidden'}" data-visibility="${layer.id}">
                    ${layer.visible ? '👁️' : '👁️‍🗨️'}
                </button>
            </div>
            <div class="layer-preview">
                ${getLayerPreviewIcon(layer.type)}
            </div>
            <span class="layer-name">${layer.name}</span>
            <div class="layer-reorder">
                <button class="layer-move-btn up" data-move-up="${layer.id}" title="Subir">▲</button>
                <button class="layer-move-btn down" data-move-down="${layer.id}" title="Bajar">▼</button>
            </div>
        </div>
    `).join('');

    // Add event listeners
    list.querySelectorAll('.layer-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.layer-visibility') && !e.target.closest('.layer-move-btn')) {
                selectLayer(parseInt(item.dataset.layerId));
            }
        });
    });

    list.querySelectorAll('.layer-visibility').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleLayerVisibility(parseInt(btn.dataset.visibility));
        });
    });

    list.querySelectorAll('[data-move-up]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            moveLayerUp(parseInt(btn.dataset.moveUp));
        });
    });

    list.querySelectorAll('[data-move-down]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            moveLayerDown(parseInt(btn.dataset.moveDown));
        });
    });
}

function getLayerPreviewIcon(type) {
    switch (type) {
        case 'image': return '<span class="layer-preview-icon">🖼️</span>';
        case 'text': return '<span class="layer-preview-icon">📝</span>';
        case 'overlay': return '<span class="layer-preview-icon">🎴</span>';
        default: return '<span class="layer-preview-icon">📄</span>';
    }
}

// ============================================
// Canvas Rendering (Composite all layers)
// ============================================
function renderCanvas() {
    elements.canvas.width = state.canvasWidth;
    elements.canvas.height = state.canvasHeight;

    mainCtx.clearRect(0, 0, state.canvasWidth, state.canvasHeight);

    // Composite all visible layers
    state.layers.forEach(layer => {
        if (layer.visible && layer.width > 0 && layer.height > 0) {
            mainCtx.save();
            mainCtx.globalAlpha = layer.opacity;
            mainCtx.drawImage(layer.canvas, layer.x, layer.y);
            mainCtx.restore();
        }
    });

    updateImageInfo();
}



function resizeCanvas(width, height) {
    state.canvasWidth = width;
    state.canvasHeight = height;

    saveHistory(`Resolución ${width}×${height}`, '📐');
    renderCanvas();
    fitToScreen();
    showToast(`Resolución cambiada a ${width}×${height}`, 'success');
}

// ============================================
// History Management
// ============================================
function saveHistory(action, icon = '📝') {
    // Truncate future history if we're not at the end
    if (state.historyIndex < state.history.length - 1) {
        state.history = state.history.slice(0, state.historyIndex + 1);
    }

    // Create snapshot of all layers
    const snapshot = {
        action,
        icon,
        timestamp: new Date(),
        canvasWidth: state.canvasWidth,
        canvasHeight: state.canvasHeight,
        layers: state.layers.map(layer => ({
            id: layer.id,
            name: layer.name,
            type: layer.type,
            visible: layer.visible,
            opacity: layer.opacity,
            x: layer.x,
            y: layer.y,
            width: layer.width,
            height: layer.height,
            data: layer.data,
            imageData: layer.width > 0 ? layer.getImageData() : null
        })),
        selectedLayerId: state.selectedLayerId
    };

    state.history.push(snapshot);

    // Limit history size
    if (state.history.length > state.maxHistory) {
        state.history.shift();
    }

    state.historyIndex = state.history.length - 1;
    renderHistoryPanel();
}

function restoreHistory(index) {
    if (index < 0 || index >= state.history.length) return;

    const snapshot = state.history[index];

    // Restore canvas size
    state.canvasWidth = snapshot.canvasWidth;
    state.canvasHeight = snapshot.canvasHeight;

    // Restore layers
    state.layers = snapshot.layers.map(layerData => {
        const layer = new Layer(layerData.id, layerData.name, layerData.type, layerData.data);
        layer.visible = layerData.visible;
        layer.opacity = layerData.opacity;
        layer.x = layerData.x;
        layer.y = layerData.y;

        if (layerData.imageData) {
            layer.setSize(layerData.width, layerData.height);
            layer.putImageData(layerData.imageData);
        }

        return layer;
    });

    state.layerIdCounter = Math.max(...state.layers.map(l => l.id), state.layerIdCounter);

    // Truncate history (User Request: delete future steps immediately)
    state.history = state.history.slice(0, index + 1);
    state.historyIndex = index;

    renderLayersPanel();
    renderCanvas();
    renderHistoryPanel(); // Re-render to show shortened list
    showToast(`Restaurado: ${snapshot.action}`, 'success');
}

function clearHistory() {
    if (state.history.length <= 1) return;

    // Reset resolution to initial imported resolution if possible
    if (state.originalWidth && state.originalHeight) {
        state.canvasWidth = state.originalWidth;
        state.canvasHeight = state.originalHeight;
        elements.canvas.width = state.canvasWidth;
        elements.canvas.height = state.canvasHeight;
        renderCanvas();
    }

    // Keep only current state (snapshot with reset resolution)
    state.history = [];
    state.historyIndex = -1;
    saveHistory('Historial limpiado', '🧹');

    showToast('Historial y resolución reiniciados', 'success');
}

function renderHistoryPanel() {
    const list = elements.historyList;

    if (state.history.length === 0) {
        list.innerHTML = '<div class="empty-history"><p>Sin cambios aún</p></div>';
        return;
    }

    list.innerHTML = state.history.map((item, index) => {
        const time = item.timestamp.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
        const isCurrent = index === state.historyIndex;
        const isInactive = index > state.historyIndex;

        return `
            <div class="history-item ${isCurrent ? 'current' : ''} ${isInactive ? 'inactive' : ''}" data-history-index="${index}">
                <span class="history-index">${index + 1}</span>
                <span class="history-icon">${item.icon}</span>
                <span class="history-action">${item.action}</span>
                <span class="history-time">${time}</span>
            </div>
        `;
    }).join('');

    // Add click listeners
    list.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', () => {
            restoreHistory(parseInt(item.dataset.historyIndex));
        });
    });

    // Scroll to current
    const currentItem = list.querySelector('.history-item.current');
    if (currentItem) {
        currentItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// ============================================
// File Handling
// ============================================
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) loadImageFile(file);
}

function handleDragOver(e) {
    e.preventDefault();
    elements.dropZone.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    elements.dropZone.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    elements.dropZone.classList.remove('dragover');

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        loadImageFile(file);
    }
}

function loadImageFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            // If first image, set canvas size
            if (state.layers.length === 0) {
                state.canvasWidth = img.width;
                state.canvasHeight = img.height;
                state.originalWidth = img.width;
                state.originalHeight = img.height;
            }

            const layerName = `Imagen ${state.layers.length + 1}`;
            createLayer(layerName, 'image', img);

            // Show UI elements
            elements.canvasContainer.classList.add('has-image');
            elements.panelLayers.hidden = false;
            elements.downloadSection.hidden = false;

            fitToScreen();


            saveHistory('Cargar imagen', '🖼️');
            showToast('Imagen cargada como nueva capa', 'success');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// ============================================
// Interactive Events
// ============================================
function setupInteractiveEvents() {
    const container = elements.canvasContainer;

    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mouseleave', handleMouseUp);

    elements.cropBox.addEventListener('mousedown', handleCropBoxMouseDown);
    document.querySelectorAll('.crop-handle').forEach(handle => {
        handle.addEventListener('mousedown', handleCropHandleMouseDown);
    });

    elements.draggableText.addEventListener('mousedown', handleTextMouseDown);
    elements.draggableText.querySelector('.resize-handle').addEventListener('mousedown', handleTextResizeMouseDown);

    elements.draggableOverlay.addEventListener('mousedown', handleOverlayMouseDown);
    elements.draggableOverlay.querySelector('.resize-handle').addEventListener('mousedown', handleOverlayResizeMouseDown);
}

// ============================================
// Crop Mode (Per Layer)
// ============================================
function enterCropMode() {
    const layer = getSelectedLayer();
    if (!layer) return;

    state.editMode = 'crop';
    elements.canvasContainer.classList.add('edit-mode');
    elements.interactiveLayer.hidden = false;
    elements.interactiveLayer.classList.add('active');
    elements.editMode.hidden = false;
    elements.editMode.textContent = '✂️ Recortar Capa';

    // Get canvas position within container
    const containerRect = elements.canvasContainer.getBoundingClientRect();
    const canvasRect = elements.canvas.getBoundingClientRect();

    // Calculate offset of canvas within container
    state.crop.offsetX = canvasRect.left - containerRect.left;
    state.crop.offsetY = canvasRect.top - containerRect.top;

    const scaleX = canvasRect.width / state.canvasWidth;
    const scaleY = canvasRect.height / state.canvasHeight;

    // Initialize crop box centered on canvas (display coordinates)
    const boxWidth = Math.min(layer.width, state.canvasWidth) * scaleX * 0.6;
    const boxHeight = Math.min(layer.height, state.canvasHeight) * scaleY * 0.6;

    state.crop.x = state.crop.offsetX + (canvasRect.width - boxWidth) / 2;
    state.crop.y = state.crop.offsetY + (canvasRect.height - boxHeight) / 2;
    state.crop.width = boxWidth;
    state.crop.height = boxHeight;

    updateCropBox();
    elements.cropBox.hidden = false;

    showToast('Selecciona el área a recortar de la capa', 'success');
}

function updateCropBox() {
    const canvasRect = elements.canvas.getBoundingClientRect();

    // Percentage positioning to withstand zoom resize
    elements.cropBox.style.left = (state.crop.x / canvasRect.width * 100) + '%';
    elements.cropBox.style.top = (state.crop.y / canvasRect.height * 100) + '%';
    elements.cropBox.style.width = (state.crop.width / canvasRect.width * 100) + '%';
    elements.cropBox.style.height = (state.crop.height / canvasRect.height * 100) + '%';

    const scaleX = state.canvasWidth / canvasRect.width;
    const scaleY = state.canvasHeight / canvasRect.height;

    const realWidth = Math.round(state.crop.width * scaleX);
    const realHeight = Math.round(state.crop.height * scaleY);
    elements.cropDimensions.textContent = `${realWidth} × ${realHeight} px`;
}

function handleCropBoxMouseDown(e) {
    if (state.editMode !== 'crop' || e.target.classList.contains('crop-handle')) return;
    e.preventDefault();
    state.crop.dragging = true;
    state.crop.startX = e.clientX - state.crop.x;
    state.crop.startY = e.clientY - state.crop.y;
}

function handleCropHandleMouseDown(e) {
    if (state.editMode !== 'crop') return;
    e.preventDefault();
    e.stopPropagation();
    state.crop.resizing = true;
    state.crop.resizeHandle = e.target.dataset.handle;
    state.crop.startX = e.clientX;
    state.crop.startY = e.clientY;
}

function handleMouseDown(e) {
    if (state.editMode === 'move') {
        handleMoveMouseDown(e);
        return;
    }
    if (state.editMode === 'removeBg') {
        handleRemoveBgClick(e);
        return;
    }
    if (state.editMode !== 'crop') return;
    if (e.target !== elements.canvasContainer && e.target !== elements.interactiveLayer && e.target !== elements.canvas) return;

    const containerRect = elements.canvasContainer.getBoundingClientRect();
    const x = e.clientX - containerRect.left;
    const y = e.clientY - containerRect.top;

    state.crop.active = true;
    state.crop.x = x;
    state.crop.y = y;
    state.crop.width = 0;
    state.crop.height = 0;
    state.crop.startX = x;
    state.crop.startY = y;

    updateCropBox();
}

function handleMouseMove(e) {
    if (state.editMode === 'move') handleMoveMouseMove(e);
    else if (state.editMode === 'crop') handleCropMouseMove(e);
    else if (state.editMode === 'text') handleTextMouseMove(e);
    else if (state.editMode === 'overlay') handleOverlayMouseMove(e);
}

function handleCropMouseMove(e) {
    const containerRect = elements.canvasContainer.getBoundingClientRect();
    const canvasRect = elements.canvas.getBoundingClientRect();

    // Calculate canvas bounds within container
    const canvasLeft = canvasRect.left - containerRect.left;
    const canvasTop = canvasRect.top - containerRect.top;
    const canvasRight = canvasLeft + canvasRect.width;
    const canvasBottom = canvasTop + canvasRect.height;

    if (state.crop.active) {
        const x = e.clientX - containerRect.left;
        const y = e.clientY - containerRect.top;
        state.crop.width = Math.abs(x - state.crop.startX);
        state.crop.height = Math.abs(y - state.crop.startY);
        state.crop.x = Math.min(x, state.crop.startX);
        state.crop.y = Math.min(y, state.crop.startY);
        // Constrain to canvas area
        state.crop.x = Math.max(canvasLeft, state.crop.x);
        state.crop.y = Math.max(canvasTop, state.crop.y);
        state.crop.width = Math.min(state.crop.width, canvasRight - state.crop.x);
        state.crop.height = Math.min(state.crop.height, canvasBottom - state.crop.y);
        updateCropBox();
    } else if (state.crop.dragging) {
        let newX = e.clientX - state.crop.startX;
        let newY = e.clientY - state.crop.startY;
        // Constrain to canvas area
        newX = Math.max(canvasLeft, Math.min(newX, canvasRight - state.crop.width));
        newY = Math.max(canvasTop, Math.min(newY, canvasBottom - state.crop.height));
        state.crop.x = newX;
        state.crop.y = newY;
        updateCropBox();
    } else if (state.crop.resizing) {
        const dx = e.clientX - state.crop.startX;
        const dy = e.clientY - state.crop.startY;
        switch (state.crop.resizeHandle) {
            case 'se':
                state.crop.width = Math.max(50, state.crop.width + dx);
                state.crop.height = Math.max(50, state.crop.height + dy);
                break;
            case 'sw':
                state.crop.x += dx;
                state.crop.width = Math.max(50, state.crop.width - dx);
                state.crop.height = Math.max(50, state.crop.height + dy);
                break;
            case 'ne':
                state.crop.y += dy;
                state.crop.width = Math.max(50, state.crop.width + dx);
                state.crop.height = Math.max(50, state.crop.height - dy);
                break;
            case 'nw':
                state.crop.x += dx;
                state.crop.y += dy;
                state.crop.width = Math.max(50, state.crop.width - dx);
                state.crop.height = Math.max(50, state.crop.height - dy);
                break;
        }
        state.crop.startX = e.clientX;
        state.crop.startY = e.clientY;
        updateCropBox();
    }
}

function handleMouseUp() {
    if (state.editMode === 'move') {
        if (state.move.dragging || state.move.resizing) {
            state.move.dragging = false;
            state.move.resizing = false;
            state.move.layerSnapshot = null;
            clearSnapGuides();
            saveHistory(state.move.resizing ? 'Redimensionar capa' : 'Mover capa', '✋');
        }
    }
    state.crop.active = false;
    state.crop.dragging = false;
    state.crop.resizing = false;
    state.text.dragging = false;
    state.text.resizing = false;
    state.overlay.dragging = false;
    state.overlay.resizing = false;
}

function applyCrop() {
    // Single layer validation
    if (!state.cropAllMode) {
        const layer = getSelectedLayer();
        if (!layer || state.crop.width < 10 || state.crop.height < 10) {
            showToast('Selecciona un área válida', 'error');
            return;
        }
    } else {
        if (state.crop.width < 10 || state.crop.height < 10) {
            showToast('Selecciona un área válida', 'error');
            return;
        }
    }

    const containerRect = elements.canvasContainer.getBoundingClientRect();
    const canvasRect = elements.canvas.getBoundingClientRect();

    // Calculate canvas offset within container
    const canvasOffsetX = canvasRect.left - containerRect.left;
    const canvasOffsetY = canvasRect.top - containerRect.top;

    const scaleX = state.canvasWidth / canvasRect.width;
    const scaleY = state.canvasHeight / canvasRect.height;

    // Convert crop box position (container coords) to canvas coords
    const canvasCropX = (state.crop.x - canvasOffsetX) * scaleX;
    const canvasCropY = (state.crop.y - canvasOffsetY) * scaleY;
    const canvasCropWidth = state.crop.width * scaleX;
    const canvasCropHeight = state.crop.height * scaleY;

    if (state.cropAllMode) {
        // CROP ALL: Change canvas size and shift all layers

        // Update all layers position relative to new origin
        state.layers.forEach(l => {
            l.x = Math.round(l.x - canvasCropX);
            l.y = Math.round(l.y - canvasCropY);
        });

        // Resize Canvas
        resizeCanvas(Math.round(canvasCropWidth), Math.round(canvasCropHeight));
        saveHistory('Recortar todo', '🔲');
        showToast('Lienzo y capas recortados', 'success');

    } else {
        // CROP SINGLE LAYER
        const layer = getSelectedLayer();

        // Calculate crop coordinates relative to layer position
        const cropX = Math.round(canvasCropX - layer.x);
        const cropY = Math.round(canvasCropY - layer.y);
        const cropWidth = Math.round(canvasCropWidth);
        const cropHeight = Math.round(canvasCropHeight);

        // Clamp to layer bounds
        const finalX = Math.max(0, cropX);
        const finalY = Math.max(0, cropY);
        const finalWidth = Math.min(cropWidth, layer.width - finalX);
        const finalHeight = Math.min(cropHeight, layer.height - finalY);

        if (finalWidth <= 0 || finalHeight <= 0) {
            showToast('El área seleccionada está fuera de la capa', 'error');
            return;
        }

        // Crop the layer and update its position
        layer.crop(finalX, finalY, finalWidth, finalHeight);
        layer.x = Math.round(canvasCropX);
        layer.y = Math.round(canvasCropY);

        saveHistory('Recortar capa', '✂️');
        showToast('Capa recortada', 'success');
    }

    renderCanvas();
    exitEditMode();
    showPanel('panelEditor');
}

// ============================================
// Text Mode
// ============================================
function setupTextControls() {
    const textContent = document.getElementById('textContent');
    const textSize = document.getElementById('textSize');
    const textColor = document.getElementById('textColor');
    const textFont = document.getElementById('textFont');
    const textBold = document.getElementById('textBold');
    const textShadow = document.getElementById('textShadow');

    textContent.addEventListener('input', () => { state.text.content = textContent.value || 'Tu Texto'; updateTextPreview(); });
    textSize.addEventListener('input', () => { state.text.size = parseInt(textSize.value); document.getElementById('textSizeValue').textContent = textSize.value; updateTextPreview(); });
    textColor.addEventListener('input', () => { state.text.color = textColor.value; updateTextPreview(); });
    textFont.addEventListener('change', () => { state.text.font = textFont.value; updateTextPreview(); });
    textBold.addEventListener('change', () => { state.text.bold = textBold.checked; updateTextPreview(); });
    textShadow.addEventListener('change', () => { state.text.shadow = textShadow.checked; updateTextPreview(); });
}

function enterTextMode() {
    if (state.layers.length === 0) {
        showToast('Primero carga una imagen', 'error');
        return;
    }

    state.editMode = 'text';
    elements.canvasContainer.classList.add('edit-mode');
    elements.interactiveLayer.hidden = false;
    elements.interactiveLayer.classList.add('active');
    elements.editMode.hidden = false;
    elements.editMode.textContent = '📝 Agregar Texto';

    const canvasRect = elements.canvas.getBoundingClientRect();
    state.text.x = canvasRect.width / 2 - 50;
    state.text.y = canvasRect.height / 2 - 20;

    updateTextPreview();
    elements.draggableText.hidden = false;
}

function updateTextPreview() {
    elements.textPreview.textContent = state.text.content;
    elements.textPreview.style.fontSize = state.text.size + 'px';
    elements.textPreview.style.color = state.text.color;
    elements.textPreview.style.fontFamily = state.text.font;
    elements.textPreview.style.fontWeight = state.text.bold ? 'bold' : 'normal';
    elements.textPreview.style.textShadow = state.text.shadow ? '3px 3px 6px rgba(0,0,0,0.7)' : '2px 2px 4px rgba(0,0,0,0.5)';

    const canvasRect = elements.canvas.getBoundingClientRect();
    elements.draggableText.style.left = (state.text.x / canvasRect.width * 100) + '%';
    elements.draggableText.style.top = (state.text.y / canvasRect.height * 100) + '%';
}

function handleTextMouseDown(e) {
    if (state.editMode !== 'text' || e.target.classList.contains('resize-handle')) return;
    e.preventDefault();
    state.text.dragging = true;
    state.text.startX = e.clientX - state.text.x;
    state.text.startY = e.clientY - state.text.y;
}

function handleTextResizeMouseDown(e) {
    if (state.editMode !== 'text') return;
    e.preventDefault();
    e.stopPropagation();
    state.text.resizing = true;
    state.text.startX = e.clientX;
    state.text.startSize = state.text.size;
}

function handleTextMouseMove(e) {
    const canvasRect = elements.canvas.getBoundingClientRect();
    if (state.text.dragging) {
        state.text.x = Math.max(0, Math.min(e.clientX - state.text.startX, canvasRect.width - 100));
        state.text.y = Math.max(0, Math.min(e.clientY - state.text.startY, canvasRect.height - 50));
        updateTextPreview();
    } else if (state.text.resizing) {
        const dx = e.clientX - state.text.startX;
        state.text.size = Math.max(12, Math.min(200, state.text.startSize + dx / 2));
        document.getElementById('textSize').value = state.text.size;
        document.getElementById('textSizeValue').textContent = Math.round(state.text.size);
        updateTextPreview();
    }
}

function applyText() {
    if (!state.text.content) return;

    const canvasRect = elements.canvas.getBoundingClientRect();
    const scaleX = state.canvasWidth / canvasRect.width;
    const scaleY = state.canvasHeight / canvasRect.height;

    const x = Math.round(state.text.x * scaleX);
    const y = Math.round(state.text.y * scaleY);
    const size = Math.round(state.text.size * scaleX);

    // Create text layer
    const layer = new Layer(++state.layerIdCounter, `Texto: ${state.text.content.substring(0, 10)}`, 'text');
    layer.data = { ...state.text };

    // Measure text
    const tempCtx = document.createElement('canvas').getContext('2d');
    const fontWeight = state.text.bold ? 'bold' : 'normal';
    tempCtx.font = `${fontWeight} ${size}px ${state.text.font}`;
    const metrics = tempCtx.measureText(state.text.content);
    const textWidth = Math.ceil(metrics.width) + 20;
    const textHeight = size + 20;

    layer.setSize(textWidth, textHeight);
    layer.x = x;
    layer.y = y;

    layer.ctx.font = `${fontWeight} ${size}px ${state.text.font}`;
    layer.ctx.fillStyle = state.text.color;
    layer.ctx.textBaseline = 'top';

    if (state.text.shadow) {
        layer.ctx.shadowColor = 'rgba(0,0,0,0.7)';
        layer.ctx.shadowBlur = 6;
        layer.ctx.shadowOffsetX = 3;
        layer.ctx.shadowOffsetY = 3;
    }

    layer.ctx.fillText(state.text.content, 10, 10);

    state.layers.push(layer);
    state.selectedLayerId = layer.id;

    saveHistory('Agregar texto', '📝');
    renderLayersPanel();
    renderCanvas();
    exitEditMode();
    showPanel('panelEditor');
    showToast('Capa de texto creada', 'success');
}

// ============================================
// Overlay Mode
// ============================================
function setupOverlayControls() {
    const overlayInput = document.getElementById('overlayInput');
    const overlayDropZone = document.getElementById('overlayDropZone');
    const overlayOpacity = document.getElementById('overlayOpacity');

    overlayDropZone.addEventListener('click', () => overlayInput.click());

    overlayInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    state.overlay.image = img;
                    const maxWidth = elements.canvas.offsetWidth * 0.3;
                    const scale = Math.min(1, maxWidth / img.width);
                    state.overlay.width = img.width * scale;
                    state.overlay.height = img.height * scale;

                    overlayDropZone.classList.add('has-file');
                    overlayDropZone.querySelector('span').textContent = '✓ ' + file.name;
                    document.getElementById('applyOverlay').disabled = false;
                    document.getElementById('overlayInstructions').hidden = false;

                    enterOverlayMode();
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    overlayOpacity.addEventListener('input', () => {
        document.getElementById('opacityValue').textContent = overlayOpacity.value;
        state.overlay.opacity = parseInt(overlayOpacity.value) / 100;
        updateOverlayPreview();
    });
}

function enterOverlayMode() {
    if (state.layers.length === 0) return;

    state.editMode = 'overlay';
    elements.canvasContainer.classList.add('edit-mode');
    elements.interactiveLayer.hidden = false;
    elements.interactiveLayer.classList.add('active');
    elements.editMode.hidden = false;
    elements.editMode.textContent = '🎴 Insertar Imagen';

    const canvasRect = elements.canvas.getBoundingClientRect();
    state.overlay.x = (canvasRect.width - state.overlay.width) / 2;
    state.overlay.y = (canvasRect.height - state.overlay.height) / 2;

    updateOverlayPreview();
    elements.draggableOverlay.hidden = false;
}

function updateOverlayPreview() {
    if (!state.overlay.image) return;
    elements.overlayPreview.src = state.overlay.image.src;
    const canvasRect = elements.canvas.getBoundingClientRect();
    elements.draggableOverlay.style.left = (state.overlay.x / canvasRect.width * 100) + '%';
    elements.draggableOverlay.style.top = (state.overlay.y / canvasRect.height * 100) + '%';
    // Overlay width/height is in Screen Pixels in state?
    // Let's check handleOverlayMouseMove.
    // Line 1337: width = startWidth + dx. (Screen).
    // So yes.
    elements.overlayPreview.style.width = '100%';
    elements.overlayPreview.style.height = '100%';

    elements.draggableOverlay.style.width = (state.overlay.width / canvasRect.width * 100) + '%';
    elements.draggableOverlay.style.height = (state.overlay.height / canvasRect.height * 100) + '%';
}

function handleOverlayMouseDown(e) {
    if (state.editMode !== 'overlay' || e.target.classList.contains('resize-handle')) return;
    e.preventDefault();
    state.overlay.dragging = true;
    state.overlay.startX = e.clientX - state.overlay.x;
    state.overlay.startY = e.clientY - state.overlay.y;
}

function handleOverlayResizeMouseDown(e) {
    if (state.editMode !== 'overlay') return;
    e.preventDefault();
    e.stopPropagation();
    state.overlay.resizing = true;
    state.overlay.startX = e.clientX;
    state.overlay.startWidth = state.overlay.width;
}

function handleOverlayMouseMove(e) {
    const canvasRect = elements.canvas.getBoundingClientRect();
    if (state.overlay.dragging) {
        state.overlay.x = Math.max(0, Math.min(e.clientX - state.overlay.startX, canvasRect.width - state.overlay.width));
        state.overlay.y = Math.max(0, Math.min(e.clientY - state.overlay.startY, canvasRect.height - state.overlay.height));
        updateOverlayPreview();
    } else if (state.overlay.resizing) {
        const dx = e.clientX - state.overlay.startX;
        const aspectRatio = state.overlay.image.height / state.overlay.image.width;
        state.overlay.width = Math.max(50, state.overlay.startWidth + dx);
        state.overlay.height = state.overlay.width * aspectRatio;
        updateOverlayPreview();
    }
}

function applyOverlay() {
    if (!state.overlay.image) return;

    const canvasRect = elements.canvas.getBoundingClientRect();
    const scaleX = state.canvasWidth / canvasRect.width;
    const scaleY = state.canvasHeight / canvasRect.height;

    const x = Math.round(state.overlay.x * scaleX);
    const y = Math.round(state.overlay.y * scaleY);
    const width = Math.round(state.overlay.width * scaleX);
    const height = Math.round(state.overlay.height * scaleY);

    const layer = new Layer(++state.layerIdCounter, `Overlay ${state.layers.length}`, 'overlay');
    layer.setSize(width, height);
    layer.x = x;
    layer.y = y;
    layer.opacity = state.overlay.opacity;
    layer.ctx.drawImage(state.overlay.image, 0, 0, width, height);

    state.layers.push(layer);
    state.selectedLayerId = layer.id;

    // Reset
    state.overlay.image = null;
    document.getElementById('overlayDropZone').classList.remove('has-file');
    document.getElementById('overlayDropZone').querySelector('span').textContent = '📁 Seleccionar imagen';
    document.getElementById('applyOverlay').disabled = true;
    document.getElementById('overlayInstructions').hidden = true;

    saveHistory('Insertar imagen', '🎴');
    renderLayersPanel();
    renderCanvas();
    exitEditMode();
    showPanel('panelEditor');
    showToast('Capa de imagen creada', 'success');
}

// ============================================
// Rotate & Flip (Per Layer)
// ============================================
function rotateSelectedLayer(angle) {
    const layer = getSelectedLayer();
    if (!layer) return;

    const radians = (angle * Math.PI) / 180;
    const sin = Math.abs(Math.sin(radians));
    const cos = Math.abs(Math.cos(radians));

    const oldWidth = layer.width;
    const oldHeight = layer.height;
    const newWidth = Math.floor(oldWidth * cos + oldHeight * sin);
    const newHeight = Math.floor(oldHeight * cos + oldWidth * sin);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = oldWidth;
    tempCanvas.height = oldHeight;
    tempCanvas.getContext('2d').drawImage(layer.canvas, 0, 0);

    layer.setSize(newWidth, newHeight);
    layer.ctx.save();
    layer.ctx.translate(newWidth / 2, newHeight / 2);
    layer.ctx.rotate(radians);
    layer.ctx.drawImage(tempCanvas, -oldWidth / 2, -oldHeight / 2);
    layer.ctx.restore();

    saveHistory(`Rotar ${angle}°`, '🔄');
    renderCanvas();
    showToast(`Capa rotada ${angle}°`, 'success');
}

function flipSelectedLayer(direction) {
    const layer = getSelectedLayer();
    if (!layer) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = layer.width;
    tempCanvas.height = layer.height;
    tempCanvas.getContext('2d').drawImage(layer.canvas, 0, 0);

    layer.clear();
    layer.ctx.save();

    if (direction === 'horizontal') {
        layer.ctx.scale(-1, 1);
        layer.ctx.drawImage(tempCanvas, -layer.width, 0);
    } else {
        layer.ctx.scale(1, -1);
        layer.ctx.drawImage(tempCanvas, 0, -layer.height);
    }

    layer.ctx.restore();

    saveHistory(`Voltear ${direction}`, '↔️');
    renderCanvas();
    showToast(`Capa volteada`, 'success');
}

// ============================================
// Resolution (Canvas size, not layers)
// ============================================
function handlePresetResolution(preset) {
    switch (preset) {
        case 'square': resizeCanvas(450, 450); break;
        case 'banner': resizeCanvas(1600, 500); break;
        case '9:16': resizeCanvas(1080, 1920); break;
    }
}

// ============================================
// Exit Edit Mode
// ============================================
function exitEditMode() {
    state.editMode = null;
    elements.canvasContainer.classList.remove('edit-mode', 'move-mode', 'removebg-mode');
    elements.interactiveLayer.hidden = true;
    elements.interactiveLayer.classList.remove('active');
    elements.editMode.hidden = true;
    elements.cropBox.hidden = true;
    elements.draggableText.hidden = true;
    elements.draggableOverlay.hidden = true;
}

// ============================================
// Download
// ============================================
function downloadImage() {
    if (state.layers.length === 0) return;

    const quality = 1.0;
    const mimeType = `image/${state.selectedFormat}`;

    elements.canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `output/imagen_${Date.now()}.${state.selectedFormat === 'jpeg' ? 'jpg' : state.selectedFormat}`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('✅ Imagen guardada', 'success');
    }, mimeType, quality);
}

// ============================================
// UI Helpers
// ============================================
function showPanel(panelId) {
    hideToolPanels();
    const panel = document.getElementById(panelId);
    if (panel) panel.hidden = false;

    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    const menuMap = {
        'panelPresetRes': 'btnPresetRes',
        'panelManualRes': 'btnManualRes',
        'panelConvert': 'btnConvert',
        'panelEditor': 'btnEditor',
        'panelCrop': 'btnEditor',
        'panelText': 'btnEditor',
        'panelOverlay': 'btnEditor',
        'panelRotate': 'btnEditor',
        'panelFlip': 'btnEditor'
    };
    if (menuMap[panelId]) document.getElementById(menuMap[panelId]).classList.add('active');
}

function hideToolPanels() {
    ['panelPresetRes', 'panelManualRes', 'panelConvert', 'panelEditor', 'panelCrop', 'panelText', 'panelOverlay', 'panelRotate', 'panelFlip'].forEach(id => {
        const p = document.getElementById(id);
        if (p) p.hidden = true;
    });
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
}

function updateImageInfo() {
    elements.imageSize.textContent = `${state.canvasWidth} × ${state.canvasHeight} px`;
    elements.imageFormat.textContent = state.selectedFormat.toUpperCase();
}

function resetEditor() {
    state.layers = [];
    state.selectedLayerId = null;
    state.history = [];
    state.historyIndex = -1;
    state.canvasWidth = 800;
    state.canvasHeight = 600;

    mainCtx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
    elements.canvas.width = 800;
    elements.canvas.height = 600;

    elements.canvasContainer.classList.remove('has-image');
    state.zoom = 1.0;
    state.zoomMode = 'fit';
    elements.zoomValue.textContent = 'Fit';
    elements.panelLayers.hidden = true;
    elements.downloadSection.hidden = true;
    elements.fileInput.value = '';

    renderLayersPanel();
    renderHistoryPanel();
    exitEditMode();
    hideToolPanels();

    showToast('Editor reiniciado', 'success');
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : '⚠';
    toast.innerHTML = `<span>${icon}</span> ${message}`;
    elements.toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function handleKeyboard(e) {
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (state.historyIndex > 0) restoreHistory(state.historyIndex - 1);
    }
    if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        if (state.historyIndex < state.history.length - 1) restoreHistory(state.historyIndex + 1);
    }
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        downloadImage();
    }
    if (e.key === 'Escape') {
        exitEditMode();
        hideToolPanels();
    }
}

// ============================================
// Move Mode
// ============================================
// ============================================
// View Options & Helpers
// ============================================
function toggleGrid() {
    state.view.grid = !state.view.grid;
    elements.gridOverlay.hidden = !state.view.grid;
    elements.iconGrid.textContent = state.view.grid ? '✅' : '⬜';
    elements.btnToggleGrid.classList.toggle('active', state.view.grid);
}

function toggleSnap() {
    state.view.snap = !state.view.snap;
    elements.iconSnap.textContent = state.view.snap ? '✅' : '⬜';
    elements.btnToggleSnap.classList.toggle('active', state.view.snap);
}

function toggleDeform() {
    state.view.deform = !state.view.deform;
    elements.iconDeform.textContent = state.view.deform ? 'ON' : 'OFF';
    elements.btnToggleDeform.querySelector('.menu-number').textContent = state.view.deform ? '🔓' : '🔒';
    elements.btnToggleDeform.classList.toggle('active', state.view.deform);
    showToast(state.view.deform ? 'Deformación activada (Libre)' : 'Deformación desactivada (Bloqueada)', 'info');
}

function updateMoveBox() {
    const layer = getSelectedLayer();
    if (!layer || state.editMode !== 'move') {
        elements.moveBox.hidden = true;
        return;
    }

    // Use internal coordinates converted to percentages
    // This assumes interactiveLayer matches Zoomed Canvas size perfectly.

    const leftP = (layer.x / state.canvasWidth * 100);
    const topP = (layer.y / state.canvasHeight * 100);
    const widthP = (layer.width / state.canvasWidth * 100);
    const heightP = (layer.height / state.canvasHeight * 100);

    elements.moveBox.style.left = `${leftP}%`;
    elements.moveBox.style.top = `${topP}%`;
    elements.moveBox.style.width = `${widthP}%`;
    elements.moveBox.style.height = `${heightP}%`;
    elements.moveBox.hidden = false;
}

function calculateSnap(x, y, w, h) {
    const threshold = 15;
    const guides = [];

    const targetsX = [
        { val: 0, type: 'edge' },
        { val: state.canvasWidth / 2, type: 'center' },
        { val: state.canvasWidth, type: 'edge' }
    ];
    const targetsY = [
        { val: 0, type: 'edge' },
        { val: state.canvasHeight / 2, type: 'center' },
        { val: state.canvasHeight, type: 'edge' }
    ];

    state.layers.forEach(l => {
        if (l.id === state.selectedLayerId || !l.visible) return;
        targetsX.push({ val: l.x + l.width / 2, type: 'layer' });
        targetsY.push({ val: l.y + l.height / 2, type: 'layer' });
    });

    const centerX = x + w / 2;
    let newX = x;

    for (const t of targetsX) {
        if (Math.abs(centerX - t.val) < threshold) {
            newX = t.val - w / 2;
            guides.push({ type: 'vertical', pos: t.val });
            break;
        }
    }

    const centerY = y + h / 2;
    let newY = y;

    for (const t of targetsY) {
        if (Math.abs(centerY - t.val) < threshold) {
            newY = t.val - h / 2;
            guides.push({ type: 'horizontal', pos: t.val });
            break;
        }
    }

    return { x: newX, y: newY, guides };
}

function drawSnapGuides(guides) {
    const container = elements.interactiveLayer;
    const canvasRect = elements.canvas.getBoundingClientRect();
    const containerRect = elements.canvasContainer.getBoundingClientRect();

    const scaleX = canvasRect.width / state.canvasWidth;
    const scaleY = canvasRect.height / state.canvasHeight;
    const canvasLeft = canvasRect.left - containerRect.left;
    const canvasTop = canvasRect.top - containerRect.top;

    guides.forEach(g => {
        const div = document.createElement('div');
        div.className = `snap-guide ${g.type}`;

        if (g.type === 'vertical') {
            const left = canvasLeft + (g.pos * scaleX);
            div.style.left = `${left}px`;
        } else {
            const top = canvasTop + (g.pos * scaleY);
            div.style.top = `${top}px`;
        }
        container.appendChild(div);
    });
}

function clearSnapGuides() {
    elements.interactiveLayer.querySelectorAll('.snap-guide').forEach(g => g.remove());
}

// ============================================
// Move Mode
// ============================================
function enterMoveMode() {
    state.editMode = 'move';
    elements.canvasContainer.classList.add('edit-mode', 'move-mode');

    elements.interactiveLayer.hidden = false;
    elements.interactiveLayer.classList.add('active');

    updateMoveBox();

    elements.editMode.hidden = false;
    elements.editMode.textContent = '✋ Mover Capa';
    showToast('Arrastra para mover, usa esquinas para redimensionar', 'info');
}

function handleMoveMouseDown(e) {
    // Check handles first
    if (e.target.classList.contains('move-handle')) {
        e.preventDefault();
        e.stopPropagation();
        const layer = getSelectedLayer();
        if (!layer) return;

        state.move.resizing = true;
        state.move.resizeHandle = e.target.dataset.handle;

        // Snapshot for non-destructive resize
        state.move.layerSnapshot = document.createElement('canvas');
        state.move.layerSnapshot.width = layer.width;
        state.move.layerSnapshot.height = layer.height;
        state.move.layerSnapshot.getContext('2d').drawImage(layer.canvas, 0, 0);

        state.move.startX = e.clientX;
        state.move.startY = e.clientY;
        state.move.layerStartX = layer.x;
        state.move.layerStartY = layer.y;
        state.move.startWidth = layer.width;
        state.move.startHeight = layer.height;
        return;
    }

    if (e.target !== elements.canvas && e.target !== elements.interactiveLayer && !elements.moveBox.contains(e.target)) return;
    const layer = getSelectedLayer();
    if (!layer) return;

    e.preventDefault();
    state.move.dragging = true;
    state.move.startX = e.clientX;
    state.move.startY = e.clientY;
    state.move.layerStartX = layer.x;
    state.move.layerStartY = layer.y;
}

function handleMoveMouseMove(e) {
    const layer = getSelectedLayer();
    if (!layer) return;

    // Resizing
    if (state.move.resizing) {
        const dx = e.clientX - state.move.startX;
        const dy = e.clientY - state.move.startY;

        const canvasRect = elements.canvas.getBoundingClientRect();
        const scaleX = state.canvasWidth / canvasRect.width;
        const scaleY = state.canvasHeight / canvasRect.height;

        const handle = state.move.resizeHandle;
        let newW = state.move.startWidth;
        let newH = state.move.startHeight;
        let newX = state.move.layerStartX;
        let newY = state.move.layerStartY;

        if (handle.includes('e')) newW += dx * scaleX;
        if (handle.includes('s')) newH += dy * scaleY;
        if (handle.includes('w')) {
            newW -= dx * scaleX;
            newX += dx * scaleX;
        }
        if (handle.includes('n')) {
            newH -= dy * scaleY;
            newY += dy * scaleY;
        }

        // Aspect Ratio Constraint
        if (!state.view.deform) {
            const ratio = state.move.startWidth / state.move.startHeight;
            const absDx = Math.abs(dx * scaleX);
            const absDy = Math.abs(dy * scaleY);

            if (absDx > absDy) {
                // Drive height by width
                newH = newW / ratio;
                if (handle.includes('n')) {
                    newY = (state.move.layerStartY + state.move.startHeight) - newH;
                }
            } else {
                // Drive width by height
                newW = newH * ratio;
                if (handle.includes('w')) {
                    newX = (state.move.layerStartX + state.move.startWidth) - newW;
                }
            }
        }

        if (newW < 10) newW = 10;
        if (newH < 10) newH = 10;

        layer.setSize(Math.round(newW), Math.round(newH));

        if (state.move.layerSnapshot) {
            layer.ctx.drawImage(state.move.layerSnapshot, 0, 0, Math.round(newW), Math.round(newH));
        }

        layer.x = Math.round(newX);
        layer.y = Math.round(newY);

        renderCanvas();
        updateMoveBox();
        return;
    }

    if (!state.move.dragging) return;

    const dx = e.clientX - state.move.startX;
    const dy = e.clientY - state.move.startY;

    const canvasRect = elements.canvas.getBoundingClientRect();
    const scaleX = state.canvasWidth / canvasRect.width;
    const scaleY = state.canvasHeight / canvasRect.height;

    let nextX = Math.round(state.move.layerStartX + dx * scaleX);
    let nextY = Math.round(state.move.layerStartY + dy * scaleY);

    clearSnapGuides();
    if (state.view.snap) {
        const snap = calculateSnap(nextX, nextY, layer.width, layer.height);
        nextX = snap.x;
        nextY = snap.y;
        if (snap.guides.length > 0) drawSnapGuides(snap.guides);
    }

    layer.x = nextX;
    layer.y = nextY;

    renderCanvas();
    updateMoveBox();
}

// ============================================
// Remove Background Mode
// ============================================


function enterCropModeV2(cropAll = false) {
    state.cropAllMode = cropAll;

    if (!cropAll) {
        const layer = getSelectedLayer();
        if (!layer) return;
    }

    state.editMode = 'crop';
    elements.canvasContainer.classList.add('edit-mode');
    elements.interactiveLayer.hidden = false;
    elements.interactiveLayer.classList.add('active');
    elements.editMode.hidden = false;
    elements.editMode.textContent = cropAll ? '🔲 Recortar Todo' : '✂️ Recortar Capa';

    // Get canvas position within container
    const containerRect = elements.canvasContainer.getBoundingClientRect();
    const canvasRect = elements.canvas.getBoundingClientRect();

    // Calculate offset of canvas within container
    state.crop.offsetX = canvasRect.left - containerRect.left;
    state.crop.offsetY = canvasRect.top - containerRect.top;

    const scaleX = canvasRect.width / state.canvasWidth;
    const scaleY = canvasRect.height / state.canvasHeight;

    let boxWidth, boxHeight;

    if (cropAll) {
        // Init full size crop box slightly smaller than canvas
        boxWidth = state.canvasWidth * scaleX * 0.9;
        boxHeight = state.canvasHeight * scaleY * 0.9;
    } else {
        const layer = getSelectedLayer();
        // Initialize crop box centered on canvas (display coordinates)
        boxWidth = Math.min(layer.width, state.canvasWidth) * scaleX * 0.6;
        boxHeight = Math.min(layer.height, state.canvasHeight) * scaleY * 0.6;
    }

    state.crop.x = state.crop.offsetX + (canvasRect.width - boxWidth) / 2;
    state.crop.y = state.crop.offsetY + (canvasRect.height - boxHeight) / 2;
    state.crop.width = boxWidth;
    state.crop.height = boxHeight;

    updateCropBox();
    elements.cropBox.hidden = false;

    showToast(cropAll ? 'Recorta el lienzo completo' : 'Selecciona el área a recortar de la capa', 'success');
}

function cycleFormat() {
    if (!state.format) return;

    const formats = ['image/png', 'image/jpeg', 'image/webp'];
    const extensions = ['PNG', 'JPG', 'WEBP'];

    let currentIndex = formats.indexOf(state.format);
    if (currentIndex === -1) currentIndex = 0;

    let nextIndex = (currentIndex + 1) % formats.length;

    state.format = formats[nextIndex];
    elements.imageFormat.textContent = extensions[nextIndex];

    showToast(`Formato de salida cambiado a ${extensions[nextIndex]}`, 'success');
}

// Initialize
document.addEventListener('DOMContentLoaded', init);

function cycleFormatV2() {
    const formats = ['png', 'jpeg', 'webp'];
    const extensions = ['PNG', 'JPG', 'WEBP'];

    let current = state.selectedFormat || 'png';
    if (current === 'jpg') current = 'jpeg';

    let currentIndex = formats.indexOf(current);
    if (currentIndex === -1) currentIndex = 0;

    let nextIndex = (currentIndex + 1) % formats.length;

    state.selectedFormat = formats[nextIndex];
    elements.imageFormat.textContent = extensions[nextIndex];

    showToast(`Formato de salida cambiado a ${extensions[nextIndex]}`, 'success');
}

// ============================================
// Responsive Canvas (No Zoom - Auto Fit)
// ============================================
function setupZoomEvents() {
    // No zoom controls - canvas is responsive via CSS
    // Just handle window resize to update interactive elements
    window.addEventListener('resize', () => {
        if (state.editMode) {
            // Refresh interactive elements position on resize
            renderCanvas();
        }
    });

    // Prevent accidental close
    window.addEventListener('beforeunload', (e) => {
        if (state.layers && state.layers.length > 0) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
}

// These functions are kept for compatibility but simplified
function fitToScreen() {
    // No-op: CSS handles responsive sizing
}

function applyZoom() {
    // No-op: CSS handles responsive sizing  
}


