"use client";

import { useState, useMemo } from "react";
import {
  Clock,
  CheckCircle,
  Archive,
  MagnifyingGlass,
  Images,
} from "@phosphor-icons/react";
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

interface StaffGalleryViewProps {
  initialItems: StaffGalleryItem[];
  currentUserId: string;
}

export function StaffGalleryView({ initialItems, currentUserId }: StaffGalleryViewProps) {
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
      const author = (i.author.minecraftUsername ?? i.author.discordDisplayName ?? "").toLowerCase();
      return (
        i.title.toLowerCase().includes(q) ||
        (i.location?.toLowerCase().includes(q) ?? false) ||
        author.includes(q)
      );
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête et Recherche */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            Modération de la Galerie
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez les soumissions des joueurs, validez les captures d&apos;écran et sélectionnez les coups de cœur.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <MagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrer les captures..."
            className="pl-10 rounded-xl"
          />
        </div>
      </div>

      {/* Onglets de triage */}
      <Tabs defaultValue={defaultTab} className="flex flex-col gap-6">
        <TabsList className="bg-muted/60 p-1 rounded-xl self-start">
          <TabsTrigger value="pending" className="rounded-lg gap-2 text-xs font-semibold">
            <Clock className="size-4" />
            <span>En attente</span>
            {pendingItems.length > 0 && (
              <Badge className="bg-amber-500 text-white rounded-full px-1.5 py-0.2 text-[10px]">
                {pendingItems.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="rounded-lg gap-2 text-xs font-semibold">
            <CheckCircle className="size-4 text-emerald-500" />
            <span>Publiées ({approvedItems.length})</span>
          </TabsTrigger>
          <TabsTrigger value="rejected" className="rounded-lg gap-2 text-xs font-semibold">
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
                  onRejectRequest={setRejectItem}
                  onPreview={setPreviewItem}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 p-16 text-center rounded-2xl border border-dashed border-border bg-card/40">
              <div className="size-14 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle className="size-7" />
              </div>
              <div className="flex flex-col gap-1 max-w-sm">
                <h3 className="font-heading text-lg font-semibold">Aucune capture en attente</h3>
                <p className="text-sm text-muted-foreground">
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
                  onRejectRequest={setRejectItem}
                  onPreview={setPreviewItem}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 p-16 text-center rounded-2xl border border-dashed border-border bg-card/40">
              <div className="size-14 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center">
                <Images className="size-7" />
              </div>
              <div className="flex flex-col gap-1 max-w-sm">
                <h3 className="font-heading text-lg font-semibold">Aucune capture publiée</h3>
                <p className="text-sm text-muted-foreground">
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
                  onRejectRequest={setRejectItem}
                  onPreview={setPreviewItem}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 p-16 text-center rounded-2xl border border-dashed border-border bg-card/40">
              <div className="size-14 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center">
                <Archive className="size-7" />
              </div>
              <div className="flex flex-col gap-1 max-w-sm">
                <h3 className="font-heading text-lg font-semibold">Aucune capture refusée</h3>
                <p className="text-sm text-muted-foreground">
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
