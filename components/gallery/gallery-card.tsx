"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Heart, Sparkle } from "@phosphor-icons/react";
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
}

export function GalleryCard({
  item,
  onOpen,
  currentUserId,
  priority = false,
  categoryLabels,
}: GalleryCardProps) {
  const [liked, setLiked] = useState(item.isLikedByCurrentUser ?? false);
  const [likesCount, setLikesCount] = useState(item.likeCount);
  const [isPending, startTransition] = useTransition();

  const authorName = item.author.minecraftUsername ?? item.author.discordDisplayName ?? "Joueur";
  const categoryLabel = categoryLabels?.[item.category] ?? GALLERY_CATEGORY_LABELS[item.category] ?? "Capture";

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

  return (
    <div
      onClick={() => onOpen(item)}
      className="group bg-card text-card-foreground border-border hover:border-primary/50 relative flex cursor-pointer flex-col overflow-hidden rounded-lg border shadow-xs transition-colors"
    >
      {/* Conteneur image */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted/40">
        <Image
          src={item.thumbnailUrl || item.imageUrl}
          alt={item.title}
          fill
          priority={priority}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-103"
        />

        {/* Badges Supérieurs */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-2.5">
          <Badge
            variant="secondary"
            className="border-border/40 bg-background/80 text-foreground text-[11px] font-medium backdrop-blur-md"
          >
            {categoryLabel}
          </Badge>

          {item.isFeatured && (
            <Badge className="flex items-center gap-1 border-amber-400/40 bg-amber-500/90 text-[11px] font-semibold text-amber-950 shadow-xs backdrop-blur-md dark:bg-amber-400/90">
              <Sparkle className="size-3 fill-current" />
              Coup de cœur
            </Badge>
          )}
        </div>

        {/* Bouton Like flottant */}
        <button
          type="button"
          onClick={handleLike}
          disabled={isPending}
          aria-label={liked ? "Ne plus aimer" : "Aimer"}
          className={cn(
            "absolute right-2.5 bottom-2.5 z-10 flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium backdrop-blur-md transition-colors",
            liked
              ? "bg-rose-500 text-white shadow-xs"
              : "bg-background/80 text-foreground hover:bg-background border border-border/60 hover:text-rose-500"
          )}
        >
          <Heart
            className={cn("size-3.5 transition-transform", liked && "scale-105 fill-current")}
          />
          <span>{likesCount}</span>
        </button>
      </div>

      {/* Détails de la carte */}
      <div className="flex flex-col gap-2 p-3.5">
        <div className="flex flex-col gap-1">
          <h3 className="font-heading text-foreground group-hover:text-primary line-clamp-1 text-sm font-semibold tracking-tight transition-colors">
            {item.title}
          </h3>
          {item.description && (
            <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
              {item.description}
            </p>
          )}
        </div>

        {/* Footer avec Auteur & Date */}
        <div className="border-border/60 mt-1 flex items-center justify-between border-t pt-2 text-xs">
          <div className="flex items-center gap-2 overflow-hidden">
            <SkinHead
              size="sm"
              username={item.author.minecraftUsername}
              uuid={item.author.minecraftUuid}
              avatarUrl={item.author.minecraftAvatarUrl}
              updatedAt={item.author.minecraftSkinUpdatedAt}
            />
            <span className="text-muted-foreground group-hover:text-foreground line-clamp-1 font-medium transition-colors">
              {authorName}
            </span>
          </div>

          <span className="text-muted-foreground shrink-0 text-[11px]">
            {formatDate(item.createdAt, {
              style: "prefix-long",
              withTime: false,
              withYear: true,
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
