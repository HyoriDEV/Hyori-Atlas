"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import {
  Check,
  X,
  Sparkle,
  Trash,
  MapPin,
  Eye,
  EyeSlash,
  Clock,
  ArrowCounterClockwise,
} from "@phosphor-icons/react";
import { SkinHead } from "@/components/ui/skin-head";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  reviewGalleryItemAction,
  toggleFeaturedGalleryItemAction,
  deleteGalleryItemAction,
} from "@/lib/actions/gallery-actions";
import { GalleryStatus } from "@/lib/generated/prisma/enums";
import { GALLERY_CATEGORY_LABELS, GalleryCardItem } from "@/components/gallery/gallery-card";
import { formatDate } from "@/lib/date";
import { toast } from "sonner";

export interface StaffGalleryItem extends GalleryCardItem {
  status: GalleryStatus;
  rejectionReason?: string | null;
  reviewedAt?: Date | string | null;
  reviewedBy?: {
    minecraftUsername: string | null;
    discordDisplayName: string | null;
  } | null;
}

interface StaffGalleryReviewCardProps {
  item: StaffGalleryItem;
  onRejectRequest: (item: StaffGalleryItem) => void;
  onPreview: (item: StaffGalleryItem) => void;
}

export function StaffGalleryReviewCard({
  item,
  onRejectRequest,
  onPreview,
}: StaffGalleryReviewCardProps) {
  const [isPending, startTransition] = useTransition();
  const [isFeatured, setIsFeatured] = useState(item.isFeatured);

  const authorName = item.author.minecraftUsername ?? item.author.discordDisplayName ?? "Joueur";

  const handleApprove = () => {
    startTransition(async () => {
      try {
        await reviewGalleryItemAction({
          itemId: item.id,
          status: GalleryStatus.APPROVED,
        });
        toast.success(`La capture "${item.title}" a été approuvée !`);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Erreur lors de l'approbation.");
      }
    });
  };

  const handleToggleFeatured = () => {
    startTransition(async () => {
      try {
        const res = await toggleFeaturedGalleryItemAction(item.id);
        setIsFeatured(res.isFeatured);
        toast.success(
          res.isFeatured
            ? "Capture mise en avant (Coup de cœur) !"
            : "Capture retirée des coups de cœur."
        );
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Erreur lors de la mise à la une.");
      }
    });
  };

  const handleDelete = () => {
    if (!confirm(`Supprimer définitivement la capture "${item.title}" ? Cette action est irréversible.`)) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteGalleryItemAction(item.id);
        toast.success("Capture supprimée de la base de données et du disque.");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Erreur lors de la suppression.");
      }
    });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-5 p-5 rounded-2xl border border-border/80 bg-card shadow-xs transition-all hover:shadow-md">
      {/* Aperçu Image */}
      <div
        onClick={() => onPreview(item)}
        className="group relative h-48 sm:h-auto sm:w-64 shrink-0 rounded-xl overflow-hidden bg-black/40 cursor-pointer border border-border/60"
      >
        <Image
          src={item.thumbnailUrl || item.imageUrl}
          alt={item.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs gap-1 font-medium backdrop-blur-xs">
          <Eye className="size-4" />
          <span>Agrandir</span>
        </div>

        {item.isSpoiler && (
          <Badge className="absolute top-2 left-2 bg-amber-500/90 text-amber-950 text-[10px] flex items-center gap-1">
            <EyeSlash className="size-3" /> Spoiler RP
          </Badge>
        )}
      </div>

      {/* Contenu et Détails */}
      <div className="flex flex-1 flex-col justify-between gap-4">
        <div className="flex flex-col gap-2.5">
          {/* Header avec Catégorie et Statut */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {GALLERY_CATEGORY_LABELS[item.category] || "Capture"}
              </Badge>
              {isFeatured && (
                <Badge className="border-amber-400/40 bg-amber-500/90 text-amber-950 text-xs font-semibold flex items-center gap-1">
                  <Sparkle className="size-3 fill-current" /> Coup de cœur
                </Badge>
              )}
            </div>

            {/* Statut Badge */}
            {item.status === GalleryStatus.PENDING && (
              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs flex items-center gap-1 font-medium">
                <Clock className="size-3" /> En attente de validation
              </Badge>
            )}
            {item.status === GalleryStatus.APPROVED && (
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs flex items-center gap-1 font-medium">
                <Check className="size-3" /> Publiée
              </Badge>
            )}
            {item.status === GalleryStatus.REJECTED && (
              <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 text-xs flex items-center gap-1 font-medium">
                <X className="size-3" /> Refusée
              </Badge>
            )}
          </div>

          {/* Titre */}
          <h3 className="font-heading text-lg font-bold text-foreground tracking-tight">
            {item.title}
          </h3>

          {/* Auteur & Date */}
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
            <SkinHead
              size="sm"
              username={item.author.minecraftUsername}
              uuid={item.author.minecraftUuid}
              avatarUrl={item.author.minecraftAvatarUrl}
              updatedAt={item.author.minecraftSkinUpdatedAt}
            />
            <span className="font-medium text-foreground">{authorName}</span>
            <span>•</span>
            <span>
              {formatDate(item.createdAt, {
                style: "prefix-long",
                withTime: true,
                withYear: true,
              })}
            </span>
          </div>

          {/* Métadonnées optionnelles */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
            {item.location && (
              <span className="flex items-center gap-1 text-foreground/80">
                <MapPin className="size-3.5 text-primary" />
                Lieu : {item.location}
              </span>
            )}
            {item.shader && (
              <span>Shader : <strong className="text-foreground/80 font-normal">{item.shader}</strong></span>
            )}
          </div>

          {/* Description */}
          {item.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/30 p-2.5 rounded-lg border border-border/40 font-serif">
              {item.description}
            </p>
          )}

          {/* Motif de refus si REJECTED */}
          {item.status === GalleryStatus.REJECTED && item.rejectionReason && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-400">
              <strong>Motif du refus :</strong> {item.rejectionReason}
            </div>
          )}
        </div>

        {/* Barre d'actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60">
          <div className="flex items-center gap-2">
            {item.status === GalleryStatus.PENDING && (
              <>
                <Button
                  size="sm"
                  onClick={handleApprove}
                  disabled={isPending}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl gap-1.5 text-xs"
                >
                  <Check className="size-4" />
                  Approuver
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRejectRequest(item)}
                  disabled={isPending}
                  className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/60 dark:hover:bg-rose-950/40 rounded-xl gap-1.5 text-xs"
                >
                  <X className="size-4" />
                  Refuser
                </Button>
              </>
            )}

            {item.status === GalleryStatus.APPROVED && (
              <>
                <Button
                  size="sm"
                  variant={isFeatured ? "default" : "outline"}
                  onClick={handleToggleFeatured}
                  disabled={isPending}
                  className="rounded-xl gap-1.5 text-xs"
                >
                  <Sparkle className="size-4 text-amber-400" />
                  {isFeatured ? "Retirer de la une" : "Mettre en avant"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRejectRequest(item)}
                  disabled={isPending}
                  className="rounded-xl text-xs"
                >
                  Dépublier
                </Button>
              </>
            )}

            {item.status === GalleryStatus.REJECTED && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleApprove}
                disabled={isPending}
                className="rounded-xl gap-1.5 text-xs"
              >
                <ArrowCounterClockwise className="size-4" />
                Réhabiliter & Publier
              </Button>
            )}
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleDelete}
            disabled={isPending}
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 rounded-xl gap-1.5 text-xs"
          >
            <Trash className="size-4" />
            Supprimer
          </Button>
        </div>
      </div>
    </div>
  );
}
