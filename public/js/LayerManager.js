/**
 * LayerManager.js - Gestor de Capas y Grafo de Escena con Z-Index Monótono.
 */
export class LayerManager {
  constructor() {
    this.layers = [
      { id: 'layer_default', name: 'Capa 1', visible: true, locked: false }
    ];
    this.activeLayerId = 'layer_default';
    this.nextZIndex = 1;
  }

  getNextZIndex() {
    return this.nextZIndex++;
  }

  addLayer(name) {
    const layer = {
      id: 'layer_' + Math.random().toString(36).substr(2, 9),
      name: name || `Capa ${this.layers.length + 1}`,
      visible: true,
      locked: false
    };
    this.layers.push(layer);
    this.activeLayerId = layer.id;
    return layer;
  }

  toggleVisibility(layerId) {
    const layer = this.layers.find((l) => l.id === layerId);
    if (layer) layer.visible = !layer.visible;
  }

  toggleLock(layerId) {
    const layer = this.layers.find((l) => l.id === layerId);
    if (layer) layer.locked = !layer.locked;
  }
}
