/**
 * Calidad mínima de una foto de receta.
 *
 * El proyecto no incluye OCR ni un detector clínico. Esta capa estima si
 * la imagen se puede leer con tres medidas sobre una miniatura:
 * nitidez (Laplaciano), brillo medio y contraste.
 *
 * Limitaciones:
 * - No lee el texto de la receta; una foto nítida de una hoja en blanco pasa.
 * - Un recorte muy pequeño o un PDF no se evalúan igual. El PDF no se
 *   rasteriza aquí, así que la calidad automática aplica solo a JPG/PNG/WEBP.
 * - Umbrales empíricos: pueden rechazar fotos válidas con poca luz o
 *   aceptar fotos borrosas con bordes fuertes.
 */
import { validarDocumentoBytes } from './documentoValidation'

export const DOCUMENTO_CALIDAD_INSUFICIENTE = 'calidad_insuficiente' as const

export const DOCUMENTO_CALIDAD_BORROSA_MESSAGE =
  'La foto está borrosa. Enfoca la receta y carga una imagen nueva.'

export const DOCUMENTO_CALIDAD_OSCURA_MESSAGE =
  'La foto está demasiado oscura. Mejora la luz y vuelve a tomarla.'

export const DOCUMENTO_CALIDAD_CONTRASTE_MESSAGE =
  'El texto no se distingue bien. Evita sombras y carga una imagen más clara.'

export const DOCUMENTO_CALIDAD_ILEGIBLE_MESSAGE =
  'No pudimos leer la receta en esta imagen. Carga una foto nueva, nítida y bien iluminada.'

export type MotivoCalidad = 'borrosa' | 'oscura' | 'bajo_contraste' | 'ilegible'

export type ResultadoCalidad =
  | { ok: true }
  | { ok: false; estado: typeof DOCUMENTO_CALIDAD_INSUFICIENTE; motivo: MotivoCalidad; error: string }

export type MetricasCalidad = {
  brillo: number
  contraste: number
  nitidez: number
}

export const UMBRAL_BRILLO_MIN = 42
export const UMBRAL_CONTRASTE_MIN = 18
export const UMBRAL_NITIDEZ_MIN = 10
export const MAX_LADO_ANALISIS = 480

export function grisDesdeRgba(rgba: Uint8ClampedArray, width: number, height: number): Uint8Array {
  const gray = new Uint8Array(width * height)
  for (let i = 0, p = 0; i < gray.length; i += 1, p += 4) {
    gray[i] = Math.round(rgba[p] * 0.299 + rgba[p + 1] * 0.587 + rgba[p + 2] * 0.114)
  }
  return gray
}

export function medirCalidadPixels(
  gray: Uint8Array,
  width: number,
  height: number,
): MetricasCalidad {
  const n = width * height
  if (n === 0 || gray.length < n) {
    return { brillo: 0, contraste: 0, nitidez: 0 }
  }

  let suma = 0
  let sumaSq = 0
  for (let i = 0; i < n; i += 1) {
    const value = gray[i]
    suma += value
    sumaSq += value * value
  }
  const brillo = suma / n
  const contraste = Math.sqrt(Math.max(0, sumaSq / n - brillo * brillo))

  let lapSum = 0
  let lapCount = 0
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x
      const lap = Math.abs(
        4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - width] - gray[i + width],
      )
      lapSum += lap
      lapCount += 1
    }
  }

  return {
    brillo,
    contraste,
    nitidez: lapCount === 0 ? 0 : lapSum / lapCount,
  }
}

export function resultadoDesdeMetricas(metricas: MetricasCalidad): ResultadoCalidad {
  if (metricas.brillo < UMBRAL_BRILLO_MIN) {
    return {
      ok: false,
      estado: DOCUMENTO_CALIDAD_INSUFICIENTE,
      motivo: 'oscura',
      error: DOCUMENTO_CALIDAD_OSCURA_MESSAGE,
    }
  }
  if (metricas.contraste < UMBRAL_CONTRASTE_MIN) {
    return {
      ok: false,
      estado: DOCUMENTO_CALIDAD_INSUFICIENTE,
      motivo: 'bajo_contraste',
      error: DOCUMENTO_CALIDAD_CONTRASTE_MESSAGE,
    }
  }
  if (metricas.nitidez < UMBRAL_NITIDEZ_MIN) {
    return {
      ok: false,
      estado: DOCUMENTO_CALIDAD_INSUFICIENTE,
      motivo: 'borrosa',
      error: DOCUMENTO_CALIDAD_BORROSA_MESSAGE,
    }
  }
  return { ok: true }
}

function fillGray(width: number, height: number, value: number): Uint8Array {
  return new Uint8Array(width * height).fill(value)
}

export function imagenSintetica(
  width: number,
  height: number,
  kind: 'oscura' | 'plana' | 'nitida',
): Uint8Array {
  if (kind === 'oscura') return fillGray(width, height, 18)
  if (kind === 'plana') return fillGray(width, height, 140)
  const gray = new Uint8Array(width * height)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      gray[y * width + x] = (x + y) % 2 === 0 ? 20 : 235
    }
  }
  return gray
}

function rasterizarImagen(image: CanvasImageSource, width: number, height: number): ImageData {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    throw new Error(DOCUMENTO_CALIDAD_ILEGIBLE_MESSAGE)
  }
  context.drawImage(image, 0, 0, width, height)
  return context.getImageData(0, 0, width, height)
}

async function decodificarImagen(file: File): Promise<CanvasImageSource> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file)
    } catch {
      // Fallback a HTMLImageElement.
    }
  }

  const url = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const node = new Image()
      node.onload = () => resolve(node)
      node.onerror = () => reject(new Error(DOCUMENTO_CALIDAD_ILEGIBLE_MESSAGE))
      node.src = url
    })
    return image
  } finally {
    URL.revokeObjectURL(url)
  }
}

function dimensionesFuente(source: CanvasImageSource): { width: number; height: number } {
  if ('naturalWidth' in source && typeof source.naturalWidth === 'number' && source.naturalWidth > 0) {
    return { width: source.naturalWidth, height: source.naturalHeight as number }
  }
  if ('width' in source && typeof source.width === 'number') {
    const width = source.width
    const height = 'height' in source && typeof source.height === 'number' ? source.height : 0
    return { width, height }
  }
  return { width: 0, height: 0 }
}

export async function evaluarCalidadArchivo(file: File): Promise<ResultadoCalidad> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const formato = validarDocumentoBytes({ bytes, fileName: file.name })
  if (!formato.ok) {
    return {
      ok: false,
      estado: DOCUMENTO_CALIDAD_INSUFICIENTE,
      motivo: 'ilegible',
      error: formato.error,
    }
  }

  if (formato.kind === 'pdf') {
    return { ok: true }
  }

  try {
    const source = await decodificarImagen(file)
    const { width: sourceWidth, height: sourceHeight } = dimensionesFuente(source)
    if (sourceWidth < 8 || sourceHeight < 8) {
      return {
        ok: false,
        estado: DOCUMENTO_CALIDAD_INSUFICIENTE,
        motivo: 'ilegible',
        error: DOCUMENTO_CALIDAD_ILEGIBLE_MESSAGE,
      }
    }

    const scale = Math.min(1, MAX_LADO_ANALISIS / Math.max(sourceWidth, sourceHeight))
    const width = Math.max(8, Math.round(sourceWidth * scale))
    const height = Math.max(8, Math.round(sourceHeight * scale))
    const imageData = rasterizarImagen(source, width, height)
    if ('close' in source && typeof source.close === 'function') {
      source.close()
    }

    const gray = grisDesdeRgba(imageData.data, width, height)
    return resultadoDesdeMetricas(medirCalidadPixels(gray, width, height))
  } catch {
    return {
      ok: false,
      estado: DOCUMENTO_CALIDAD_INSUFICIENTE,
      motivo: 'ilegible',
      error: DOCUMENTO_CALIDAD_ILEGIBLE_MESSAGE,
    }
  }
}

export class CalidadInsuficienteError extends Error {
  readonly estado = DOCUMENTO_CALIDAD_INSUFICIENTE
  readonly motivo: MotivoCalidad

  constructor(resultado: Extract<ResultadoCalidad, { ok: false }>) {
    super(resultado.error)
    this.name = 'CalidadInsuficienteError'
    this.motivo = resultado.motivo
  }
}
