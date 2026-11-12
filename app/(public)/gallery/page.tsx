import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { getGlobalSettings } from "@/lib/services/settings-service";
import { getApprovedGalleryItems, getGalleryItemById } from "@/lib/services/gallery-service";
import {
  getActiveGalleryCategories,
  getGalleryCategoryLabelsMap,
} from "@/lib/gallery-category-config";
import { GalleryFeed, GalleryGridSize } from "@/components/gallery/gallery-feed";
import { getServerPagePrefs } from "@/lib/table-preferences";

interface GalleryPageProps {
  searchParams: Promise<{ photo?: string }>;
}

export async function generateMetadata({ searchParams }: GalleryPageProps): Promise<Metadata> {
  const { photo: photoId } = await searchParams;

  if (photoId) {
    try {
      const [settings, photo] = await Promise.all([
        getGlobalSettings(),
        getGalleryItemById(photoId),
      ]);

      if (settings.publicGalleryEnabled && photo && photo.status === "APPROVED") {
        const rawBaseUrl = process.env.NEXTAUTH_URL;
        const baseUrl =
          rawBaseUrl && !rawBaseUrl.includes("localhost")
            ? rawBaseUrl.replace(/\/$/, "")
            : "https://hyori-rp.fr";

        const imageUrl =
          photo.imageUrl.startsWith("http://") || photo.imageUrl.startsWith("https://")
            ? photo.imageUrl
            : `${baseUrl}${photo.imageUrl.startsWith("/") ? "" : "/"}${photo.imageUrl}`;

        const authorName =
          photo.author?.characterName ||
          photo.author?.minecraftUsername ||
          photo.author?.discordDisplayName ||
          "un joueur";

        const prefix = photo.isSpoiler ? "[SPOILER] " : "";
        const title = `${prefix}${photo.title ? `${photo.title} — Galerie Hyori` : "Galerie Hyori"}`;
        const description =
          photo.description?.trim() ||
          `Photo partagée par ${authorName} sur Hyori RP.${photo.location ? ` Lieu : ${photo.location}.` : ""}`;

        return {
          title,
          description,
          openGraph: {
            title,
            description,
            url: `${baseUrl}/gallery?photo=${photo.id}`,
            siteName: "Hyori RP",
            type: "article",
            images: [
              {
                url: imageUrl,
                ...(photo.width ? { width: photo.width } : {}),
                ...(photo.height ? { height: photo.height } : {}),
                alt: photo.title || "Photo de la galerie Hyori",
              },
            ],
          },
          twitter: {
            card: "summary_large_image",
            title,
            description,
            images: [imageUrl],
          },
        };
      }
    } catch {
      // Repli sur les métadonnées par défaut en cas d'erreur
    }
  }

  return {
    title: "Galerie",
    description: "Explorez les photos et captures de la communauté Hyori RP.",
  };
}

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
