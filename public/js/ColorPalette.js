/**
 * ColorPalette.js - Paleta de Colores Táctil Estilo Procreate con Swatches Predefinidos y Colores Recientes.
 */
export class ColorPalette {
  constructor(anchorElement, onColorSelect) {
    this.anchor = anchorElement;
    this.onColorSelect = onColorSelect || (() => {});
    this.recentColors = [];
    this.maxRecent = 5;

    // 20 colores predefinidos Procreate-style
    this.presets = [
      '#ffffff', '#c0c0c0', '#808080', '#404040', '#000000',
      '#ff453a', '#ff9f0a', '#ffd60a', '#30d158', '#34c759',
      '#64d2ff', '#0a84ff', '#5e5ce6', '#bf5af2', '#ff375f',
      '#e8d0a0', '#8b4513', '#228b22', '#00ced1', '#ff6347'
    ];

    this.panel = null;
    this.build();
  }

  build() {
    this.panel = document.createElement('div');
    this.panel.className = 'color-palette-panel';
    this.panel.style.display = 'none';
    this.panel.innerHTML = `
      <div class="cp-section-title">Colores Recientes</div>
      <div class="cp-swatches" id="cp-recent"></div>
      <div class="cp-divider"></div>
      <div class="cp-section-title">Paleta</div>
      <div class="cp-swatches" id="cp-presets"></div>
      <div class="cp-divider"></div>
      <div class="cp-custom-row">
        <label class="cp-custom-label">Personalizado</label>
        <input type="color" class="cp-custom-input" id="cp-custom" value="#ffffff">
      </div>
    `;
    document.body.appendChild(this.panel);

    // Render presets
    const presetsEl = this.panel.querySelector('#cp-presets');
    this.presets.forEach(color => {
      presetsEl.appendChild(this.makeSwatch(color));
    });

    // Custom color
    const customInput = this.panel.querySelector('#cp-custom');
    customInput.addEventListener('input', (e) => {
      this.selectColor(e.target.value);
    });

    // Cerrar al click fuera
    document.addEventListener('pointerdown', (e) => {
      if (this.panel.style.display === 'block' &&
          !this.panel.contains(e.target) &&
          e.target !== this.anchor) {
        this.hide();
      }
    });

    this.renderRecent();
  }

  makeSwatch(color) {
    const swatch = document.createElement('button');
    swatch.className = 'cp-swatch';
    swatch.style.background = color;
    swatch.title = color;
    swatch.addEventListener('click', () => this.selectColor(color));
    return swatch;
  }

  selectColor(color) {
    this.addRecent(color);
    this.onColorSelect(color);
    this.hide();
  }

  addRecent(color) {
    this.recentColors = this.recentColors.filter(c => c !== color);
    this.recentColors.unshift(color);
    if (this.recentColors.length > this.maxRecent) {
      this.recentColors = this.recentColors.slice(0, this.maxRecent);
    }
    this.renderRecent();
  }

  renderRecent() {
    const recentEl = this.panel.querySelector('#cp-recent');
    if (!recentEl) return;
    recentEl.innerHTML = '';
    if (this.recentColors.length === 0) {
      recentEl.innerHTML = '<span class="cp-empty">Ninguno aún</span>';
    } else {
      this.recentColors.forEach(color => recentEl.appendChild(this.makeSwatch(color)));
    }
  }

  toggle() {
    if (this.panel.style.display === 'block') {
      this.hide();
    } else {
      this.show();
    }
  }

  show() {
    // Posicionar debajo del ancla
    const rect = this.anchor.getBoundingClientRect();
    this.panel.style.display = 'block';
    const panelW = 230;
    let left = rect.left + rect.width / 2 - panelW / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - panelW - 8));
    const top = rect.bottom + 8;
    this.panel.style.left = `${left}px`;
    this.panel.style.top = `${top}px`;
  }

  hide() {
    this.panel.style.display = 'none';
  }
}
