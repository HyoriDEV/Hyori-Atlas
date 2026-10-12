import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getGlobalSettings } from "@/lib/services/settings-service";
import {
  getApprovedGalleryItems,
  getFeaturedGalleryItem,
} from "@/lib/services/gallery-service";
import { GalleryFeed } from "@/components/gallery/gallery-feed";

export const metadata: Metadata = {
  title: "Galerie Communautaire",
  description:
    "Découvrez les plus beaux paysages, scènes de rôleplay et aventures capturées par les joueurs de Hyori RP.",
};

export default async function GalleryPage() {
  const settings = await getGlobalSettings();
  if (!settings.publicGalleryEnabled) {
    notFound();
  }

  const session = await auth();
  const currentUserId = session?.user?.id;

  const [initialItems, featuredItem] = await Promise.all([
    getApprovedGalleryItems({ currentUserId }),
    getFeaturedGalleryItem(currentUserId),
  ]);

  const currentUser = session?.user
    ? {
        id: session.user.id,
        role: session.user.role,
        registrationStatus: session.user.registrationStatus,
      }
    : null;

  return (
    <div className="flex flex-col gap-8">
      {/* En-tête éditorial */}
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl tracking-tight sm:text-[40px]">
          Galerie Communautaire
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
          Les chroniques visuelles de Hyori RP. Explorez les récits, les quartiers et les scènes de rôleplay partagés par nos joueurs.
        </p>
      </div>

      {/* Flux Interactif */}
      <GalleryFeed
        initialItems={initialItems}
        featuredItem={featuredItem}
        currentUser={currentUser}
        submissionsEnabled={settings.gallerySubmissionsEnabled}
      />
    </div>
  );
}
