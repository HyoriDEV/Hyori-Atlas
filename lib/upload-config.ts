export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 Mo
export const MAX_GALLERY_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 Mo pour les screenshots HD
export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: "Format d'image non supporté (JPEG, PNG, WEBP ou GIF uniquement).",
    };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      valid: false,
      error: "L'image est trop volumineuse (10 Mo maximum).",
    };
  }

  return { valid: true };
}

export function validateGalleryImageFile(file: File): { valid: boolean; error?: string } {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return {
      valid: false,
      error: "Format d'image non supporté (JPEG, PNG ou WEBP uniquement).",
    };
  }

  if (file.size > MAX_GALLERY_UPLOAD_BYTES) {
    return {
      valid: false,
      error: "L'image est trop volumineuse (15 Mo maximum).",
    };
  }

  return { valid: true };
}
