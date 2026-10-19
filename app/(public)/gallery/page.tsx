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
    <main className="w-full flex-1 px-4 py-8 sm:px-6 lg:px-10 xl:px-12">
      <div className="flex flex-col gap-8">
        {/* En-tête épuré */}
        <div className="border-border/60 flex flex-wrap items-center justify-between gap-4 border-b pb-6">
          <h1 className="font-heading text-3xl tracking-tight sm:text-[40px]">Galerie</h1>
          <GalleryUploadDialog
            currentUser={currentUser}
            submissionsEnabled={settings.gallerySubmissionsEnabled}
            categories={categories}
          />
        </div>

        {/* Flux de captures */}
        <GalleryFeed
          initialItems={initialItems}
          currentUser={currentUser}
          categories={categories}
          categoryLabels={categoryLabels}
        />
      </div>
    </main>
  );
}
