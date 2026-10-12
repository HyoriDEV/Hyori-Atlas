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

const CONFIG_PATH = path.join(process.cwd(), "config", "gallery-categories.json");

export async function getGalleryCategoriesConfig(): Promise<GalleryCategoryItemConfig[]> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf-8");
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
    // Return defaults if file doesn't exist
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
  const dir = path.dirname(CONFIG_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(categories, null, 2), "utf-8");
}

export async function getGalleryCategoryLabelsMap(): Promise<Record<GalleryCategory, string>> {
  const categories = await getGalleryCategoriesConfig();
  const map: Record<string, string> = {};
  for (const c of categories) {
    map[c.id] = c.label;
  }
  return map as Record<GalleryCategory, string>;
}
