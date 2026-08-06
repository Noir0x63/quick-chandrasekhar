/**
 * LassoTool.js - Herramienta de Selección Lazo y Manipulación de Transformación Vectorial.
 */
export class LassoTool {
  /**
   * Determina qué elementos están contenidos o intersectados por el lazo de selección.
   * @param {Array<number>} lassoPoints - [x0, y0, x1, y1, ...]
   * @param {Array<Object>} elements 
   * @returns {Array<Object>} Elementos seleccionados
   */
  static selectElements(lassoPoints, elements) {
    if (!lassoPoints || lassoPoints.length < 6 || !elements) return [];

    const selected = [];
    for (const el of elements) {
      if (el.type === 'stroke' && el.points) {
        // Verificar si algún punto del trazo cae dentro del polígono del lazo
        let isInside = false;
        for (let i = 0; i < el.points.length; i += 2) {
          if (this.pointInPolygon(el.points[i], el.points[i + 1], lassoPoints)) {
            isInside = true;
            break;
          }
        }
        if (isInside) selected.push(el);
      } else if (el.type === 'text') {
        if (this.pointInPolygon(el.x, el.y, lassoPoints)) {
          selected.push(el);
        }
      }
    }

    return selected;
  }

  /**
   * Algoritmo Ray-Casting para punto en polígono.
   */
  static pointInPolygon(px, py, polygon) {
    let inside = false;
    const numPoints = polygon.length / 2;

    for (let i = 0, j = numPoints - 1; i < numPoints; j = i++) {
      const ix = polygon[i * 2];
      const iy = polygon[i * 2 + 1];
      const jx = polygon[j * 2];
      const jy = polygon[j * 2 + 1];

      const intersect = ((iy > py) !== (jy > py)) &&
        (px < (jx - ix) * (py - iy) / (jy - iy) + ix);
      if (intersect) inside = !inside;
    }

    return inside;
  }
}
