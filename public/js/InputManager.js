import { Math2D, simplifyRDP } from './Math2D.js';

/**
 * InputManager.js - Gestor de Eventos de Entrada PointerEvents con Soporte Completo de Navegación Espacial (Pan & Zoom Multi-Touch).
 */
export class InputManager {
  constructor(targetElement, callbacks = {}) {
    this.target = targetElement;
    this.onStrokeStart = callbacks.onStrokeStart || (() => {});
    this.onStrokeMove = callbacks.onStrokeMove || (() => {});
    this.onStrokeEnd = callbacks.onStrokeEnd || (() => {});
    this.onPanZoom = callbacks.onPanZoom || (() => {});

    this.isDrawing = false;
    this.currentPoints = [];
    this.activePointerId = null;

    // Estado de Cámara Local
    this.panX = 0;
    this.panY = 0;
    this.scale = 1.0;

    // Herramientas: 'pen', 'highlighter', 'lasso', 'pan'
    this.currentTool = 'pen';
    this.currentColor = '#ffffff';
    this.currentWidth = 4;

    // Seguimiento de Punteros para Gestos Multi-Touch (Pan & Zoom con 2 dedos o Modo Mover)
    this.activePointers = new Map();
    this.lastPinchDist = 0;
    this.lastPinchCenter = { x: 0, y: 0 };

    this.bindEvents();
  }

  setCamera(panX, panY, scale) {
    this.panX = panX;
    this.panY = panY;
    this.scale = scale;
  }

  setTool(tool, color, width) {
    this.currentTool = tool;
    if (color) this.currentColor = color;
    if (width) this.currentWidth = width;
  }

  bindEvents() {
    this.target.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
    this.target.addEventListener('pointermove', (e) => this.handlePointerMove(e));
    this.target.addEventListener('pointerup', (e) => this.handlePointerUp(e));
    this.target.addEventListener('pointercancel', (e) => this.handlePointerUp(e));
    this.target.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
  }

  handlePointerDown(e) {
    this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Si hay 2 o más dedos en la pantalla, se activa el modo Pan/Zoom Multi-Touch automáticamente
    if (this.activePointers.size >= 2) {
      if (this.isDrawing) {
        this.isDrawing = false;
        this.currentPoints = [];
      }
      this.initPinchGesture();
      return;
    }

    // Si la herramienta activa es 'pan' (Mover Mano) o toque secundario
    if (this.currentTool === 'pan' || e.button === 1 || e.button === 2) {
      this.isPanning = true;
      this.lastPanX = e.clientX;
      this.lastPanY = e.clientY;
      this.target.setPointerCapture(e.pointerId);
      return;
    }

    // Modo Dibujo (Pluma / Resaltador / Lazo) con 1 solo dedo o lápiz
    if (!e.isPrimary && e.pointerType === 'touch') return;

    this.isDrawing = true;
    this.activePointerId = e.pointerId;
    this.target.setPointerCapture(e.pointerId);

    const world = Math2D.screenToWorld(e.clientX, e.clientY, this.panX, this.panY, this.scale);
    this.currentPoints = [world.x, world.y];

    this.onStrokeStart({
      tool: this.currentTool,
      color: this.currentColor,
      width: this.currentWidth / this.scale,
      points: [...this.currentPoints]
    });
  }

  handlePointerMove(e) {
    if (this.activePointers.has(e.pointerId)) {
      this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Gestos con 2 dedos (Pinch Zoom + Pan)
    if (this.activePointers.size >= 2) {
      this.handlePinchGesture();
      return;
    }

    // Desplazamiento en Modo Mover Mano ('pan')
    if (this.isPanning) {
      const dx = e.clientX - this.lastPanX;
      const dy = e.clientY - this.lastPanY;
      this.panX += dx;
      this.panY += dy;
      this.lastPanX = e.clientX;
      this.lastPanY = e.clientY;

      this.onPanZoom(this.panX, this.panY, this.scale);
      return;
    }

    // Actualización de trazo activo
    if (!this.isDrawing || e.pointerId !== this.activePointerId) return;

    const world = Math2D.screenToWorld(e.clientX, e.clientY, this.panX, this.panY, this.scale);
    this.currentPoints.push(world.x, world.y);

    this.onStrokeMove({
      points: [...this.currentPoints]
    });
  }

  handlePointerUp(e) {
    this.activePointers.delete(e.pointerId);

    if (this.isPanning) {
      this.isPanning = false;
      if (this.target.hasPointerCapture(e.pointerId)) {
        this.target.releasePointerCapture(e.pointerId);
      }
      return;
    }

    if (!this.isDrawing || e.pointerId !== this.activePointerId) return;

    this.isDrawing = false;
    if (this.target.hasPointerCapture(e.pointerId)) {
      this.target.releasePointerCapture(e.pointerId);
    }

    const finalPoints = [...this.currentPoints];
    const simplifiedPoints = finalPoints.length > 4 ? simplifyRDP(finalPoints, 0.2 / this.scale) : finalPoints;

    this.onStrokeEnd({
      tool: this.currentTool,
      color: this.currentColor,
      width: this.currentWidth / this.scale,
      points: simplifiedPoints
    });

    this.currentPoints = [];
    this.activePointerId = null;
  }

  initPinchGesture() {
    const pts = Array.from(this.activePointers.values());
    this.lastPinchDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
    this.lastPinchCenter = {
      x: (pts[0].x + pts[1].x) / 2,
      y: (pts[0].y + pts[1].y) / 2
    };
  }

  handlePinchGesture() {
    const pts = Array.from(this.activePointers.values());
    if (pts.length < 2) return;

    const newDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
    const newCenter = {
      x: (pts[0].x + pts[1].x) / 2,
      y: (pts[0].y + pts[1].y) / 2
    };

    const zoomFactor = newDist / (this.lastPinchDist || newDist);
    const newScale = Math.max(0.1, Math.min(50, this.scale * zoomFactor));

    // Pan + Zoom simultáneo alrededor del centro de pinch
    const dx = newCenter.x - this.lastPinchCenter.x;
    const dy = newCenter.y - this.lastPinchCenter.y;

    this.panX = newCenter.x - (newCenter.x - (this.panX + dx)) * (newScale / this.scale);
    this.panY = newCenter.y - (newCenter.y - (this.panY + dy)) * (newScale / this.scale);
    this.scale = newScale;

    this.lastPinchDist = newDist;
    this.lastPinchCenter = newCenter;

    this.onPanZoom(this.panX, this.panY, this.scale);
  }

  handleWheel(e) {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newScale = Math.max(0.1, Math.min(50, this.scale * zoomFactor));

    const mouseX = e.clientX;
    const mouseY = e.clientY;

    const newPanX = mouseX - (mouseX - this.panX) * (newScale / this.scale);
    const newPanY = mouseY - (mouseY - this.panY) * (newScale / this.scale);

    this.panX = newPanX;
    this.panY = newPanY;
    this.scale = newScale;

    this.onPanZoom(this.panX, this.panY, this.scale);
  }
}
