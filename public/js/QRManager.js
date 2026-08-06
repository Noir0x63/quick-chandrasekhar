import QRCode from '../node_modules/qrcode/lib/browser.js';

/**
 * QRManager.js - Generador Local y 100% preciso de Códigos QR.
 */
export class QRManager {
  /**
   * Genera un Canvas o SVG con un código QR legible y bien codificado.
   * @param {string} text 
   * @param {HTMLElement} container 
   */
  static async renderQR(text, container) {
    try {
      container.innerHTML = '';
      const canvas = document.createElement('canvas');
      await QRCode.toCanvas(canvas, text, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      container.appendChild(canvas);
    } catch (err) {
      console.error('[QRManager] Error generando QR:', err);
      container.innerHTML = `<p style="color:red; font-size:12px;">Error generando QR</p>`;
    }
  }
}
