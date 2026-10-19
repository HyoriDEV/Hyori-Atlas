"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Heart, WarningCircle } from "@phosphor-icons/react";
import { SkinHead } from "@/components/ui/skin-head";
import { Badge } from "@/components/ui/badge";
import { toggleGalleryLikeAction } from "@/lib/actions/gallery-actions";
import { GalleryCategory } from "@/lib/generated/prisma/enums";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface GalleryCardAuthor {
  id: string;
  discordDisplayName: string | null;
  discordUsername: string | null;
  discordAvatarUrl?: string | null;
  minecraftUsername: string | null;
  minecraftUuid: string | null;
  minecraftAvatarUrl?: string | null;
  minecraftSkinUpdatedAt?: Date | string | null;
  characterName?: string | null;
}

export interface GalleryCardItem {
  id: string;
  title: string;
  description?: string | null;
  imageUrl: string;
  thumbnailUrl: string;
  category: GalleryCategory;
  location?: string | null;
  shader?: string | null;
  isFeatured: boolean;
  isSpoiler: boolean;
  createdAt: Date | string;
  author: GalleryCardAuthor;
  likeCount: number;
  isLikedByCurrentUser?: boolean;
  taggedUsers?: {
    user: GalleryCardAuthor;
  }[];
}

export const GALLERY_CATEGORY_LABELS: Record<GalleryCategory, string> = {
  [GalleryCategory.PAYSAGE]: "Paysage",
  [GalleryCategory.SCENE_RP]: "Scène RP",
  [GalleryCategory.PORTRAIT]: "Portrait",
  [GalleryCategory.ARCHITECTURE]: "Architecture",
  [GalleryCategory.EVENEMENT]: "Événement",
};

interface GalleryCardProps {
  item: GalleryCardItem;
  onOpen: (item: GalleryCardItem) => void;
  currentUserId?: string;
  priority?: boolean;
  categoryLabels?: Record<string, string>;
  gridSize?: "sm" | "md" | "lg";
}

export function GalleryCard({
  item,
  onOpen,
  currentUserId,
  priority = false,
  categoryLabels,
  gridSize = "md",
}: GalleryCardProps) {
  const [liked, setLiked] = useState(item.isLikedByCurrentUser ?? false);
  const [likesCount, setLikesCount] = useState(item.likeCount);
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);
  const [isPending, startTransition] = useTransition();

  const authorName = item.author.minecraftUsername ?? item.author.discordDisplayName ?? "Joueur";
  const categoryLabel =
    categoryLabels?.[item.category] ?? GALLERY_CATEGORY_LABELS[item.category] ?? "Capture";

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId) {
      toast.info("Connecte-toi pour aimer cette capture !");
      return;
    }

    const nextLiked = !liked;
    const nextCount = nextLiked ? likesCount + 1 : Math.max(0, likesCount - 1);
    setLiked(nextLiked);
    setLikesCount(nextCount);

    startTransition(async () => {
      try {
        const res = await toggleGalleryLikeAction(item.id);
        setLiked(res.liked);
        setLikesCount(res.newCount);
      } catch {
        setLiked(!nextLiked);
        setLikesCount(likesCount);
        toast.error("Impossible d'enregistrer la réaction.");
      }
    });
  };

  const handleCardClick = () => {
    if (item.isSpoiler && !spoilerRevealed) {
      setSpoilerRevealed(true);
      return;
    }
    onOpen(item);
  };

  const isMaskedSpoiler = item.isSpoiler && !spoilerRevealed;

  const imageSizes =
    gridSize === "sm"
      ? "(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
      : gridSize === "lg"
        ? "(max-width: 768px) 100vw, 50vw"
        : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw";

  return (
    <article
      onClick={handleCardClick}
      className="group bg-card text-card-foreground border-border/70 hover:border-primary/50 relative flex cursor-pointer flex-col overflow-hidden rounded-xl border shadow-xs transition-all duration-300 hover:shadow-md"
    >
      {/* Conteneur image épuré sans rien dessus */}
      <div className="bg-muted/30 relative aspect-video w-full overflow-hidden">
        <Image
          src={item.thumbnailUrl || item.imageUrl}
          alt={item.title}
          fill
          priority={priority}
          sizes={imageSizes}
          className={cn(
            "object-cover transition-transform duration-500 ease-out",
            isMaskedSpoiler ? "scale-105 blur-md" : "group-hover:scale-[1.025]"
          )}
        />

        {/* Masque Spoiler RP uniquement si non révélé */}
        {isMaskedSpoiler && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 bg-black/65 p-4 text-center text-white backdrop-blur-xs">
            <WarningCircle className="size-5 text-amber-400" />
            <span className="text-xs font-semibold">Spoiler RP</span>
            <span className="text-[11px] text-white/80">Cliquer pour révéler</span>
          </div>
        )}
      </div>

      {/* Détails et métadonnées sous l'image */}
      <div
        className={cn(
          "flex flex-1 flex-col justify-between",
          gridSize === "sm" ? "gap-2 p-3" : gridSize === "lg" ? "gap-4 p-5 sm:p-6" : "gap-3 p-4"
        )}
      >
        <div className={cn("flex flex-col", gridSize === "sm" ? "gap-1.5" : "gap-2")}>
          {/* Ligne catégorie & Like */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Badge
                variant="secondary"
                className={cn(
                  "border-border/50 bg-muted/60 text-muted-foreground font-normal",
                  gridSize === "sm" ? "px-1.5 py-0 text-[10px]" : "text-[11px]"
                )}
              >
                {categoryLabel}
              </Badge>

              {item.isSpoiler && spoilerRevealed && (
                <Badge
                  variant="outline"
                  className={cn(
                    "border-amber-500/40 font-medium text-amber-500",
                    gridSize === "sm" ? "px-1 py-0 text-[9px]" : "text-[10px]"
                  )}
                >
                  Spoiler
                </Badge>
              )}
            </div>

            {/* Bouton Like élégant sous l'image */}
            <button
              type="button"
              onClick={handleLike}
              disabled={isPending}
              aria-label={liked ? "Ne plus aimer" : "Aimer"}
              className={cn(
                "flex cursor-pointer items-center rounded-full font-medium transition-colors",
                gridSize === "sm" ? "gap-1 px-2 py-0.5 text-[11px]" : "gap-1.5 px-2.5 py-1 text-xs",
                liked
                  ? "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
                  : "text-muted-foreground hover:bg-muted hover:text-rose-500"
              )}
            >
              <Heart
                className={cn(
                  "transition-transform",
                  gridSize === "sm" ? "size-3" : "size-3.5",
                  liked && "scale-110 fill-current"
                )}
              />
              <span className={cn("font-mono", gridSize === "sm" ? "text-[11px]" : "text-xs")}>
                {likesCount}
              </span>
            </button>
          </div>

          {/* Titre et description */}
          <div className="flex flex-col gap-1">
            <h3
              className={cn(
                "font-heading text-foreground group-hover:text-primary line-clamp-1 font-semibold tracking-tight transition-colors",
                gridSize === "sm"
                  ? "text-sm"
                  : gridSize === "lg"
                    ? "text-lg sm:text-xl"
                    : "text-base"
              )}
            >
              {item.title}
            </h3>
            {item.description && (
              <p
                className={cn(
                  "text-muted-foreground leading-relaxed",
                  gridSize === "sm"
                    ? "line-clamp-1 text-[11px]"
                    : gridSize === "lg"
                      ? "line-clamp-3 text-sm"
                      : "line-clamp-2 text-xs"
                )}
              >
                {item.description}
              </p>
            )}
          </div>
        </div>

        {/* Pied de carte avec Auteur (Nom RP + Pseudo Minecraft) & Date - Alignement vertical centré sur la tête */}
        <div
          className={cn(
            "border-border/60 flex items-center justify-between border-t text-xs",
            gridSize === "sm"
              ? "mt-0.5 min-h-5 pt-2"
              : gridSize === "lg"
                ? "mt-2 min-h-7 pt-3.5"
                : "mt-1 min-h-6 pt-2.5"
          )}
        >
          <div className="flex min-w-0 items-center gap-2 overflow-hidden">
            <SkinHead
              size="sm"
              username={item.author.minecraftUsername}
              uuid={item.author.minecraftUuid}
              avatarUrl={item.author.minecraftAvatarUrl}
              updatedAt={item.author.minecraftSkinUpdatedAt}
              className="shrink-0"
            />
            <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
              {item.author.characterName ? (
                <>
                  <span className="text-foreground line-clamp-1 leading-none font-medium">
                    {item.author.characterName}
                  </span>
                  {item.author.minecraftUsername && (
                    <span className="text-muted-foreground line-clamp-1 shrink-0 text-[11px] leading-none">
                      ({item.author.minecraftUsername})
                    </span>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground group-hover:text-foreground line-clamp-1 leading-none font-medium transition-colors">
                  {authorName}
                </span>
              )}
            </div>
          </div>

          <span className="text-muted-foreground shrink-0 text-[11px] leading-none">
            {formatDate(item.createdAt, {
              style: "prefix-long",
              withTime: false,
              withYear: true,
            })}
          </span>
        </div>
      </div>
    </article>
  );
}
