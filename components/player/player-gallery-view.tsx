"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import {
  Clock,
  CheckCircle,
  XCircle,
  Heart,
  Trash,
  Sparkle,
  Images,
  Eye,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GalleryUploadDialog } from "@/components/gallery/gallery-upload-dialog";
import { GalleryLightbox } from "@/components/gallery/gallery-lightbox";
import { GalleryCardItem, GALLERY_CATEGORY_LABELS } from "@/components/gallery/gallery-card";
import { deleteGalleryItemAction } from "@/lib/actions/gallery-actions";
import { GalleryStatus, GalleryCategory } from "@/lib/generated/prisma/enums";
import { formatDate } from "@/lib/date";
import { toast } from "sonner";

export interface PlayerGalleryItem extends GalleryCardItem {
  status: GalleryStatus;
  rejectionReason?: string | null;
}

interface PlayerGalleryViewProps {
  items: PlayerGalleryItem[];
  currentUser: {
    id: string;
    role: string;
    registrationStatus?: string | null;
  };
  submissionsEnabled?: boolean;
  categories?: { id: GalleryCategory; label: string }[];
  categoryLabels?: Record<string, string>;
}

export function PlayerGalleryView({
  items,
  currentUser,
  submissionsEnabled = true,
  categories,
  categoryLabels,
}: PlayerGalleryViewProps) {
  const [previewItem, setPreviewItem] = useState<PlayerGalleryItem | null>(null);
  const [isPending, startTransition] = useTransition();

  const publishedCount = items.filter((i) => i.status === GalleryStatus.APPROVED).length;
  const pendingCount = items.filter((i) => i.status === GalleryStatus.PENDING).length;
  const totalLikes = items.reduce((acc, curr) => acc + curr.likeCount, 0);

  const handleDelete = (id: string, title: string) => {
    if (!confirm(`Supprimer la capture "${title}" ?`)) return;

    startTransition(async () => {
      try {
        await deleteGalleryItemAction(id);
        toast.success("Capture supprimée.");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Erreur lors de la suppression.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold">Mes captures</h1>

        <GalleryUploadDialog
          currentUser={currentUser}
          submissionsEnabled={submissionsEnabled}
          categories={categories}
        />
      </div>

      {/* Cartes Métriques */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="border-border bg-card flex flex-col gap-1 rounded-lg border p-4 shadow-xs">
          <span className="text-muted-foreground text-xs font-medium">Total soumises</span>
          <span className="text-foreground font-mono text-2xl font-bold">{items.length}</span>
        </div>
        <div className="border-border bg-card flex flex-col gap-1 rounded-lg border p-4 shadow-xs">
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Publiées
          </span>
          <span className="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {publishedCount}
          </span>
        </div>
        <div className="border-border bg-card flex flex-col gap-1 rounded-lg border p-4 shadow-xs">
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">En attente</span>
          <span className="font-mono text-2xl font-bold text-amber-600 dark:text-amber-400">
            {pendingCount}
          </span>
        </div>
        <div className="border-border bg-card flex flex-col gap-1 rounded-lg border p-4 shadow-xs">
          <span className="text-xs font-medium text-rose-500">Likes reçus</span>
          <span className="font-mono text-2xl font-bold text-rose-500">{totalLikes}</span>
        </div>
      </div>

      {/* Liste des Captures */}
      {items.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const catLabel =
              categoryLabels?.[item.category] ??
              GALLERY_CATEGORY_LABELS[item.category] ??
              "Capture";

            return (
              <div
                key={item.id}
                className="border-border bg-card flex flex-col overflow-hidden rounded-lg border shadow-xs transition-colors hover:border-primary/50"
              >
                {/* Image Preview */}
                <div
                  onClick={() => setPreviewItem(item)}
                  className="group relative aspect-[16/10] w-full cursor-pointer overflow-hidden bg-black/40"
                >
                  <Image
                    src={item.thumbnailUrl || item.imageUrl}
                    alt={item.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-103"
                  />
                  <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/40 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <Eye className="size-4" />
                    <span>Agrandir</span>
                  </div>

                  {/* Badge Statut */}
                  <div className="absolute top-2.5 left-2.5">
                    {item.status === GalleryStatus.PENDING && (
                      <Badge className="flex items-center gap-1 bg-amber-500 text-xs font-semibold text-amber-950 shadow-xs">
                        <Clock className="size-3" /> En attente
                      </Badge>
                    )}
                    {item.status === GalleryStatus.APPROVED && (
                      <Badge className="flex items-center gap-1 bg-emerald-600 text-xs font-semibold text-white shadow-xs">
                        <CheckCircle className="size-3" /> Publiée
                      </Badge>
                    )}
                    {item.status === GalleryStatus.REJECTED && (
                      <Badge className="flex items-center gap-1 bg-rose-600 text-xs font-semibold text-white shadow-xs">
                        <XCircle className="size-3" /> Refusée
                      </Badge>
                    )}
                  </div>

                  {item.isFeatured && (
                    <Badge className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-amber-400 text-xs font-semibold text-amber-950 shadow-xs">
                      <Sparkle className="size-3 fill-current" /> Coup de cœur
                    </Badge>
                  )}
                </div>

                {/* Détails */}
                <div className="flex flex-1 flex-col justify-between gap-3 p-3.5">
                  <div className="flex flex-col gap-1.5">
                    <div className="text-muted-foreground flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{catLabel}</span>
                      <span>
                        {formatDate(item.createdAt, {
                          style: "prefix-long",
                          withTime: false,
                          withYear: true,
                        })}
                      </span>
                    </div>

                    <h3 className="font-heading text-foreground line-clamp-1 text-sm font-semibold">
                      {item.title}
                    </h3>

                    {item.description && (
                      <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    {/* Motif de refus si applicable */}
                    {item.status === GalleryStatus.REJECTED && item.rejectionReason && (
                      <div className="mt-1 rounded-md border border-rose-500/20 bg-rose-500/10 p-2 text-xs text-rose-700 dark:text-rose-400">
                        <strong>Motif :</strong> {item.rejectionReason}
                      </div>
                    )}
                  </div>

                  <div className="border-border/60 flex items-center justify-between border-t pt-2.5">
                    <div className="flex items-center gap-1 text-xs font-semibold text-rose-500">
                      <Heart className="size-3.5 fill-current" />
                      <span>{item.likeCount}</span>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(item.id, item.title)}
                      disabled={isPending}
                      className="size-7 p-0 text-muted-foreground hover:text-destructive"
                      title="Supprimer la capture"
                    >
                      <Trash className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border-border bg-card/40 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-16 text-center">
          <div className="bg-muted/60 text-muted-foreground flex size-14 items-center justify-center rounded-full">
            <Images className="size-7" />
          </div>
          <div className="flex max-w-sm flex-col gap-1">
            <h3 className="font-heading text-lg font-semibold">Aucune capture partagée</h3>
            <p className="text-muted-foreground text-sm">
              Vous n&apos;avez pas encore envoyé de captures d&apos;écran. Partagez dès maintenant vos plus beaux moments sur Hyori RP !
            </p>
          </div>
        </div>
      )}

      {/* Lightbox */}
      <GalleryLightbox
        item={previewItem}
        items={items}
        onClose={() => setPreviewItem(null)}
        onNavigate={(it) => setPreviewItem(it as PlayerGalleryItem)}
        currentUserId={currentUser.id}
      />
    </div>
  );
}
