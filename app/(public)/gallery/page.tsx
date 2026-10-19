import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { getGlobalSettings } from "@/lib/services/settings-service";
import { getApprovedGalleryItems } from "@/lib/services/gallery-service";
import {
  getActiveGalleryCategories,
  getGalleryCategoryLabelsMap,
} from "@/lib/gallery-category-config";
import { GalleryFeed, GalleryGridSize } from "@/components/gallery/gallery-feed";
import { getServerPagePrefs } from "@/lib/table-preferences";

export const metadata: Metadata = {
  title: "Galerie",
};

export default async function GalleryPage() {
  const settings = await getGlobalSettings();
  if (!settings.publicGalleryEnabled) {
    notFound();
  }

  const session = await auth();
  const currentUserId = session?.user?.id;

  const [initialItems, categories, categoryLabels, cookieStore] = await Promise.all([
    getApprovedGalleryItems({ currentUserId }),
    getActiveGalleryCategories(),
    getGalleryCategoryLabelsMap(),
    cookies(),
  ]);

  const savedPrefs = getServerPagePrefs(cookieStore, "/gallery");
  const initialGridSize =
    savedPrefs.galleryGridSize === "sm" ||
    savedPrefs.galleryGridSize === "md" ||
    savedPrefs.galleryGridSize === "lg"
      ? (savedPrefs.galleryGridSize as GalleryGridSize)
      : "md";

  const currentUser = session?.user
    ? {
        id: session.user.id,
        role: session.user.role,
        registrationStatus: session.user.registrationStatus,
      }
    : null;

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <GalleryFeed
        initialItems={initialItems}
        currentUser={currentUser}
        categories={categories}
        categoryLabels={categoryLabels}
        submissionsEnabled={settings.gallerySubmissionsEnabled}
        initialGridSize={initialGridSize}
      />
    </main>
  );
}
