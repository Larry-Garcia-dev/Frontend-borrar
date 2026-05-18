import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const DEFAULT_WATERMARK_TEXT = 'macondo-ia.com';

interface WatermarkOptions {
  text?: string;
  opacity?: number;
  fontSize?: number;
  position?: 'center' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

/**
 * Servicio para aplicar marca de agua a las imagenes generadas
 */
export class WatermarkService {
  /**
   * Aplica marca de agua a una imagen
   * @param inputPath Ruta de la imagen original
   * @param outputPath Ruta donde guardar la imagen con marca de agua (opcional, sobrescribe si no se proporciona)
   * @param options Opciones de la marca de agua
   */
  static async applyWatermark(
    inputPath: string,
    outputPath?: string,
    options: WatermarkOptions = {}
  ): Promise<string> {
    const {
      text = DEFAULT_WATERMARK_TEXT,
      opacity = 0.6,
      position = 'center',
    } = options;

    console.log('[watermark-service] Applying watermark to:', inputPath);
    console.log('[watermark-service] Watermark text:', text);
    console.log('[watermark-service] Position:', position);

    // Leer la imagen original
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    if (!metadata.width || !metadata.height) {
      throw new Error('No se pudo obtener las dimensiones de la imagen');
    }

    const width = metadata.width;
    const height = metadata.height;
    
    // Calcular tamaño de fuente basado en el tamaño de la imagen
    const fontSize = options.fontSize || Math.max(Math.floor(width / 20), 24);
    const textWidth = text.length * fontSize * 0.6;
    const padding = 20;
    const boxWidth = Math.floor(textWidth + padding * 2);
    const boxHeight = Math.floor(fontSize + padding);

    // Calcular posicion
    let x: number, y: number;
    switch (position) {
      case 'bottom-right':
        x = width - boxWidth - 20;
        y = height - boxHeight - 20;
        break;
      case 'bottom-left':
        x = 20;
        y = height - boxHeight - 20;
        break;
      case 'top-right':
        x = width - boxWidth - 20;
        y = 20;
        break;
      case 'top-left':
        x = 20;
        y = 20;
        break;
      case 'center':
      default:
        x = Math.floor((width - boxWidth) / 2);
        y = Math.floor((height - boxHeight) / 2);
        break;
    }

    // Crear SVG con la marca de agua
    const svgWatermark = `
      <svg width="${width}" height="${height}">
        <rect 
          x="${x}" 
          y="${y}" 
          width="${boxWidth}" 
          height="${boxHeight}" 
          fill="rgba(0, 0, 0, ${opacity})" 
          rx="5"
        />
        <text 
          x="${x + boxWidth / 2}" 
          y="${y + boxHeight / 2 + fontSize / 3}" 
          font-family="Arial, sans-serif" 
          font-size="${fontSize}" 
          font-weight="bold" 
          fill="rgba(255, 255, 255, 0.9)" 
          text-anchor="middle"
        >${text}</text>
      </svg>
    `;

    // Aplicar la marca de agua
    const finalPath = outputPath || inputPath;
    
    await image
      .composite([{
        input: Buffer.from(svgWatermark),
        top: 0,
        left: 0,
      }])
      .toFile(finalPath + '.tmp');

    // Reemplazar el archivo original
    fs.renameSync(finalPath + '.tmp', finalPath);

    console.log('[watermark-service] Watermark applied successfully to:', finalPath);
    return finalPath;
  }

  /**
   * Aplica marca de agua a multiples imagenes
   */
  static async applyWatermarkBatch(
    imagePaths: string[],
    options: WatermarkOptions = {}
  ): Promise<string[]> {
    console.log('[watermark-service] Applying watermark to', imagePaths.length, 'images');
    
    const results: string[] = [];
    for (const imagePath of imagePaths) {
      try {
        const result = await this.applyWatermark(imagePath, undefined, options);
        results.push(result);
      } catch (error: any) {
        console.error('[watermark-service] Error applying watermark to:', imagePath, error.message);
        // Continuar con las demas imagenes
        results.push(imagePath);
      }
    }
    
    return results;
  }
}
