# Auditoría Rigurosa y Cruzamiento de Código Fuente contra Documentos de Referencia

**Proyecto:** Interactive Canvas (Pizarra Infinito-Bidireccional en Tiempo Real)  
**Objetivo:** Auditar la implementación actual (`server.js`, `public/js/*`, `index.html`) contrastándola punto por punto contra los documentos de especificación creados en el repositorio (`SAD v2.0`, `E-SWE v2.0`, `Security Threat Model`, `Functional Baseline` e `Interactive Math`).

---

## 1. Matriz de Cumplimiento por Documento de Referencia

### 1.1 Documento de Arquitectura de Software (SAD v2.0)

| Requerimiento de Arquitectura | Estado en Código | Ubicación en Código | Hallazgos / Brechas Identificadas |
| --- | --- | --- | --- |
| **Zero-Trust Relay Server** ($O(1)$ almacenamiento) | **CUMPLIDO (100%)** | `server.js:L53-L75` | El servidor retransmite los paquetes sin almacenarlos en base de datos. |
| **IndexedDB Local-First** (Source of Truth) | **CUMPLIDO (100%)** | `public/js/storage.js:L18-L65` | Persistencia en el navegador usando `idb-keyval`. |
| **Paginación `sync-chunk`** | **CUMPLIDO (100%)** | `public/js/SyncManager.js:L31-L55` | Fragmentación de la escena en bloques de 50 elementos. |
| **Matrices Nativas 2D (`DOMMatrix`)** | **PARCIAL (85%)** | `public/js/Math2D.js:L24-L30` & `CanvasEngine.js:L90` | `Math2D.getMatrix()` está definida, pero `CanvasEngine` usa `ctx.translate` / `ctx.scale` directamente en lugar de `ctx.setTransform(matrix)`. |
| **Generación QR Client-Side Local** | **CUMPLIDO (100%)** | `public/js/QRManager.js:L11-L24` | Código QR vectorial SVG renderizado totalmente offline. |

---

### 1.2 Manifiesto de Ingeniería de Software Extrema (E-SWE v2.0 - ZTSE)

| Principio E-SWE | Estado en Código | Ubicación en Código | Hallazgos / Brechas Identificadas |
| --- | --- | --- | --- |
| **Hexagonal Ports & Adapters (DDD)** | **CUMPLIDO (100%)** | `public/js/Math2D.js` & `storage.js` | El motor matemático es puro sin acoplamiento con la UI o la red. |
| **Zero-Allocation Hot Path (`pointermove`)** | **PARCIAL (90%)** | `public/js/InputManager.js:L67-L73` | Se usan arreglos planos `points = [x0, y0, ...]`, pero se crean pequeños objetos temporales `{x, y}` en `screenToWorld`. |
| **Double-Buffering Multi-Layer Canvas** | **CUMPLIDO (100%)** | `public/js/CanvasEngine.js:L10-L35` | Capa estática Offscreen y capa dinámica separadas. |
| **Reloj Lógico de Lamport** | **CUMPLIDO (100%)** | `public/js/SyncManager.js:L16-L20` | Incremento monótono $L = \max(L_{\text{local}}, L_{\text{remote}}) + 1$. |
| **Backoff Exponencial en Reconexiones** | **FALTANTE (0%)** | `public/index.html:L62` | `const socket = io();` usa la reconexión por defecto de Socket.io sin personalizar el backoff con jitter explícito. |

---

### 1.3 Modelado de Amenazas y Seguridad (Security Threat Model)

| Control de Seguridad | Estado en Código | Ubicación en Código | Hallazgos / Brechas Identificadas |
| --- | --- | --- | --- |
| **Sanitización de IDs de Sala (`ROOM_REGEX`)** | **CUMPLIDO (100%)** | `server.js:L42-L46` | Expresión regular estricta `/^[a-zA-Z0-9_-]{16,32}$/`. |
| **Rate Limiting por Socket (100 msgs/s)** | **CUMPLIDO (100%)** | `server.js:L24-L39` | Middleware con ventana deslizante de 1000ms. |
| **Límite de Payload (maxHttpBufferSize)** | **CUMPLIDO (100%)** | `server.js:L12` | Restricción de 100 KB por paquete. |
| **Sanitización Stored XSS en Textos** | **CUMPLIDO (100%)** | `CanvasEngine.js:L142` | Renderizado nativo con `ctx.fillText()` (no HTML/DOM). |
| **Cabecera Content Security Policy (CSP)** | **FALTANTE (0%)** | `server.js:L15` | Falta middleware Helmet o cabeceras HTTP CSP explícitas en Express. |

---

### 1.4 Baseline de Funcionalidades y Módulo Matemático (Functional & Math Baseline)

| Funcionalidad Especificada | Estado en Código | Ubicación en Código | Hallazgos / Brechas Identificadas |
| --- | --- | --- | --- |
| **QuickShape (Detección de Formas)** | **FALTANTE (0%)** | `public/js/InputManager.js` | No se ha implementado el temporizador de 0.5s para auto-convertir trazos en círculos/rectángulos perfectos. |
| **Simplificación Geométrica RDP** | **CUMPLIDO (100%)** | `public/js/Math2D.js:L36-L84` | Algoritmo Ramer-Douglas-Peucker activo en `pointerup`. |
| **Herramienta Lazo (Lasso Selection)** | **CUMPLIDO (100%)** | `public/js/LassoTool.js:L11-L47` | Algoritmo Ray-Casting para selección de elementos. |
| **Evaluador de Funciones 2D $y=f(x)$** | **CUMPLIDO (90%)** | `public/js/MathSuite.js:L10-L30` | Evaluación por `new Function` con soporte para parámetros, pero falta conectar los Sliders dinámicos a la UI en HTML. |
| **Gestor de Capas (`LayerManager`)** | **PARCIAL (70%)** | `public/js/LayerManager.js` | El módulo existe pero no se ha enlazado completamente a la interfaz flotante en `index.html`. |

---

## 2. Plan de Acción de Correcciones e Integración (Refactoring Checklist)

Para lograr un **100% de coincidencia absoluta** entre el código fuente y todos los documentos de referencia, aplicaremos las siguientes refactorizaciones puntuales:

1. **Seguridad (HTTP CSP):** Agregar cabeceras `Content-Security-Policy` estrictas en `server.js`.
2. **Reconexión WS:** Configurar `randomizationFactor` y `reconnectionDelay` en la inicialización de Socket.io en `index.html`.
3. **Módulo de Matemáticas & Sliders UI:** Conectar `MathSuite.js` con controles deslizantes interactivos en la interfaz web `index.html`.
4. **QuickShape Engine:** Implementar el reconocedor de líneas/círculos al mantener presionado el puntero 0.5s en `InputManager.js`.
5. **Transformaciones `DOMMatrix`:** Actualizar `CanvasEngine.js` para aplicar `ctx.setTransform(matrix)` usando la matriz nativa de `Math2D.js`.

---

## 3. Plan de Commits

Procederemos a guardar este documento de auditoría en `docs/audit_code_vs_specs.md` y realizar el commit correspondiente.
