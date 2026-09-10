export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 Mo
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
