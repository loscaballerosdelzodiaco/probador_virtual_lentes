export const TRYON_MESSAGES = {
  // A2: la cámara no detecta el rostro
  faceNotDetected:
    'No se detecta tu rostro, colócate frente a la cámara con buena iluminación',
  // E1: la imagen no tiene rostro o no es válida
  invalidImage:
    'La imagen no es válida, sube una fotografía donde se vea tu rostro',
  // E2: permiso de cámara denegado o cámara no disponible
  cameraUnavailable:
    'No se pudo acceder a la cámara, puedes subir una fotografía',
  // E3: archivo no compatible o demasiado grande
  unsupportedFormat: 'Formato no compatible, sube una imagen JPG o PNG',
  // Aviso extra (no es de la HU3): rostro de lado
  faceTurned:
    'Mira de frente. El aro de prueba solo se muestra de frente, sin las patas.',
  captureFailed: 'No se pudo capturar el resultado. Inténtalo de nuevo.',
} as const

/** Textos de los estados de carga (no son errores). */
export const TRYON_STATUS_TEXT = {
  loadingCamera: 'Iniciando la cámara…',
  loadingPhoto: 'Procesando la foto…',
} as const
