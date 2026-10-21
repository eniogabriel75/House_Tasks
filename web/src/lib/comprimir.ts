import imageCompression from 'browser-image-compression'

// Reduz a foto no próprio aparelho antes de enviar (rápido no 4G e poupa o 1 GB gratuito)
export function comprimirFoto(arquivo: File): Promise<File> {
  return imageCompression(arquivo, {
    maxSizeMB: 0.6,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    fileType: 'image/jpeg',
  })
}
