/**
 * Client-side image URL helper.
 * NO encryption keys, NO shabakaty domains — just simple URL construction.
 */

/**
 * Returns a proxy image URL for the given image field.
 * - If the field is already a proxied URL (/api/...), returns it as-is.
 * - If it's a plain filename, constructs /api/img?type=...&file=...
 * - If null/undefined, returns empty string.
 */
export function getImageUrl(
  imgField: string | undefined | null,
  type: 'poster' | 'cover' = 'poster'
): string {
  if (!imgField) return '';
  // Already a proxied/rewritten URL from sanitized server data
  if (imgField.startsWith('/api/') || imgField.startsWith('/tunnel/')) return imgField;
  if (imgField.startsWith('http')) {
      try {
          const parsed = new URL(imgField);
          return `/tunnel${parsed.pathname}${parsed.search}`;
      } catch {
          const basePath = type === 'poster' ? '/vascin-poster-images/' : '/vascin-cover-images/';
          return `/tunnel${basePath}${encodeURIComponent(imgField.split('/').pop() || imgField)}`;
      }
  }
  // Plain filename — construct the simple proxy URL
  const basePath = type === 'poster' ? '/vascin-poster-images/' : '/vascin-cover-images/';
  return `/tunnel${basePath}${encodeURIComponent(imgField)}`;
}

/**
 * Returns the best available image URL from a video object.
 * Prefers imgObjUrl (already sanitized by server) over img filename.
 */
export function getVideoImageUrl(
  video: { img?: string; imgObjUrl?: string; imgMediumThumb?: string; imgThumb?: string },
  type: 'poster' | 'cover' = 'poster'
): string {
  // imgObjUrl is already sanitized by the server to /api/img?ref=...
  if (video.imgObjUrl && (video.imgObjUrl.startsWith('/api/') || video.imgObjUrl.startsWith('/tunnel/'))) {
    return video.imgObjUrl;
  }
  
  // For grid posters, prefer lightweight thumbnails to save bandwidth
  if (type === 'poster') {
    const img = video.imgMediumThumb || video.imgThumb || video.img;
    return getImageUrl(img, type);
  }
  
  // For covers (like HeroCarousel), prefer high-res
  const img = video.img || video.imgMediumThumb || video.imgThumb;
  return getImageUrl(img, type);
}
