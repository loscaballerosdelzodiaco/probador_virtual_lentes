export type CameraAccessResult =
  | { ok: true; stream: MediaStream }
  | { ok: false; reason: 'denied' | 'unavailable' }

function denialReason(error: unknown): 'denied' | 'unavailable' {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'denied'
  }
  return 'unavailable'
}

export async function requestCameraAccess(): Promise<CameraAccessResult> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return { ok: false, reason: 'unavailable' }
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: false,
    })
    return { ok: true, stream }
  } catch (error: unknown) {
    return { ok: false, reason: denialReason(error) }
  }
}

export function stopCamera(stream: MediaStream | null | undefined): void {
  if (!stream) return
  for (const track of stream.getTracks()) {
    track.stop()
  }
}
