import { Math2D, simplifyRDP } from './Math2D.js';

/**
 * InputManager.js - Gestor de Eventos de Entrada PointerEvents con Palm Rejection.
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

    this.panX = 0;
    this.panY = 0;
    this.scale = 1.0;

    this.currentTool = 'pen';
    this.currentColor = '#ffffff';
    this.currentWidth = 4;

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
    if (!this.isDrawing || e.pointerId !== this.activePointerId) return;

    const world = Math2D.screenToWorld(e.clientX, e.clientY, this.panX, this.panY, this.scale);
    this.currentPoints.push(world.x, world.y);

    this.onStrokeMove({
      points: [...this.currentPoints]
    });
  }

  handlePointerUp(e) {
    if (!this.isDrawing || e.pointerId !== this.activePointerId) return;

    this.isDrawing = false;
    if (this.target.hasPointerCapture(e.pointerId)) {
      this.target.releasePointerCapture(e.pointerId);
    }

    // Preservar la secuencia de puntos completa
    const finalPoints = [...this.currentPoints];
    const simplifiedPoints = finalPoints.length > 4 ? simplifyRDP(finalPoints, 0.5 / this.scale) : finalPoints;

    this.onStrokeEnd({
      tool: this.currentTool,
      color: this.currentColor,
      width: this.currentWidth / this.scale,
      points: simplifiedPoints
    });

    this.currentPoints = [];
    this.activePointerId = null;
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
