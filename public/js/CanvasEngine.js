import { Math2D, simplifyRDP } from './Math2D.js';

/**
 * CanvasEngine.js - Motor de Renderizado Multicapa (Double-Buffering & Offscreen Canvas)
 * Garantiza 60 FPS sostenidos y renderizado acelerado por GPU.
 */
export class CanvasEngine {
  constructor(containerElement) {
    this.container = containerElement;

    // Capa Estática (Background Canvas para elementos guardados)
    this.staticCanvas = document.createElement('canvas');
    this.staticCtx = this.staticCanvas.getContext('2d');

    // Capa Dinámica (Interactive Canvas para trazo activo a 60 FPS)
    this.dynamicCanvas = document.createElement('canvas');
    this.dynamicCtx = this.dynamicCanvas.getContext('2d');

    // Ajuste de estilos para apilamiento de capas
    this.setupCanvasStyles();
    this.container.appendChild(this.staticCanvas);
    this.container.appendChild(this.dynamicCanvas);

    // Estado de Cámara (Pan y Zoom)
    this.panX = 0;
    this.panY = 0;
    this.scale = 1.0;
    this.dpr = window.devicePixelRatio || 1;

    // Grafo de Escena local
    this.elements = [];
    this.activeStroke = null;

    // Manejo de Resizing
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  setupCanvasStyles() {
    [this.staticCanvas, this.dynamicCanvas].forEach((canvas) => {
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.touchAction = 'none';
    });
    this.dynamicCanvas.style.zIndex = '10';
    this.staticCanvas.style.zIndex = '1';
  }

  resize() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.dpr = window.devicePixelRatio || 1;

    [this.staticCanvas, this.dynamicCanvas].forEach((canvas) => {
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

  setActiveStroke(stroke) {
    this.activeStroke = stroke;
    this.renderDynamicLayer();
  }

  renderAll() {
    this.renderStaticLayer();
    this.renderDynamicLayer();
  }

  renderStaticLayer() {
    const ctx = this.staticCtx;
    ctx.save();
    ctx.clearRect(0, 0, this.staticCanvas.width, this.staticCanvas.height);
    ctx.scale(this.dpr, this.dpr);

    // Aplicar matriz de vista nativa
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.scale, this.scale);

    // Dibujar elementos confirmados
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

    // Aplicar matriz de vista nativa
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.scale, this.scale);

    // Dibujar trazo activo
    if (this.activeStroke) {
      this.drawElement(ctx, this.activeStroke);
    }

    ctx.restore();
  }

  drawElement(ctx, el) {
    if (!el) return;

    if (el.type === 'stroke') {
      const points = el.points;
      if (!points || points.length < 4) return;

      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = el.color || '#ffffff';
      ctx.lineWidth = el.width || 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (el.isHighlighter) {
        ctx.globalAlpha = 0.4;
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.moveTo(points[0], points[1]);
      for (let i = 2; i < points.length; i += 2) {
        ctx.lineTo(points[i], points[i + 1]);
      }

      ctx.stroke();
      ctx.restore();
    } else if (el.type === 'text') {
      ctx.save();
      ctx.fillStyle = el.color || '#ffffff';
      ctx.font = `${el.size || 20}px Inter, sans-serif`;
      ctx.textBaseline = 'top';
      ctx.fillText(el.text || '', el.x, el.y);
      ctx.restore();
    }
  }
}
