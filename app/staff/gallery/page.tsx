import type { Metadata } from "next";
import { requireRole } from "@/lib/dal";
import { galleryRoles } from "@/lib/navigation";
import { getStaffGalleryItems } from "@/lib/services/gallery-service";
import { getGalleryCategoriesConfig } from "@/lib/gallery-category-config";
import { StaffGalleryView } from "@/components/staff/gallery/staff-gallery-view";

export const metadata: Metadata = {
  title: "Modération de la Galerie",
};

export default async function StaffGalleryPage() {
  const user = await requireRole(galleryRoles);

  const [items, categories] = await Promise.all([
    getStaffGalleryItems(),
    getGalleryCategoriesConfig(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <StaffGalleryView
        initialItems={items}
        currentUserId={user.id}
        currentUserRole={user.role}
        categories={categories}
      />
    </div>
  );
}
