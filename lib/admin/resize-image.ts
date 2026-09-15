/** Photos are stored at most this wide or tall. */
export const MAX_PHOTO_SIDE = 1200;
const JPEG_QUALITY = 0.8;

/** Scales width × height to fit within max on the longer side, never enlarging. */
export function fitWithin(width: number, height: number, max = MAX_PHOTO_SIDE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/**
 * Resizes a phone photo to at most 1200px and re-encodes it as JPEG before upload, so a
 * 5MB camera shot becomes a couple of hundred KB. createImageBitmap applies the EXIF rotation.
 */
export async function resizeImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = fitWithin(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is not available');
  // JPEG has no transparency: flatten onto white so transparent logos don't turn black.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the photo'))), 'image/jpeg', JPEG_QUALITY),
  );
}
