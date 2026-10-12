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
  MapPin,
  Eye,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GalleryUploadDialog } from "@/components/gallery/gallery-upload-dialog";
import { GalleryLightbox } from "@/components/gallery/gallery-lightbox";
import { GalleryCardItem, GALLERY_CATEGORY_LABELS } from "@/components/gallery/gallery-card";
import { deleteGalleryItemAction } from "@/lib/actions/gallery-actions";
import { GalleryStatus } from "@/lib/generated/prisma/enums";
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
}

export function PlayerGalleryView({
  items,
  currentUser,
  submissionsEnabled = true,
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
    <div className="flex flex-col gap-8">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            Mes Captures d&apos;Écran
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Retrouvez ici toutes vos captures soumises à la galerie communautaire de Hyori RP.
          </p>
        </div>

        <GalleryUploadDialog
          currentUser={currentUser}
          submissionsEnabled={submissionsEnabled}
        />
      </div>

      {/* Cartes Métriques */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="flex flex-col gap-1 p-4 rounded-2xl border border-border/80 bg-card">
          <span className="text-xs font-medium text-muted-foreground">Total soumises</span>
          <span className="text-2xl font-bold font-mono text-foreground">{items.length}</span>
        </div>
        <div className="flex flex-col gap-1 p-4 rounded-2xl border border-border/80 bg-card">
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Publiées</span>
          <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {publishedCount}
          </span>
        </div>
        <div className="flex flex-col gap-1 p-4 rounded-2xl border border-border/80 bg-card">
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">En attente</span>
          <span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {pendingCount}
          </span>
        </div>
        <div className="flex flex-col gap-1 p-4 rounded-2xl border border-border/80 bg-card">
          <span className="text-xs font-medium text-rose-500">Likes reçus</span>
          <span className="text-2xl font-bold font-mono text-rose-500">{totalLikes}</span>
        </div>
      </div>

      {/* Liste des Captures */}
      {items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs hover:shadow-md transition-all"
            >
              {/* Image Preview */}
              <div
                onClick={() => setPreviewItem(item)}
                className="group relative aspect-[16/10] w-full overflow-hidden bg-black/40 cursor-pointer"
              >
                <Image
                  src={item.thumbnailUrl || item.imageUrl}
                  alt={item.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs gap-1.5 font-medium">
                  <Eye className="size-4" />
                  <span>Agrandir</span>
                </div>

                {/* Badge Statut flottant */}
                <div className="absolute top-3 left-3">
                  {item.status === GalleryStatus.PENDING && (
                    <Badge className="bg-amber-500 text-amber-950 font-semibold text-xs flex items-center gap-1 shadow-md">
                      <Clock className="size-3" /> En attente
                    </Badge>
                  )}
                  {item.status === GalleryStatus.APPROVED && (
                    <Badge className="bg-emerald-600 text-white font-semibold text-xs flex items-center gap-1 shadow-md">
                      <CheckCircle className="size-3" /> Publiée
                    </Badge>
                  )}
                  {item.status === GalleryStatus.REJECTED && (
                    <Badge className="bg-rose-600 text-white font-semibold text-xs flex items-center gap-1 shadow-md">
                      <XCircle className="size-3" /> Refusée
                    </Badge>
                  )}
                </div>

                {item.isFeatured && (
                  <Badge className="absolute top-3 right-3 bg-amber-400 text-amber-950 font-semibold text-xs flex items-center gap-1">
                    <Sparkle className="size-3 fill-current" /> Coup de cœur
                  </Badge>
                )}
              </div>

              {/* Détails */}
              <div className="flex flex-col gap-3 p-4 flex-1 justify-between">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{GALLERY_CATEGORY_LABELS[item.category]}</span>
                    <span>
                      {formatDate(item.createdAt, {
                        style: "prefix-long",
                        withTime: false,
                        withYear: true,
                      })}
                    </span>
                  </div>

                  <h3 className="font-heading text-base font-bold text-foreground line-clamp-1">
                    {item.title}
                  </h3>

                  {item.location && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="size-3" /> {item.location}
                    </span>
                  )}

                  {/* Motif de refus si applicable */}
                  {item.status === GalleryStatus.REJECTED && item.rejectionReason && (
                    <div className="mt-1 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-400">
                      <strong>Motif :</strong> {item.rejectionReason}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-border/60 pt-3">
                  <div className="flex items-center gap-1 text-xs font-semibold text-rose-500">
                    <Heart className="size-3.5 fill-current" />
                    <span>{item.likeCount} likes</span>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(item.id, item.title)}
                    disabled={isPending}
                    className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-xl size-8 p-0"
                    title="Supprimer"
                  >
                    <Trash className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 p-16 text-center rounded-3xl border border-dashed border-border bg-card/40">
          <div className="size-16 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center">
            <Images className="size-8" />
          </div>
          <div className="flex flex-col gap-1 max-w-sm">
            <h3 className="font-heading text-lg font-semibold">Aucune capture partagée</h3>
            <p className="text-sm text-muted-foreground">
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
