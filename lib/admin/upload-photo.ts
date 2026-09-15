import { createBrowserSupabase } from '@/lib/supabase/browser';
import { resizeImage } from './resize-image';

/**
 * Resizes a photo on the device (max 1200px, JPEG) and uploads it to the restaurant's folder in
 * the item-photos bucket, signed in as the owner; Storage policies reject any other folder.
 * Returns the public URL, which a server action then saves on the item or restaurant.
 */
export async function uploadPhoto(restaurantId: string, name: string, file: File): Promise<string> {
  const photo = await resizeImage(file);
  const path = `${restaurantId}/${name}-${Date.now()}.jpg`;
  const storage = createBrowserSupabase().storage.from('item-photos');
  const { error } = await storage.upload(path, photo, { contentType: 'image/jpeg' });
  if (error) throw error;
  return storage.getPublicUrl(path).data.publicUrl;
}
