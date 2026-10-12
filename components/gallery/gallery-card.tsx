"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Heart, MapPin, Eye, EyeSlash, Sparkle } from "@phosphor-icons/react";
import { SkinHead } from "@/components/ui/skin-head";
import { Badge } from "@/components/ui/badge";
import { toggleGalleryLikeAction } from "@/lib/actions/gallery-actions";
import { GalleryCategory } from "@/lib/generated/prisma/enums";
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
}

export function GalleryCard({ item, onOpen, currentUserId, priority = false }: GalleryCardProps) {
  const [revealedSpoiler, setRevealedSpoiler] = useState(!item.isSpoiler);
  const [liked, setLiked] = useState(item.isLikedByCurrentUser ?? false);
  const [likesCount, setLikesCount] = useState(item.likeCount);
  const [isPending, startTransition] = useTransition();

  const authorName = item.author.minecraftUsername ?? item.author.discordDisplayName ?? "Joueur";

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId) {
      toast.info("Connecte-toi pour aimer cette capture !");
      return;
    }

    // Toggle optimiste
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
        // Rollback
        setLiked(!nextLiked);
        setLikesCount(likesCount);
        toast.error("Impossible d'enregistrer la réaction.");
      }
    });
  };

  const handleSpoilerToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRevealedSpoiler((prev) => !prev);
  };

  return (
    <div
      onClick={() => onOpen(item)}
      className="group bg-card text-card-foreground border-border/80 hover:border-primary/50 relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      {/* Container d'image */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-black/40 sm:aspect-[4/3]">
        <Image
          src={item.thumbnailUrl || item.imageUrl}
          alt={item.title}
          fill
          priority={priority}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className={cn(
            "object-cover transition-all duration-700 ease-out group-hover:scale-105",
            item.isSpoiler && !revealedSpoiler && "scale-105 blur-xl brightness-50"
          )}
        />

        {/* Overlay Spoiler */}
        {item.isSpoiler && !revealedSpoiler && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
            <span className="bg-background/80 text-foreground border-border/60 flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-md">
              <EyeSlash className="size-3.5" /> Spoiler d&apos;intrigue RP
            </span>
            <button
              type="button"
              onClick={handleSpoilerToggle}
              className="bg-primary/90 text-primary-foreground hover:bg-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium shadow-md transition-transform hover:scale-105"
            >
              <Eye className="size-3.5" /> Révéler la capture
            </button>
          </div>
        )}

        {/* Badges Supérieurs */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-3">
          <Badge
            variant="secondary"
            className="border-border/40 bg-background/80 text-foreground text-[11px] font-medium backdrop-blur-md"
          >
            {GALLERY_CATEGORY_LABELS[item.category] || "Capture"}
          </Badge>

          {item.isFeatured && (
            <Badge className="border-amber-400/40 bg-amber-500/90 text-amber-950 dark:bg-amber-400/90 dark:text-amber-950 flex items-center gap-1 text-[11px] font-semibold shadow-sm backdrop-blur-md">
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
            "absolute right-3 bottom-3 z-10 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur-md transition-all active:scale-90",
            liked
              ? "bg-rose-500/90 text-white shadow-md shadow-rose-500/20"
              : "bg-background/70 text-foreground hover:bg-background/90 hover:text-rose-500 border border-white/10"
          )}
        >
          <Heart
            className={cn("size-3.5 transition-transform", liked && "fill-current scale-110")}
          />
          <span>{likesCount}</span>
        </button>
      </div>

      {/* Détails Carte */}
      <div className="flex flex-col gap-2.5 p-4">
        <div className="flex flex-col gap-1">
          <h3 className="font-heading text-foreground line-clamp-1 text-base font-semibold tracking-tight transition-colors group-hover:text-primary">
            {item.title}
          </h3>
          {item.location && (
            <div className="text-muted-foreground flex items-center gap-1 text-xs">
              <MapPin className="size-3 shrink-0 opacity-70" />
              <span className="line-clamp-1">{item.location}</span>
            </div>
          )}
        </div>

        {/* Footer avec Auteur & Avatar Minecraft */}
        <div className="border-border/60 mt-1 flex items-center justify-between border-t pt-2.5">
          <div className="flex items-center gap-2 overflow-hidden">
            <SkinHead
              size="sm"
              username={item.author.minecraftUsername}
              uuid={item.author.minecraftUuid}
              avatarUrl={item.author.minecraftAvatarUrl}
              updatedAt={item.author.minecraftSkinUpdatedAt}
            />
            <span className="text-muted-foreground group-hover:text-foreground line-clamp-1 text-xs font-medium transition-colors">
              {authorName}
            </span>
          </div>

          {item.shader && (
            <span className="text-muted-foreground/80 max-w-[120px] truncate text-[11px] font-normal" title={item.shader}>
              {item.shader}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
