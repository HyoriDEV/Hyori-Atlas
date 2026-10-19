"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Clock, CheckCircle, XCircle, Heart, Trash, Images, Eye } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GalleryUploadDialog } from "@/components/gallery/gallery-upload-dialog";
import { GalleryLightbox } from "@/components/gallery/gallery-lightbox";
import { GalleryCardItem, GALLERY_CATEGORY_LABELS } from "@/components/gallery/gallery-card";
import { GalleryEditDialog } from "@/components/player/gallery-edit-dialog";
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
      {/* En-tête épuré et aligné */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold">Mes captures</h1>
          <p className="text-muted-foreground text-xs">
            Gérez vos clichés et suivez leur statut de modération.
          </p>
        </div>

        <GalleryUploadDialog
          currentUser={currentUser}
          submissionsEnabled={submissionsEnabled}
          categories={categories}
        />
      </div>

      {/* Liste des Captures au format 16:9 */}
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
                className="border-border bg-card hover:border-primary/50 flex flex-col overflow-hidden rounded-lg border shadow-xs transition-colors"
              >
                {/* Image Preview 16:9 standard */}
                <div
                  onClick={() => setPreviewItem(item)}
                  className="group relative aspect-video w-full cursor-pointer overflow-hidden bg-black/40"
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
                </div>

                {/* Détails */}
                <div className="flex flex-1 flex-col justify-between gap-3 p-3.5">
                  <div className="flex flex-col gap-1.5">
                    <div className="text-muted-foreground flex items-center justify-between text-xs">
                      <span className="text-foreground font-medium">{catLabel}</span>
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

                    <div className="flex items-center gap-1">
                      <GalleryEditDialog item={item} categories={categories} />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(item.id, item.title)}
                        disabled={isPending}
                        className="text-muted-foreground hover:text-destructive size-7 p-0"
                        title="Supprimer la capture"
                      >
                        <Trash className="size-4" />
                      </Button>
                    </div>
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
              Vous n&apos;avez pas encore envoyé de captures d&apos;écran. Partagez dès maintenant
              vos plus beaux moments sur Hyori RP !
            </p>
            <p className="text-muted-foreground/75 pt-1 text-xs">
              Astuce : activez la touche{" "}
              <kbd className="border-border bg-muted rounded border px-1 py-0.5 font-mono text-[10px]">
                F1
              </kbd>{" "}
              en jeu pour masquer votre interface avant de prendre un cliché.
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
