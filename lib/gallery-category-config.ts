import fs from "fs/promises";
import path from "path";
import { GalleryCategory } from "@/lib/generated/prisma/enums";

export interface GalleryCategoryItemConfig {
  id: GalleryCategory;
  label: string;
  enabled: boolean;
}

export const DEFAULT_GALLERY_CATEGORIES: GalleryCategoryItemConfig[] = [
  { id: GalleryCategory.PAYSAGE, label: "Paysage", enabled: true },
  { id: GalleryCategory.SCENE_RP, label: "Scène RP", enabled: true },
  { id: GalleryCategory.PORTRAIT, label: "Portrait", enabled: true },
  { id: GalleryCategory.ARCHITECTURE, label: "Architecture", enabled: true },
  { id: GalleryCategory.EVENEMENT, label: "Événement", enabled: true },
];

const PRIMARY_CONFIG_PATH = path.join(
  process.cwd(),
  "public",
  "uploads",
  "config",
  "gallery-categories.json"
);
const LEGACY_CONFIG_PATH = path.join(process.cwd(), "config", "gallery-categories.json");

export async function getGalleryCategoriesConfig(): Promise<GalleryCategoryItemConfig[]> {
  for (const filePath of [PRIMARY_CONFIG_PATH, LEGACY_CONFIG_PATH]) {
    try {
      const raw = await fs.readFile(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Merge with defaults to ensure all enum values exist
        return DEFAULT_GALLERY_CATEGORIES.map((def) => {
          const found = parsed.find((p) => p.id === def.id);
          return found
            ? { id: def.id, label: found.label?.trim() || def.label, enabled: found.enabled ?? true }
            : def;
        });
      }
    } catch {
      // Continue to next path or return defaults
    }
  }
  return DEFAULT_GALLERY_CATEGORIES;
}

export async function getActiveGalleryCategories(): Promise<GalleryCategoryItemConfig[]> {
  const all = await getGalleryCategoriesConfig();
  const active = all.filter((c) => c.enabled);
  return active.length > 0 ? active : DEFAULT_GALLERY_CATEGORIES;
}

export async function saveGalleryCategoriesConfig(
  categories: GalleryCategoryItemConfig[]
): Promise<void> {
  const data = JSON.stringify(categories, null, 2);
  let saved = false;

  // 1. Sauvegarder dans le chemin persistant monté (public/uploads/config)
  try {
    const dir = path.dirname(PRIMARY_CONFIG_PATH);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(PRIMARY_CONFIG_PATH, data, "utf-8");
    saved = true;
  } catch (err) {
    console.error("[GALLERY_CONFIG] Échec sauvegarde sur chemin persistant:", err);
  }

  // 2. Tenter également sur l'ancien chemin (config/) si les droits le permettent
  try {
    const dir = path.dirname(LEGACY_CONFIG_PATH);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(LEGACY_CONFIG_PATH, data, "utf-8");
    saved = true;
  } catch {
    // Ignorer si le conteneur ne permet pas d'écrire à la racine /app
  }

  if (!saved) {
    throw new Error("Impossible d'enregistrer la configuration des catégories de la galerie.");
  }
}

export async function getGalleryCategoryLabelsMap(): Promise<Record<GalleryCategory, string>> {
  const categories = await getGalleryCategoriesConfig();
  const map: Record<string, string> = {};
  for (const c of categories) {
    map[c.id] = c.label;
  }
  return map as Record<GalleryCategory, string>;
}
