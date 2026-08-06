# Especificación Funcional Exhaustiva (Feature Requirements Baseline)

**Proyecto:** Interactive Canvas (Pizarra Infinito-Bidireccional en Tiempo Real)  
**Inspiración & Benchmarking:** Procreate, Ibis Paint X, Figma, Concepts, Excalidraw  
**Paradigma:** *Local-First / P2P Real-Time Infinite Vector Canvas*

---

## 1. Módulo de Herramientas de Dibujo y Pinceles (Brush & Drawing Engine)

### 1.1 Tipos de Pinceles y Modos de Trazo
1. **Pluma / Pincel Estándar (Ink Pen):**
   * Trazo opaco vectorial con curvas Bézier suavizadas (Catmull-Rom spline smoothing).
   * Variación dinámica de grosor según velocidad de trazo o presión del puntero (`pointerevent.pressure`).
2. **Resaltador / Marcador (Highlighter):**
   * Trazo semitransparente con modo de mezcla `multiply` o `source-over` con alfa constante (30-50%).
   * Formato de punta plana/cuadrada o redonda.
3. **Borrador Inteligente (Eraser Engine):**
   * *Modo Borrador de Trazo Completo (Stroke Eraser):* Elimina la entidad completa con un solo toque (estilo Figma/Excalidraw).
   * *Modo Borrador Píxel/Geométrico (Area Eraser):* Divide o recorta los trazos vectoriales en la intersección del borrador.
4. **Herramienta de Formas Perfectas (QuickShape - Inspirado en Procreate):**
   * Al dibujar un trazo y mantener presionado el puntero inmóvil al final por 0.5 segundos, el sistema auto-detecta y convierte el trazo mano alzada en una forma geométrica perfecta (Línea recta, Círculo, Elipse, Rectángulo, Triángulo o Polígono).
5. **Herramienta de Relleno de Color (Bucket Fill / Flood Fill):**
   * Algoritmo de relleno vector/bóster para cerrar áreas delimitadas por trazos.

### 1.2 Paleta y Control de Color
* **Selector de Color (Color Picker):** Rueda cromática HSV/RGB, regulador de opacidad (Hex + RGBA).
* **Cuentagotas (Eyedropper Tool):** Muestreo en tiempo real del color bajo el puntero en coordenadas de mundo.
* **Paletas de Acceso Rápido:** Guardado local en IndexedDB de paletas personalizadas y swatches recientes.

---

## 2. Motor Espacial y Manipulación de Escena (Viewport & Camera Engine)

### 2.1 Navegación e Infinitud 2D
* **Navegación Fluida (Pan & Infinite Scroll):** Desplazamiento 2D continuo sin límites de bordes ($X \in [-\infty, +\infty], Y \in [-\infty, +\infty]$).
* **Zoom Continuo (Pinch-to-Zoom / Wheel Zoom):** Zoom dinámico desde $10\%$ hasta $5,000\%$ enfocado en el punto del cursor/puntero.
* **Botón Recentrar / Reset Vista (Home Camera):** Restablece la cámara al origen $(0,0)$ a escala $100\%$.
* **Minimapa / Vista General de Cámara (Minimap Overview):** Cuadro de navegación en la esquina inferior para salto rápido de coordenadas.

### 2.2 Rejilla y Guías de Dibujo (Grid & Snap System)
* **Modos de Rejilla Infinito:** Rejilla de puntos (Dot Grid), Rejilla cuadrada (Graph Grid), Isométrica y Perspectiva.
* **Ajuste a la Rejilla (Grid Snapping):** Alineación opcional de vértices al dibujo a la cuadrícula.

---

## 3. Capas y Grafo de Escena (Layer & Object Management)

### 3.1 Sistema de Capas (Inspirado en Procreate e Ibis Paint)
* **Gestión de Capas ilimitadas:** Crear, renombrar, reordenar (drag & drop), duplicar, eliminar y combinar capas (*Merge Down*).
* **Controles por Capa:** Visibilidad (Show/Hide), Bloqueo de capa (Lock/Unlock), Opacidad global de capa (0-100%).
* **Sincronización de Capas en Tiempo Real:** El `layerId` y `zIndex` se transmiten vía WebSocket para mantener la coherencia espacial entre dispositivos.

### 3.2 Selección y Transformación de Objetos (Lasso & Transform)
* **Herramienta Lazo (Lasso Selection):** Selección mano alzada de múltiples trazos o textos.
* **Manipulación de Selección:** Traslación (Drag), Escala (Bounding Box handles), Rotación y Reflejo (Flip H/V).
* **Acciones en Lote:** Duplicar selección, Cambiar color/grosor en lote, Borrar selección.

---

## 4. Herramientas de Texto y Multimedia (Rich Annotations)

* **Inserción de Texto Vectorial:** Edición de texto rich en cualquier punto del lienzo con tipografía configurable, tamaño en Espacio de Mundo, alineación y color.
* **Imágenes y Stickers (Image Canvas Drag-and-Drop):** Importación de imágenes PNG/JPG/WebP/SVG. Redimensionamiento y posicionamiento vectorial.
* **Lienzo de Tarjetas / Sticky Notes:** Notas adhesivas cuadradas con texto para lluvia de ideas.

---

## 5. Sincronización P2P, Colaboración y Emparejamiento por QR (Multi-Device Engine)

### 5.1 Emparejamiento Ultra-Rápido sin Registro
* **Generación de Sala QR Instantánea:** Creación de sesión con 1 solo clic. Renderizado de código QR vectorial en pantalla.
* **Modo "Tableta Digitalizadora" (Mobile Input Pad):** Modos de vista optimizados para el teléfono (modo dibujo puro con UI minimizada para maximizar superficie táctil).
* **Proyección de Punteros en Tiempo Real (Live Cursors):** Visualización del puntero/cursor de los demás usuarios o dispositivos conectados en la sala con etiqueta con nombre/color.

### 5.2 Control de Estado, Historial y Deshacer (Undo/Redo & History)
* **Historial Descentralizado (Local-First History Stack):** Deshacer (`Ctrl+Z`) y Rehacer (`Ctrl+Y`) local por cliente.
* **Persistencia Integrada (IndexedDB Auto-Save):** Guardado automático transparente en cada trazo completado. Cero pérdida de trabajo al cerrar el navegador.

---

## 6. Exportación y Salida (Export Engine)

* **Exportación PNG / JPEG / WEBP:** Exportación con fondo transparente o sólido. Selección de área o exportación de lienzo completo (*Export All Bounds*).
* **Exportación Vectorial SVG:** Exportación pura en código SVG manteniendo la calidad infinita.
* **Exportación de Archivo de Proyecto (`.canvas` / JSON):** Respaldar y restaurar la sesión completa offline.

---

## 7. Plan de Commits

Procederemos a guardar esta especificación detallada en la carpeta `docs/` del repositorio y realizar el commit correspondiente.
