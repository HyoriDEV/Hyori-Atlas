import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getGlobalSettings } from "@/lib/services/settings-service";
import { getApprovedGalleryItems } from "@/lib/services/gallery-service";
import {
  getActiveGalleryCategories,
  getGalleryCategoryLabelsMap,
} from "@/lib/gallery-category-config";
import { GalleryFeed } from "@/components/gallery/gallery-feed";
import { GalleryUploadDialog } from "@/components/gallery/gallery-upload-dialog";

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

  const [initialItems, categories, categoryLabels] = await Promise.all([
    getApprovedGalleryItems({ currentUserId }),
    getActiveGalleryCategories(),
    getGalleryCategoryLabelsMap(),
  ]);

  const currentUser = session?.user
    ? {
        id: session.user.id,
        role: session.user.role,
        registrationStatus: session.user.registrationStatus,
      }
    : null;

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête standard */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold">Galerie</h1>
        <GalleryUploadDialog
          currentUser={currentUser}
          submissionsEnabled={settings.gallerySubmissionsEnabled}
          categories={categories}
        />
      </div>

      {/* Flux épuré */}
      <GalleryFeed
        initialItems={initialItems}
        currentUser={currentUser}
        categories={categories}
        categoryLabels={categoryLabels}
      />
    </div>
  );
}
