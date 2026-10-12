"use client";

import { useState, useMemo } from "react";
import { Clock, CheckCircle, Archive, MagnifyingGlass, Images, X } from "@phosphor-icons/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  StaffGalleryReviewCard,
  StaffGalleryItem,
} from "@/components/staff/gallery/staff-gallery-review-card";
import { StaffGalleryRejectDialog } from "@/components/staff/gallery/staff-gallery-reject-dialog";
import { GalleryLightbox } from "@/components/gallery/gallery-lightbox";
import { GalleryStatus } from "@/lib/generated/prisma/enums";
import type { GalleryCategoryItemConfig } from "@/lib/gallery-category-config";

interface StaffGalleryViewProps {
  initialItems: StaffGalleryItem[];
  currentUserId: string;
  categories: GalleryCategoryItemConfig[];
}

export function StaffGalleryView({
  initialItems,
  currentUserId,
  categories,
}: StaffGalleryViewProps) {
  const items = initialItems;
  const [search, setSearch] = useState("");
  const [rejectItem, setRejectItem] = useState<StaffGalleryItem | null>(null);
  const [previewItem, setPreviewItem] = useState<StaffGalleryItem | null>(null);

  // Compteurs par statut
  const pendingItems = useMemo(
    () => items.filter((i) => i.status === GalleryStatus.PENDING),
    [items]
  );
  const approvedItems = useMemo(
    () => items.filter((i) => i.status === GalleryStatus.APPROVED),
    [items]
  );
  const rejectedItems = useMemo(
    () => items.filter((i) => i.status === GalleryStatus.REJECTED),
    [items]
  );

  const defaultTab = pendingItems.length > 0 ? "pending" : "approved";

  const filterBySearch = (list: StaffGalleryItem[]) => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((i) => {
      const author = (
        i.author.minecraftUsername ??
        i.author.discordDisplayName ??
        ""
      ).toLowerCase();
      return (
        i.title.toLowerCase().includes(q) ||
        (i.description?.toLowerCase().includes(q) ?? false) ||
        author.includes(q)
      );
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête et Recherche */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold">Modération de la galerie</h1>

        <div className="relative w-full sm:w-80">
          <MagnifyingGlass className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par titre, joueur..."
            className="w-full pr-8 pl-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer p-0.5"
              title="Effacer la recherche"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Onglets de triage */}
      <Tabs defaultValue={defaultTab} className="flex flex-col gap-6">
        <TabsList className="bg-muted/50 self-start p-1">
          <TabsTrigger value="pending" className="gap-2 text-xs">
            <Clock className="size-4" />
            <span>En attente</span>
            {pendingItems.length > 0 && (
              <Badge className="py-0.2 rounded-full bg-amber-500 px-1.5 text-[10px] text-white">
                {pendingItems.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2 text-xs">
            <CheckCircle className="size-4 text-emerald-500" />
            <span>Publiées ({approvedItems.length})</span>
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2 text-xs">
            <Archive className="size-4 text-rose-500" />
            <span>Refusées ({rejectedItems.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: EN ATTENTE */}
        <TabsContent value="pending" className="mt-0 flex flex-col gap-4">
          {filterBySearch(pendingItems).length > 0 ? (
            <div className="flex flex-col gap-4">
              {filterBySearch(pendingItems).map((item) => (
                <StaffGalleryReviewCard
                  key={item.id}
                  item={item}
                  categories={categories}
                  onRejectRequest={setRejectItem}
                  onPreview={setPreviewItem}
                />
              ))}
            </div>
          ) : (
            <div className="border-border bg-card/40 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-16 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="size-7" />
              </div>
              <div className="flex max-w-sm flex-col gap-1">
                <h3 className="font-heading text-lg font-semibold">Aucune capture en attente</h3>
                <p className="text-muted-foreground text-sm">
                  Toutes les captures d&apos;écran soumises ont été modérées.
                </p>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab 2: PUBLIÉES */}
        <TabsContent value="approved" className="mt-0 flex flex-col gap-4">
          {filterBySearch(approvedItems).length > 0 ? (
            <div className="flex flex-col gap-4">
              {filterBySearch(approvedItems).map((item) => (
                <StaffGalleryReviewCard
                  key={item.id}
                  item={item}
                  categories={categories}
                  onRejectRequest={setRejectItem}
                  onPreview={setPreviewItem}
                />
              ))}
            </div>
          ) : (
            <div className="border-border bg-card/40 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-16 text-center">
              <div className="bg-muted/60 text-muted-foreground flex size-14 items-center justify-center rounded-full">
                <Images className="size-7" />
              </div>
              <div className="flex max-w-sm flex-col gap-1">
                <h3 className="font-heading text-lg font-semibold">Aucune capture publiée</h3>
                <p className="text-muted-foreground text-sm">
                  Aucune capture n&apos;est actuellement active sur la galerie publique.
                </p>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab 3: REFUSÉES */}
        <TabsContent value="rejected" className="mt-0 flex flex-col gap-4">
          {filterBySearch(rejectedItems).length > 0 ? (
            <div className="flex flex-col gap-4">
              {filterBySearch(rejectedItems).map((item) => (
                <StaffGalleryReviewCard
                  key={item.id}
                  item={item}
                  categories={categories}
                  onRejectRequest={setRejectItem}
                  onPreview={setPreviewItem}
                />
              ))}
            </div>
          ) : (
            <div className="border-border bg-card/40 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-16 text-center">
              <div className="bg-muted/60 text-muted-foreground flex size-14 items-center justify-center rounded-full">
                <Archive className="size-7" />
              </div>
              <div className="flex max-w-sm flex-col gap-1">
                <h3 className="font-heading text-lg font-semibold">Aucune capture refusée</h3>
                <p className="text-muted-foreground text-sm">
                  L&apos;historique des captures rejetées est vide.
                </p>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogue de refus avec motif */}
      <StaffGalleryRejectDialog
        open={rejectItem !== null}
        itemId={rejectItem?.id ?? null}
        itemTitle={rejectItem?.title}
        onOpenChange={(open) => !open && setRejectItem(null)}
      />

      {/* Lightbox Aperçu */}
      <GalleryLightbox
        item={previewItem}
        items={items}
        onClose={() => setPreviewItem(null)}
        onNavigate={(it) => setPreviewItem(it as StaffGalleryItem)}
        currentUserId={currentUserId}
        currentUserRole="ADMIN"
      />
    </div>
  );
}
