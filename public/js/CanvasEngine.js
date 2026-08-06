/**
 * CanvasEngine.js - Motor de Renderizado Multicapa con Cursos Remotos en Tiempo Real y Trazos en Vivo.
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

    // Capa Dinámica (Interactive Canvas para trazo activo propio y trazos remotos en vivo a 60 FPS)
    this.dynamicCanvas = document.createElement('canvas');
    this.dynamicCtx = this.dynamicCanvas.getContext('2d');

    // Capa del Cursor (Ring de pincel local y cursores/punteros remotos con nombre/color)
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
    this.remoteActiveStrokes = new Map(); // socketId -> stroke
    this.remoteCursors = new Map(); // socketId -> { worldX, worldY, tool, color, name }

    // Undo / Redo stacks
    this.historyStack = [[]];
    this.historyIndex = 0;

    // Grid visible
    this.showGrid = true;

    // Cursor del pincel local
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

  setRemoteActiveStroke(socketId, stroke) {
    if (!stroke) {
      this.remoteActiveStrokes.delete(socketId);
    } else {
      this.remoteActiveStrokes.set(socketId, stroke);
    }
    this.renderDynamicLayer();
  }

  setRemoteCursor(socketId, cursorData) {
    if (!cursorData) {
      this.remoteCursors.delete(socketId);
    } else {
      this.remoteCursors.set(socketId, cursorData);
    }
    this.renderCursorLayer();
  }

  removeRemotePeer(socketId) {
    this.remoteActiveStrokes.delete(socketId);
    this.remoteCursors.delete(socketId);
    this.renderDynamicLayer();
    this.renderCursorLayer();
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

    const gridSize = 40;
    const dotRadius = 0.8;
    ctx.fillStyle = 'rgba(255,255,255,0.07)';

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

    // Renderizar trazo activo local
    if (this.activeStroke) {
      this.drawElement(ctx, this.activeStroke);
    }

    // Renderizar trazos en vivo activos de los usuarios remotos
    for (const stroke of this.remoteActiveStrokes.values()) {
      this.drawElement(ctx, stroke);
    }

    ctx.restore();
  }

  renderCursorLayer() {
    const ctx = this.cursorCtx;
    ctx.clearRect(0, 0, this.cursorCanvas.width, this.cursorCanvas.height);

    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    // 1. Cursor de pincel local
    if (this.showCursor && this.cursorX >= 0) {
      const r = Math.max(2, (this.brushRadius * this.scale) / 2);
      ctx.beginPath();
      ctx.arc(this.cursorX, this.cursorY, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(this.cursorX, this.cursorY, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fill();
    }

    // 2. Cursores remotos sincronizados
    for (const [socketId, cursor] of this.remoteCursors.entries()) {
      if (cursor.worldX === undefined || cursor.worldY === undefined) continue;

      const sx = cursor.worldX * this.scale + this.panX;
      const sy = cursor.worldY * this.scale + this.panY;
      const color = cursor.color || '#38bdf8';

      // Puntero / Pincel remoto
      ctx.save();
      ctx.translate(sx, sy);

      // Dibujar puntero estilo cursor
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 14);
      ctx.lineTo(4, 10);
      ctx.lineTo(9, 15);
      ctx.lineTo(11, 13);
      ctx.lineTo(6, 8);
      ctx.lineTo(12, 8);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Etiqueta de identificador del usuario remoto
      const label = cursor.name || `User ${socketId.substring(0, 4)}`;
      ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
      const textWidth = ctx.measureText(label).width;

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(14, 10, textWidth + 8, 16, 4);
      ctx.fill();

      ctx.fillStyle = '#000000';
      ctx.fontWeight = 'bold';
      ctx.fillText(label, 18, 22);

      ctx.restore();
    }

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
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = this.staticCanvas.width;
    tmpCanvas.height = this.staticCanvas.height;
    const tmpCtx = tmpCanvas.getContext('2d');

    tmpCtx.fillStyle = '#121214';
    tmpCtx.fillRect(0, 0, tmpCanvas.width, tmpCanvas.height);

    if (this.showGrid) tmpCtx.drawImage(this.gridCanvas, 0, 0);
    tmpCtx.drawImage(this.staticCanvas, 0, 0);

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
