/**
 * Normalise un texte en kebab-case pour les salons textuels Discord (max 100 caractères).
 */
export function slugifyTopic(input: string): string {
  if (!input) return "sujet";
  let slug = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) slug = "sujet";
  return slug.slice(0, 100);
}
