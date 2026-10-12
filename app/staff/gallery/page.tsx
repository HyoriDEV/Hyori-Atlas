import type { Metadata } from "next";
import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/generated/prisma/enums";
import { getStaffGalleryItems } from "@/lib/services/gallery-service";
import { StaffGalleryView } from "@/components/staff/gallery/staff-gallery-view";

export const metadata: Metadata = {
  title: "Modération de la Galerie",
};

export default async function StaffGalleryPage() {
  // Règle stricte : Seuls les administrateurs ont accès à la modération de la galerie
  const user = await requireRole([Role.ADMIN]);

  const items = await getStaffGalleryItems();

  return (
    <div className="flex flex-col gap-6">
      <StaffGalleryView initialItems={items} currentUserId={user.id} />
    </div>
  );
}
