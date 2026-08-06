/**
 * CanvasEngine.js - Motor de Renderizado Multicapa con Undo/Redo, Eraser, Opacidad, Grid y Export PNG.
 */
export class CanvasEngine {
  constructor(containerElement) {
    this.container = containerElement;

    // Capa de Grid (fondo referencia)
    this.gridCanvas = document.createElement('canvas');
    this.gridCtx = this.gridCanvas.getContext('2d');

    // Capa Estática (Background Canvas para elementos guardados)
    this.staticCanvas = document.createElement('canvas');
    this.staticCtx = this.staticCanvas.getContext('2d');

    // Capa Dinámica (Interactive Canvas para trazo activo a 60 FPS)
    this.dynamicCanvas = document.createElement('canvas');
    this.dynamicCtx = this.dynamicCanvas.getContext('2d');

    // Capa del Cursor (Ring de tamaño del pincel)
    this.cursorCanvas = document.createElement('canvas');
    this.cursorCtx = this.cursorCanvas.getContext('2d');

    this.setupCanvasStyles();
    this.container.appendChild(this.gridCanvas);
    this.container.appendChild(this.staticCanvas);
    this.container.appendChild(this.dynamicCanvas);
    this.container.appendChild(this.cursorCanvas);

    this.panX = 0;
    this.panY = 0;
    this.scale = 1.0;
    this.dpr = window.devicePixelRatio || 1;

    this.elements = [];
    this.activeStroke = null;

    // Undo / Redo stacks (snapshot de elementos por operación)
    this.historyStack = [[]];
    this.historyIndex = 0;

    // Grid visible
    this.showGrid = true;

    // Cursor del pincel
    this.cursorX = -1000;
    this.cursorY = -1000;
    this.brushRadius = 4;
    this.showCursor = true;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  setupCanvasStyles() {
    const layers = [this.gridCanvas, this.staticCanvas, this.dynamicCanvas, this.cursorCanvas];
    layers.forEach((canvas, i) => {
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.touchAction = 'none';
      canvas.style.zIndex = String(i + 1);
    });
    // El cursor es la capa superior y no intercepta eventos
    this.cursorCanvas.style.pointerEvents = 'none';
    this.cursorCanvas.style.zIndex = '20';
  }

  resize() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.dpr = window.devicePixelRatio || 1;

    [this.gridCanvas, this.staticCanvas, this.dynamicCanvas, this.cursorCanvas].forEach((canvas) => {
      canvas.width = width * this.dpr;
      canvas.height = height * this.dpr;
    });

    this.renderAll();
  }

  setCamera(panX, panY, scale) {
    this.panX = panX;
    this.panY = panY;
    this.scale = scale;
    this.renderAll();
  }

  setElements(elements) {
    this.elements = elements || [];
    this.renderStaticLayer();
  }

  addElement(element) {
    if (!element) return;
    const existingIndex = this.elements.findIndex(el => el.id === element.id);
    if (existingIndex >= 0) {
      this.elements[existingIndex] = element;
    } else {
      this.elements.push(element);
    }
    // Guardar snapshot en historial
    this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);
    this.historyStack.push(this.elements.map(el => ({ ...el })));
    this.historyIndex = this.historyStack.length - 1;

    this.renderStaticLayer();
  }

  undo() {
    if (this.historyIndex <= 0) return;
    this.historyIndex--;
    this.elements = (this.historyStack[this.historyIndex] || []).map(el => ({ ...el }));
    this.renderStaticLayer();
    return this.elements;
  }

  redo() {
    if (this.historyIndex >= this.historyStack.length - 1) return;
    this.historyIndex++;
    this.elements = (this.historyStack[this.historyIndex] || []).map(el => ({ ...el }));
    this.renderStaticLayer();
    return this.elements;
  }

  canUndo() { return this.historyIndex > 0; }
  canRedo() { return this.historyIndex < this.historyStack.length - 1; }

  setActiveStroke(stroke) {
    this.activeStroke = stroke;
    this.renderDynamicLayer();
  }

  updateCursor(screenX, screenY, brushRadius, visible = true) {
    this.cursorX = screenX;
    this.cursorY = screenY;
    this.brushRadius = brushRadius;
    this.showCursor = visible;
    this.renderCursorLayer();
  }

  toggleGrid() {
    this.showGrid = !this.showGrid;
    this.renderGridLayer();
  }

  renderAll() {
    this.renderGridLayer();
    this.renderStaticLayer();
    this.renderDynamicLayer();
    this.renderCursorLayer();
  }

  renderGridLayer() {
    const ctx = this.gridCtx;
    const w = this.gridCanvas.width;
    const h = this.gridCanvas.height;
    ctx.clearRect(0, 0, w, h);

    if (!this.showGrid) return;

    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    const gridSize = 40; // px en espacio mundo
    const dotRadius = 0.8;
    ctx.fillStyle = 'rgba(255,255,255,0.07)';

    // Solo dibujar puntos que son visibles
    const startX = Math.floor(-this.panX / this.scale / gridSize) * gridSize;
    const startY = Math.floor(-this.panY / this.scale / gridSize) * gridSize;
    const endX = startX + (w / this.dpr / this.scale) + gridSize * 2;
    const endY = startY + (h / this.dpr / this.scale) + gridSize * 2;

    for (let wx = startX; wx < endX; wx += gridSize) {
      for (let wy = startY; wy < endY; wy += gridSize) {
        const sx = wx * this.scale + this.panX;
        const sy = wy * this.scale + this.panY;
        ctx.beginPath();
        ctx.arc(sx, sy, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  renderStaticLayer() {
    const ctx = this.staticCtx;
    ctx.save();
    ctx.clearRect(0, 0, this.staticCanvas.width, this.staticCanvas.height);
    ctx.scale(this.dpr, this.dpr);
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.scale, this.scale);

    for (const el of this.elements) {
      this.drawElement(ctx, el);
    }

    ctx.restore();
  }

  renderDynamicLayer() {
    const ctx = this.dynamicCtx;
    ctx.save();
    ctx.clearRect(0, 0, this.dynamicCanvas.width, this.dynamicCanvas.height);
    ctx.scale(this.dpr, this.dpr);
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.scale, this.scale);

    if (this.activeStroke) {
      this.drawElement(ctx, this.activeStroke);
    }

    ctx.restore();
  }

  renderCursorLayer() {
    const ctx = this.cursorCtx;
    ctx.clearRect(0, 0, this.cursorCanvas.width, this.cursorCanvas.height);

    if (!this.showCursor || this.cursorX < 0) return;

    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    const r = Math.max(2, (this.brushRadius * this.scale) / 2);

    // Anillo exterior del pincel
    ctx.beginPath();
    ctx.arc(this.cursorX, this.cursorY, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Punto central
    ctx.beginPath();
    ctx.arc(this.cursorX, this.cursorY, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();

    ctx.restore();
  }

  drawElement(ctx, el) {
    if (!el) return;

    if (el.type === 'stroke' || el.type === 'eraser') {
      const points = el.points;
      if (!points || points.length < 2) return;

      ctx.save();
      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = el.width || 3;

      if (el.type === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.lineWidth = (el.width || 20);
      } else if (el.isHighlighter) {
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = el.color || '#ffff00';
      } else {
        ctx.globalAlpha = el.opacity !== undefined ? el.opacity : 1.0;
        ctx.strokeStyle = el.color || '#ffffff';
      }

      ctx.moveTo(points[0], points[1]);
      if (points.length === 2) {
        ctx.lineTo(points[0] + 0.1, points[1] + 0.1);
      } else {
        // Curvas Catmull-Rom suavizadas para trazos más fluidos
        if (points.length >= 6 && el.type !== 'eraser') {
          ctx.moveTo(points[0], points[1]);
          for (let i = 2; i < points.length - 2; i += 2) {
            const mx = (points[i] + points[i + 2]) / 2;
            const my = (points[i + 1] + points[i + 3]) / 2;
            ctx.quadraticCurveTo(points[i], points[i + 1], mx, my);
          }
          ctx.lineTo(points[points.length - 2], points[points.length - 1]);
        } else {
          for (let i = 2; i < points.length; i += 2) {
            ctx.lineTo(points[i], points[i + 1]);
          }
        }
      }

      ctx.stroke();
      ctx.restore();

    } else if (el.type === 'text') {
      ctx.save();
      ctx.globalAlpha = el.opacity !== undefined ? el.opacity : 1.0;
      ctx.fillStyle = el.color || '#ffffff';
      ctx.font = `${el.size || 20}px -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif`;
      ctx.textBaseline = 'top';
      ctx.fillText(el.text || '', el.x, el.y);
      ctx.restore();
    }
  }

  exportPNG() {
    // Crear canvas temporal combinando grid + static layers
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = this.staticCanvas.width;
    tmpCanvas.height = this.staticCanvas.height;
    const tmpCtx = tmpCanvas.getContext('2d');

    // Fondo oscuro
    tmpCtx.fillStyle = '#121214';
    tmpCtx.fillRect(0, 0, tmpCanvas.width, tmpCanvas.height);

    // Grid (si está visible)
    if (this.showGrid) tmpCtx.drawImage(this.gridCanvas, 0, 0);

    // Contenido dibujado
    tmpCtx.drawImage(this.staticCanvas, 0, 0);

    // Disparar descarga
    tmpCanvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lienzo-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }
}
