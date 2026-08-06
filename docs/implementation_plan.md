# Plan de Implementación Definitivo (Implementation Roadmap)

**Proyecto:** Interactive Canvas (Pizarra Infinito-Bidireccional en Tiempo Real)  
**Estándares de Referencia:** SAD v2.0, E-SWE v2.0 (ZTSE), Security Threat Model  
**Estrategia:** 4 Fases Progresivas con Criterios de Aceptación Cuantificables y Commits por Tarea.

---

## FASE 1: Núcleo de Infraestructura, Servidor Relay Zero-Trust y Almacenamiento Local (Días 1-2)

### Objetivos Cuantificables
- Servidor Node.js + Socket.io operativo con validación de seguridad (rate limiting 60 msg/s, payload max 100KB, validación de Room ID por regex).
- Capa de persistencia client-side local IndexedDB via wrapper ultraliviano funcional.
- Cobertura de tests unitarios $\ge 90\%$ en componentes de infraestructura.

### Tareas Específicas
1. **Tarea 1.1:** Inicializar proyecto Node.js/TypeScript con scripts de build, linting (ESLint + Prettier) y testing (Vitest).
2. **Tarea 1.2:** Crear Servidor Relay `server.js` (Node.js + Socket.io):
   - Implementar rate limiter por socket (`100 msgs/sec`).
   - Implementar middleware de validación regex `/^[a-zA-Z0-9_-]{16,32}$/` para `roomId`.
   - Implementar manejador de salas (Join, Relay `draw-action`, `sync-request`, `sync-chunk`).
3. **Tarea 1.3:** Crear Módulo Cliente de Persistencia `storage.js` (IndexedDB Wrapper):
   - Métodos asíncronos idempotentes `saveElement`, `getScene`, `clearScene`.
4. **Tarea 1.4:** Crear suite de pruebas de integración para el servidor y la capa de almacenamiento.

---

## FASE 2: Motor de Lienzo Infinito, Transformación Espacial 2D y Pinceles (Días 3-4)

### Objetivos Cuantificables
- Renderizado fluido sostenido a **60 FPS** en la GPU del navegador.
- Conversión precisa de coordenadas de Pantalla a Espacio de Mundo ($\mathbf{P}_{\text{world}} = (\mathbf{P}_{\text{screen}} - \mathbf{T})/S$).
- Soporte para 3 herramientas básicas: Pluma (Ink), Resaltador (Highlighter) y Borrador.

### Tareas Específicas
1. **Tarea 2.1:** Implementar `Math2D.js` (Motor de Transformación Causal y Matriz de Vista):
   - Funciones puras de conversión `screenToWorld` y `worldToScreen`.
   - Implementar cálculo de matriz nativa `DOMMatrix`.
2. **Tarea 2.2:** Implementar `CanvasEngine.js` (Arquitectura Multicapa - Double Buffering):
   - Layer 1: Offscreen Static Canvas para elementos confirmados.
   - Layer 2: Interactive Dynamic Canvas a 60 FPS para el trazo activo.
   - Implementación de suavizado Catmull-Rom y simplificación geométrica RDP (Ramer-Douglas-Peucker).
3. **Tarea 2.3:** Implementar Gestores de Entrada (`InputManager.js`):
   - Escuchadores de `PointerEvents` con filtrado `isPrimary` y soporte multi-touch/pinch-to-zoom.
   - Normalización de grosor y tamaño en Espacio de Mundo.

---

## FASE 3: Sincronización Real-Time P2P, Chunking y Generación QR (Días 5-6)

### Objetivos Cuantificables
- Latencia de red entre pares $\le 50\text{ ms}$.
- Hidratación de estado inicial paginada mediante `sync-chunk` sin congelamiento de UI.
- Generación 100% offline de código QR SVG/Canvas en el cliente.

### Tareas Específicas
1. **Tarea 3.1:** Implementar `QRManager.js`:
   - Motor de renderizado local de código QR en Canvas/SVG (zero dependencias externas).
2. **Tarea 3.2:** Implementar `SyncManager.js` (Protocolo de Sincronización y Reloj de Lamport):
   - Implementación de Reloj Lógico de Lamport para resolver conflictos temporales.
   - Manejo de estado de hidratación (`IS_HYDRATING`) y buffer temporal (*Pending Sync Buffer*).
   - Fragmentación y reconstrucción de deltas en paquetes `sync-chunk`.
3. **Tarea 3.3:** Implementar `CursorManager.js` (Live Cursors):
   - Transmisión y renderizado del puntero remoto de otros peers con etiqueta personalizada.

---

## FASE 4: Módulo de Matemáticas Interactivas, Capas, UI Premium y Hardening (Días 7-8)

### Objetivos Cuantificables
- Reconocimiento y renderizado de expresiones LaTeX.
- Deslizadores dinámicos (Sliders) para parámetros de ecuaciones a 60 FPS.
- Cero advertencias de linters, escaneo SAST limpio y suite de verificación pasando al 100%.

### Tareas Específicas
1. **Tarea 4.1:** Implementar Módulo de Capas y Grafo de Escena (`LayerManager.js`):
   - Gestión de capas con `zIndex` incremental monótono, visibilidad y bloqueo.
2. **Tarea 4.2:** Implementar Módulo Matemático `MathSuite.js`:
   - Integración de renderizado de fórmulas LaTeX.
   - Graficador de funciones 2D $y=f(x)$ con sliders interactivos sincronizados.
3. **Tarea 4.3:** UI/UX Premium (Modern Floating Toolbar & Bento Style Layout):
   - Interfaz HTML5/Vanilla CSS con vidrio esmerilado (glassmorphism), temas oscuro/claro y adaptabilidad responsive a dispositivos móviles.
4. **Tarea 4.4:** Audit de Seguridad, Testing E2E y Verificación Final:
   - Ejecución de escaneos de seguridad y pruebas de carga.

---

## Plan de Commits

Procederemos a guardar este plan en `docs/implementation_plan.md` y realizar el commit correspondiente.
