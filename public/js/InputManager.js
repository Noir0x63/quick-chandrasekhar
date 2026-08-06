import { Math2D, simplifyRDP } from './Math2D.js';

/**
 * InputManager.js - Gestor de Entrada Completo con Pan/Zoom Multi-Touch, Rueda de Ratón (Shift/Alt o Clic Central), Eraser, Opacidad y Cursor CSS.
 */
export class InputManager {
  constructor(targetElement, callbacks = {}) {
    this.target = targetElement;
    this.onStrokeStart = callbacks.onStrokeStart || (() => {});
    this.onStrokeMove = callbacks.onStrokeMove || (() => {});
    this.onStrokeEnd = callbacks.onStrokeEnd || (() => {});
    this.onPanZoom = callbacks.onPanZoom || (() => {});
    this.onCursorMove = callbacks.onCursorMove || (() => {});

    this.isDrawing = false;
    this.isPanning = false;
    this.currentPoints = [];
    this.activePointerId = null;

    this.panX = 0;
    this.panY = 0;
    this.scale = 1.0;

    // Herramientas: 'pen', 'highlighter', 'eraser', 'lasso', 'pan', 'text'
    this.currentTool = 'pen';
    this.currentColor = '#ffffff';
    this.currentWidth = 6;
    this.currentOpacity = 1.0;

    // Multi-touch state
    this.activePointers = new Map();
    this.lastPinchDist = 0;
    this.lastPinchCenter = { x: 0, y: 0 };

    this.bindEvents();
    this.applyCursorStyle();
  }

  setCamera(panX, panY, scale) {
    this.panX = panX;
    this.panY = panY;
    this.scale = scale;
  }

  setTool(tool, color, width, opacity) {
    this.currentTool = tool;
    if (color !== undefined) this.currentColor = color;
    if (width !== undefined) this.currentWidth = width;
    if (opacity !== undefined) this.currentOpacity = opacity;
    this.applyCursorStyle();
  }

  setOpacity(opacity) {
    this.currentOpacity = Math.max(0.05, Math.min(1.0, opacity));
  }

  applyCursorStyle() {
    this.target.style.cursor = this.currentTool === 'pan' ? 'grab' : 'none';
  }

  bindEvents() {
    this.target.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
    this.target.addEventListener('pointermove', (e) => this.handlePointerMove(e));
    this.target.addEventListener('pointerup', (e) => this.handlePointerUp(e));
    this.target.addEventListener('pointercancel', (e) => this.handlePointerUp(e));
    this.target.addEventListener('pointerleave', (e) => {
      this.onCursorMove(-1000, -1000);
    });
    this.target.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
  }

  handlePointerDown(e) {
    this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Gesto con 2 dedos → Pan/Zoom multi-touch
    if (this.activePointers.size >= 2) {
      if (this.isDrawing) {
        this.isDrawing = false;
        this.currentPoints = [];
      }
      this.initPinchGesture();
      return;
    }

    // Clic central de rueda de ratón (button 1) o herramienta Mover
    if (this.currentTool === 'pan' || e.button === 1) {
      this.isPanning = true;
      this.lastPanX = e.clientX;
      this.lastPanY = e.clientY;
      this.target.style.cursor = 'grabbing';
      this.target.setPointerCapture(e.pointerId);
      return;
    }

    // Modo Dibujo
    if (!e.isPrimary && e.pointerType === 'touch') return;

    this.isDrawing = true;
    this.activePointerId = e.pointerId;
    this.target.setPointerCapture(e.pointerId);

    const world = Math2D.screenToWorld(e.clientX, e.clientY, this.panX, this.panY, this.scale);
    this.currentPoints = [world.x, world.y];

    this.onStrokeStart({
      tool: this.currentTool,
      color: this.currentColor,
      width: this.currentTool === 'eraser' ? this.currentWidth * 3 : this.currentWidth / this.scale,
      opacity: this.currentOpacity,
      points: [...this.currentPoints]
    });
  }

  handlePointerMove(e) {
    if (this.activePointers.has(e.pointerId)) {
      this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    this.onCursorMove(e.clientX, e.clientY);

    if (this.activePointers.size >= 2) {
      this.handlePinchGesture();
      return;
    }

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

    if (!this.isDrawing || e.pointerId !== this.activePointerId) return;

    const world = Math2D.screenToWorld(e.clientX, e.clientY, this.panX, this.panY, this.scale);
    this.currentPoints.push(world.x, world.y);

    this.onStrokeMove({ points: [...this.currentPoints] });
  }

  handlePointerUp(e) {
    this.activePointers.delete(e.pointerId);

    if (this.isPanning) {
      this.isPanning = false;
      this.target.style.cursor = this.currentTool === 'pan' ? 'grab' : 'none';
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
    const simplifiedPoints = finalPoints.length > 4 ? simplifyRDP(finalPoints, 0.15 / this.scale) : finalPoints;

    this.onStrokeEnd({
      tool: this.currentTool,
      color: this.currentColor,
      width: this.currentTool === 'eraser' ? this.currentWidth * 3 : this.currentWidth / this.scale,
      opacity: this.currentOpacity,
      points: simplifiedPoints
    });

    this.currentPoints = [];
    this.activePointerId = null;
  }

  initPinchGesture() {
    const pts = Array.from(this.activePointers.values());
    if (pts.length < 2) return;
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

    if (this.lastPinchDist === 0) {
      this.lastPinchDist = newDist;
      this.lastPinchCenter = newCenter;
      return;
    }

    const zoomFactor = newDist / this.lastPinchDist;
    const newScale = Math.max(0.05, Math.min(50, this.scale * zoomFactor));

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

    // Si se presiona Ctrl o Meta, la rueda hace Zoom.
    // De lo contrario (rueda por defecto, o con Shift/Alt), desplaza (Pan vertical u horizontal).
    if (e.ctrlKey || e.metaKey) {
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newScale = Math.max(0.05, Math.min(50, this.scale * zoomFactor));
      const newPanX = e.clientX - (e.clientX - this.panX) * (newScale / this.scale);
      const newPanY = e.clientY - (e.clientY - this.panY) * (newScale / this.scale);

      this.panX = newPanX;
      this.panY = newPanY;
      this.scale = newScale;
    } else {
      // Pan directo desplazando con la rueda del ratón o Trackpad
      const dx = e.shiftKey ? e.deltaY : e.deltaX;
      const dy = e.shiftKey ? 0 : e.deltaY;

      this.panX -= dx;
      this.panY -= dy;
    }

    this.onPanZoom(this.panX, this.panY, this.scale);
  }
}
