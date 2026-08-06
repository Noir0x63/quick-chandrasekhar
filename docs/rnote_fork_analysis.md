# Evaluación de Viabilidad Técnica: Fork de Rnote vs. Desarrollo Web Custom desde Cero

**Proyecto:** Interactive Canvas (Pizarra Infinito-Bidireccional en Tiempo Real)  
**Pregunta:** ¿Es conveniente bifurcar (*forkear*) la aplicación madura **Rnote** (escrita en Rust/GTK4) e integrarle nuestras funcionalidades en lugar de construir un software web desde cero?

---

## 1. Análisis del Proyecto Rnote

### ¿Qué es Rnote?
Rnote es una aplicación nativa excelente para tomar notas y dibujar en formato vectorial de lienzo infinito, escrita en **Rust** usando la biblioteca de interfaz gráfica **GTK4 / Libadwaita**.

### Fortalezas de Rnote:
- **Madurez Gráfica y Rendimiento:** Excelente motor vectorial en Rust con soporte para tabletas digitalizadoras (Wacom, Stylus pressure/tilt) y exportación PDF/SVG.
- **Formas y Trazo:** Suavizado de líneas nativo de muy alta calidad.

---

## 2. Matriz Comparativa: Rnote Fork vs. Software Web Custom (SAD v2.0)

| Criterio de Evaluación | Fork de Rnote (Rust / GTK4) | Software Web Custom (ES6+ / WebSockets / HTML5) |
| --- | --- | --- |
| **Arquitectura de Sincronización P2P en Tiempo Real** | **MUY COMPLEJO ($3\times - 5\times$ Esfuerzo)**<br>GTK4 es una app de escritorio mono-usuario. Habría que integrar hilos de red async en Rust (`tokio`/`tungstenite`), serialización `serde` de todo el documento y abstraer eventos de entrada GTK. | **NATIVO (100% Integrado)**<br>WebSockets (Socket.io) y el modelo de eventos JS nacieron para tiempo real y streaming de deltas a 60 Hz. |
| **Experiencia de Emparejamiento por Código QR (Mobile <-> PC)** | **DIFÍCIL O INVIABLE EN MÓVILES (iOS/Safari)**<br>Rnote requiere compilación nativa en GTK4. **No corre de forma nativa en navegadores móbiles iOS (Safari/iPhone)** sin emulación WebAssembly pesada. | **CERO FRICCIÓN (Instantáneo)**<br>Cualquier smartphone (iOS/Android) abre la URL al escanear el QR en 0.5s sin instalar nada. |
| **Paradigma Local-First & Zero-Trust Relay** | **COMPLEJO**<br>El formato de archivo de Rnote es un archivo `.rnote` comprimido monolítico en disco, no diseñado para sincronización incremental delta por delta. | **NATIVO**<br>IndexedDB (`idb-keyval`) almacena objetos planos JSON independientes sincronizables por chunks. |
| **Portabilidad y Despliegue** | Requiere empaquetado Flatpak/AppImage/Windows exe nativo. | 100% ejecutable en cualquier navegador web en cualquier sistema operativo. |
| **Modelado Matemático e Interactivad (Math Suite)** | Integración gráfica en GTK4 requiere librerías C++/Rust de renderizado. | Integración directa con LaTeX, MathJax/KaTeX y HTML5 Sliders. |

---

## 3. Principales Riesgos y Friction Points al Forkear Rnote

1. **Incompatibilidad con el Requerimiento de "Cero Fricción por QR":**
   * El objetivo de tu proyecto es que un usuario en la PC genere un QR y desde su **teléfono móvil** lo escanee para usar el smartphone como tableta digitalizadora.
   * Si usas Rnote (GTK4/Rust), el teléfono no podrá abrir la app simplemente navegando a una URL. Tendría que tener la app nativa instalada o compilar GTK para WebAssembly (lo cual es experimental, pesado en Megabytes y tiene serios problemas de rendimiento en móviles).

2. **Dificultad para Sincronización Colaborativa P2P:**
   * Las aplicaciones de escritorio tradicionales como Rnote modelan la estructura del documento como un árbol de objetos local en memoria.
   * Convertir un software mono-usuario en una arquitectura *Event-Driven Real-Time* basada en **Relojes Lógicos de Lamport** exige reestructurar todo el núcleo interno del motor de Rnote.

---

## 4. Veredicto y Recomendación Técnica

> [!TIP]
> **RECOMENDACIÓN FINAL:**
> * **NO se recomienda forkear Rnote** para este caso de uso específico, debido al choque fundamental entre el paradigma de **App Nativa de Escritorio Mono-Usuario (Rust/GTK)** y el requerimiento clave de **Pizarra Web Colaborativa Multidispositivo por QR (Zero-Friction Web)**.
> * **Continuar con la Arquitectura Web Custom (Local-First / Event-Driven):** Tu diseño web actual en JavaScript ES6+ / HTML5 Canvas / IndexedDB / Socket.io es infinitamente superior para lograr la **latencia ultra baja, emparejamiento QR instantáneo en teléfonos y despliegue sin instalación**.
> * **¿Qué SÍ podemos tomar de Rnote?:** Podemos inspirarnos en los algoritmos de Rnote (como su sistema de curvas Bézier, renderizado de rejillas e interfaz minimalista), portando esos conceptos matemáticos en limpio a nuestro motor `CanvasEngine.js` en JS.
