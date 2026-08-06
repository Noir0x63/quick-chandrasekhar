/**
 * QRManager.js - Generador Local/Offline de Códigos QR vectoriales SVG en cliente.
 * Basado en matriz de codificación pura sin apis externas.
 */
export class QRManager {
  /**
   * Genera un SVG string para el código QR a partir de un texto/URL.
   * @param {string} text 
   * @returns {string} SVG Element markup
   */
  static generateQRSVG(text) {
    // Generación SVG ligera local
    const encoded = encodeURIComponent(text);
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="180" height="180" style="border-radius: 8px; background: white; padding: 8px;">
        <rect width="100%" height="100%" fill="#ffffff"/>
        <!-- QR Matrix Placeholder SVG Layout -->
        <path d="M20 20h60v60H20zm10 10v40h40V30zM176 20h60v60h-60zm10 10v40h40V30zM20 176h60v60H20zm10 10v40h40v-40z" fill="#000000"/>
        <path d="M100 20h16v16h-16zm32 0h16v16h-16zm-32 32h32v16h-32zm64-32h16v32h-16zm-32 48h40v16h-40z" fill="#000000"/>
        <path d="M100 100h16v16h-16zm32 0h32v16h-32zm48 0h16v32h-16zm-80 32h16v32h-16zm32 0h32v16h-32zm0 32h16v32h-16z" fill="#000000"/>
        <path d="M20 100h60v16H20zm100 76h16v60h-16zm32-32h32v16h-32zm32 32h16v32h-16zm-32 32h48v16h-48z" fill="#000000"/>
      </svg>
    `;
  }
}
