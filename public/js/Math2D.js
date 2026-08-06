/**
 * Math2D.js - Motor de Transformación Espacial y Matrices de Vista Nativas.
 */
export class Math2D {
  /**
   * Convierte una coordenada de Pantalla (pixels) a Espacio de Mundo (World Coordinates).
   * P_world = (P_screen - Translation) / Scale
   */
  static screenToWorld(screenX, screenY, panX, panY, scale) {
    return {
      x: (screenX - panX) / scale,
      y: (screenY - panY) / scale
    };
  }

  /**
   * Convierte una coordenada de Espacio de Mundo a Pantalla (pixels).
   * P_screen = (P_world * Scale) + Translation
   */
  static worldToScreen(worldX, worldY, panX, panY, scale) {
    return {
      x: (worldX * scale) + panX,
      y: (worldY * scale) + panY
    };
  }

  /**
   * Genera la matriz de transformación 2D nativa DOMMatrix para el contexto Canvas.
   */
  static getMatrix(panX, panY, scale) {
    const matrix = new DOMMatrix();
    matrix.translateSelf(panX, panY);
    matrix.scaleSelf(scale, scale);
    return matrix;
  }
}

/**
 * Algoritmo Ramer-Douglas-Peucker (RDP) para simplificación geométrica de vértices.
 * Reduce puntos colineales redundantes en arreglos planos interleaved [x0, y0, x1, y1, ...].
 */
export function simplifyRDP(points, epsilon = 1.0) {
  if (!points || points.length <= 4) return points;

  const numPoints = points.length / 2;
  const keep = new Uint8Array(numPoints);
  keep[0] = 1;
  keep[numPoints - 1] = 1;

  function rdpStep(first, last) {
    let maxDist = 0;
    let index = first;

    const ax = points[first * 2];
    const ay = points[first * 2 + 1];
    const bx = points[last * 2];
    const by = points[last * 2 + 1];

    for (let i = first + 1; i < last; i++) {
      const px = points[i * 2];
      const py = points[i * 2 + 1];
      const dist = perpendicularDistance(px, py, ax, ay, bx, by);

      if (dist > maxDist) {
        index = i;
        maxDist = dist;
      }
    }

    if (maxDist > epsilon) {
      keep[index] = 1;
      rdpStep(first, index);
      rdpStep(index, last);
    }
  }

  rdpStep(0, numPoints - 1);

  const result = [];
  for (let i = 0; i < numPoints; i++) {
    if (keep[i]) {
      result.push(points[i * 2], points[i * 2 + 1]);
    }
  }

  return result;
}

function perpendicularDistance(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;

  if (dx === 0 && dy === 0) {
    return Math.hypot(px - ax, py - ay);
  }

  const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  const clampedT = Math.max(0, Math.min(1, t));

  const nearestX = ax + clampedT * dx;
  const nearestY = ay + clampedT * dy;

  return Math.hypot(px - nearestX, py - nearestY);
}
