/**
 * MathSuite.js - Módulo de Evaluación de Funciones y Deslizadores Dinámicos (Sliders).
 */
export class MathSuite {
  /**
   * Evalúa una función 2D f(x) con parámetros dinámicos.
   * Ejemplo: fnStr = "a * Math.sin(b * x)"
   */
  static evaluateFunction(fnStr, x, params = {}) {
    try {
      // Reemplazo seguro de variables sanitizadas
      const paramNames = Object.keys(params);
      const paramValues = Object.values(params);
      const func = new Function('x', ...paramNames, `return ${fnStr};`);
      return func(x, ...paramValues);
    } catch (err) {
      return NaN;
    }
  }

  /**
   * Genera los puntos vectoriales [x0, y0, x1, y1, ...] para graficar una función en Espacio de Mundo.
   */
  static generateFunctionPlot(fnStr, xMin = -10, xMax = 10, step = 0.1, params = {}) {
    const points = [];
    for (let x = xMin; x <= xMax; x += step) {
      const y = this.evaluateFunction(fnStr, x, params);
      if (!isNaN(y) && isFinite(y)) {
        points.push(x, y);
      }
    }
    return points;
  }
}
