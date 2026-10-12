"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import {
  Check,
  X,
  Sparkle,
  Trash,
  Eye,
  Clock,
  ArrowCounterClockwise,
} from "@phosphor-icons/react";
import { SkinHead } from "@/components/ui/skin-head";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  reviewGalleryItemAction,
  toggleFeaturedGalleryItemAction,
  deleteGalleryItemAction,
  updateGalleryItemCategoryAction,
} from "@/lib/actions/gallery-actions";
import { GalleryStatus, GalleryCategory } from "@/lib/generated/prisma/enums";
import { GALLERY_CATEGORY_LABELS, GalleryCardItem } from "@/components/gallery/gallery-card";
import type { GalleryCategoryItemConfig } from "@/lib/gallery-category-config";
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
  categories: GalleryCategoryItemConfig[];
  onRejectRequest: (item: StaffGalleryItem) => void;
  onPreview: (item: StaffGalleryItem) => void;
}

export function StaffGalleryReviewCard({
  item,
  categories,
  onRejectRequest,
  onPreview,
}: StaffGalleryReviewCardProps) {
  const [isPending, startTransition] = useTransition();
  const [isFeatured, setIsFeatured] = useState(item.isFeatured);
  const [category, setCategory] = useState<GalleryCategory>(item.category);

  const authorName = item.author.minecraftUsername ?? item.author.discordDisplayName ?? "Joueur";

  const handleCategoryChange = (newCat: string) => {
    const nextCategory = newCat as GalleryCategory;
    setCategory(nextCategory);

    startTransition(async () => {
      try {
        await updateGalleryItemCategoryAction(item.id, nextCategory);
        toast.success("Catégorie mise à jour.");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Erreur lors de la modification de la catégorie.");
        setCategory(item.category);
      }
    });
  };

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
    if (
      !confirm(
        `Supprimer définitivement la capture "${item.title}" ? Cette action est irréversible.`
      )
    ) {
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
    <div className="border-border bg-card flex flex-col gap-4 rounded-lg border p-4 shadow-xs transition-colors sm:flex-row">
      {/* Aperçu Image */}
      <div
        onClick={() => onPreview(item)}
        className="group relative h-44 shrink-0 cursor-pointer overflow-hidden rounded-md border bg-black/40 sm:h-auto sm:w-56"
      >
        <Image
          src={item.thumbnailUrl || item.imageUrl}
          alt={item.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-103"
        />
        <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/30 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
          <Eye className="size-4" />
          <span>Agrandir</span>
        </div>
      </div>

      {/* Contenu et Détails */}
      <div className="flex flex-1 flex-col justify-between gap-3">
        <div className="flex flex-col gap-2">
          {/* Header avec Catégorie (Sélecteur Staff) et Statut */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {/* Sélecteur de catégorie modifiable par le staff */}
              <Select
                value={category}
                onValueChange={(val) => val && handleCategoryChange(val)}
                disabled={isPending}
              >
                <SelectTrigger className="h-7 w-36 text-xs">
                  <SelectValue placeholder="Catégorie">
                    {categories.find((c) => c.id === category)?.label ??
                      GALLERY_CATEGORY_LABELS[category] ??
                      "Catégorie"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {isFeatured && (
                <Badge className="flex items-center gap-1 border-amber-400/40 bg-amber-500/90 text-[11px] font-semibold text-amber-950">
                  <Sparkle className="size-3 fill-current" /> Coup de cœur
                </Badge>
              )}
            </div>

            {/* Statut Badge */}
            {item.status === GalleryStatus.PENDING && (
              <Badge className="flex items-center gap-1 border-amber-500/30 bg-amber-500/15 text-xs font-medium text-amber-700 dark:text-amber-400">
                <Clock className="size-3" /> En attente
              </Badge>
            )}
            {item.status === GalleryStatus.APPROVED && (
              <Badge className="flex items-center gap-1 border-emerald-500/30 bg-emerald-500/15 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                <Check className="size-3" /> Publiée
              </Badge>
            )}
            {item.status === GalleryStatus.REJECTED && (
              <Badge className="flex items-center gap-1 border-rose-500/30 bg-rose-500/15 text-xs font-medium text-rose-700 dark:text-rose-400">
                <X className="size-3" /> Refusée
              </Badge>
            )}
          </div>

          {/* Titre */}
          <h3 className="font-heading text-foreground text-base font-semibold tracking-tight">
            {item.title}
          </h3>

          {/* Auteur & Date */}
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <SkinHead
              size="sm"
              username={item.author.minecraftUsername}
              uuid={item.author.minecraftUuid}
              avatarUrl={item.author.minecraftAvatarUrl}
              updatedAt={item.author.minecraftSkinUpdatedAt}
            />
            <span className="text-foreground font-medium">{authorName}</span>
            <span>•</span>
            <span>
              {formatDate(item.createdAt, {
                style: "prefix-long",
                withTime: true,
                withYear: true,
              })}
            </span>
          </div>

          {/* Description */}
          {item.description && (
            <p className="text-muted-foreground bg-muted/30 border-border/40 line-clamp-2 rounded-md border p-2 text-xs">
              {item.description}
            </p>
          )}

          {/* Motif de refus si REJECTED */}
          {item.status === GalleryStatus.REJECTED && item.rejectionReason && (
            <div className="rounded-md border border-rose-500/20 bg-rose-500/10 p-2 text-xs text-rose-700 dark:text-rose-400">
              <strong>Motif du refus :</strong> {item.rejectionReason}
            </div>
          )}
        </div>

        {/* Barre d'actions standard */}
        <div className="border-border/60 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <div className="flex items-center gap-2">
            {item.status === GalleryStatus.PENDING && (
              <>
                <Button
                  size="sm"
                  onClick={handleApprove}
                  disabled={isPending}
                  className="gap-1.5 bg-emerald-600 text-xs text-white hover:bg-emerald-500"
                >
                  <Check className="size-3.5" />
                  Approuver
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRejectRequest(item)}
                  disabled={isPending}
                  className="gap-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  <X className="size-3.5" />
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
                  className="gap-1.5 text-xs"
                >
                  <Sparkle className="size-3.5 text-amber-400" />
                  {isFeatured ? "Retirer de la une" : "Mettre en avant"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRejectRequest(item)}
                  disabled={isPending}
                  className="text-xs"
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
                className="gap-1.5 text-xs"
              >
                <ArrowCounterClockwise className="size-3.5" />
                Réhabiliter & Publier
              </Button>
            )}
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleDelete}
            disabled={isPending}
            className="gap-1.5 text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash className="size-3.5" />
            Supprimer
          </Button>
        </div>
      </div>
    </div>
  );
}
