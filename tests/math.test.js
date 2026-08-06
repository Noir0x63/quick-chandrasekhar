import { describe, it, expect } from 'vitest';
import { Math2D, simplifyRDP } from '../public/js/Math2D.js';

describe('Math2D & RDP Simplifier (Fase 2)', () => {
  it('Debe convertir correctamente Coordenadas de Pantalla a Espacio de Mundo', () => {
    const screenX = 200;
    const screenY = 300;
    const panX = 50;
    const panY = 50;
    const scale = 2.0;

    const world = Math2D.screenToWorld(screenX, screenY, panX, panY, scale);
    expect(world.x).toBe(75); // (200 - 50) / 2 = 75
    expect(world.y).toBe(125); // (300 - 50) / 2 = 125
  });

  it('Debe convertir correctamente Coordenadas de Mundo a Pantalla', () => {
    const worldX = 75;
    const worldY = 125;
    const panX = 50;
    const panY = 50;
    const scale = 2.0;

    const screen = Math2D.worldToScreen(worldX, worldY, panX, panY, scale);
    expect(screen.x).toBe(200);
    expect(screen.y).toBe(300);
  });

  it('Debe simplificar puntos colineales redundantes usando el algoritmo RDP', () => {
    // 5 puntos en línea recta con un pequeño offset colineal
    const points = [0, 0, 10, 0, 20, 0, 30, 0, 40, 0];
    const simplified = simplifyRDP(points, 1.0);

    // Debe reducir la línea recta de 5 puntos a solo 2 puntos (inicio y fin)
    expect(simplified.length).toBe(4);
    expect(simplified).toEqual([0, 0, 40, 0]);
  });
});
