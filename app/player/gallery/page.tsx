import type { Metadata } from "next";
import { requireActivePlayer } from "@/lib/dal";
import { RegistrationStatus, Role } from "@/lib/generated/prisma/enums";
import { isRegistrationStatusAtLeast } from "@/lib/navigation";
import { LockedFeatureCard } from "@/components/locked-feature-card";
import { getPlayerGalleryItems } from "@/lib/services/gallery-service";
import { getGlobalSettings } from "@/lib/services/settings-service";
import {
  getActiveGalleryCategories,
  getGalleryCategoryLabelsMap,
} from "@/lib/gallery-category-config";
import { PlayerGalleryView } from "@/components/player/player-gallery-view";

export const metadata: Metadata = {
  title: "Mes captures",
};

export default async function PlayerGalleryPage() {
  const user = await requireActivePlayer();
  const settings = await getGlobalSettings();

  const isWhitelisted =
    user.role === Role.ADMIN ||
    isRegistrationStatusAtLeast(user.registrationStatus, RegistrationStatus.WHITELISTED);

  if (!isWhitelisted) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
        <h1 className="font-heading shrink-0 text-2xl font-semibold">Mes captures</h1>
        <LockedFeatureCard description="Le partage de captures d'écran est débloqué une fois ton inscription acceptée à la whitelist." />
      </div>
    );
  }

  const [items, categories, categoryLabels] = await Promise.all([
    getPlayerGalleryItems(user.id),
    getActiveGalleryCategories(),
    getGalleryCategoryLabelsMap(),
  ]);

  const currentUser = {
    id: user.id,
    role: user.role,
    registrationStatus: user.registrationStatus,
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <PlayerGalleryView
        items={items}
        currentUser={currentUser}
        submissionsEnabled={settings.gallerySubmissionsEnabled}
        categories={categories}
        categoryLabels={categoryLabels}
      />
    </div>
  );
}
