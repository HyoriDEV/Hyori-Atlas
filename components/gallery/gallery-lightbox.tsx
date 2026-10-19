"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import {
  X,
  CaretLeft,
  CaretRight,
  Heart,
  ShareNetwork,
  DownloadSimple,
  Trash,
} from "@phosphor-icons/react";
import { SkinHead } from "@/components/ui/skin-head";
import { Button } from "@/components/ui/button";
import { GalleryCardItem } from "@/components/gallery/gallery-card";
import { toggleGalleryLikeAction, deleteGalleryItemAction } from "@/lib/actions/gallery-actions";
import { galleryRoles } from "@/lib/navigation";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Role } from "@/lib/generated/prisma/enums";

interface GalleryLightboxProps {
  item: GalleryCardItem | null;
  items: GalleryCardItem[];
  onClose: () => void;
  onNavigate: (item: GalleryCardItem) => void;
  currentUserId?: string;
  currentUserRole?: string;
}

interface GalleryLightboxContentProps {
  item: GalleryCardItem;
  items: GalleryCardItem[];
  onClose: () => void;
  onNavigate: (item: GalleryCardItem) => void;
  currentUserId?: string;
  currentUserRole?: string;
}

function GalleryLightboxContent({
  item,
  items,
  onClose,
  onNavigate,
  currentUserId,
  currentUserRole,
}: GalleryLightboxContentProps) {
  const [liked, setLiked] = useState(item.isLikedByCurrentUser ?? false);
  const [likesCount, setLikesCount] = useState(item.likeCount);
  const [isPending, startTransition] = useTransition();

  const currentIndex = items.findIndex((i) => i.id === item.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < items.length - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev) onNavigate(items[currentIndex - 1]);
  }, [hasPrev, currentIndex, items, onNavigate]);

  const handleNext = useCallback(() => {
    if (hasNext) onNavigate(items[currentIndex + 1]);
  }, [hasNext, currentIndex, items, onNavigate]);

  // Navigation clavier (Échap, Flèche Gauche, Flèche Droite)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, handlePrev, handleNext]);

  const authorName = item.author.minecraftUsername ?? item.author.discordDisplayName ?? "Joueur";

  const handleLike = () => {
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
        toast.error("Erreur lors de l'enregistrement du like.");
      }
    });
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/gallery?photo=${item.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien de la capture copié dans le presse-papier !");
    } catch {
      toast.error("Impossible de copier le lien.");
    }
  };

  const handleDelete = () => {
    if (!confirm("Es-tu certain de vouloir supprimer cette capture d'écran ?")) return;

    startTransition(async () => {
      try {
        await deleteGalleryItemAction(item.id);
        toast.success("Capture supprimée avec succès.");
        onClose();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Erreur lors de la suppression.");
      }
    });
  };

  const isStaff = currentUserRole && galleryRoles.includes(currentUserRole as Role);
  const canDelete = currentUserId && (currentUserId === item.author.id || isStaff);

  return (
    <div className="flex size-full flex-col items-center justify-between">
      {/* Barre d'action supérieure */}
      <div className="z-50 flex w-full items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent p-4 sm:px-6">
        <div />

        <div className="text-foreground flex items-center gap-2">
          {/* Partage */}
          <button
            type="button"
            onClick={handleShare}
            title="Copier le lien permanent"
            className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
          >
            <ShareNetwork className="size-4.5" />
          </button>

          {/* Téléchargement HD */}
          <a
            href={item.imageUrl}
            download={`hyori-${item.id}.webp`}
            target="_blank"
            rel="noopener noreferrer"
            title="Télécharger l'image HD"
            className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
          >
            <DownloadSimple className="size-4.5" />
          </a>

          {/* Suppression */}
          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              title="Supprimer la capture"
              className="border-destructive/40 bg-destructive/20 text-destructive hover:bg-destructive flex size-9 cursor-pointer items-center justify-center rounded-full border transition-colors hover:text-white"
            >
              <Trash className="size-4.5" />
            </button>
          )}

          {/* Fermer */}
          <button
            type="button"
            onClick={onClose}
            title="Fermer (Échap)"
            className="ml-1 flex size-9 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/15 text-white transition-colors hover:bg-white hover:text-black"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>

      {/* Conteneur principal de l'image */}
      <div
        onClick={onClose}
        className="relative flex w-full flex-1 items-center justify-center p-4 sm:p-8"
      >
        {/* Flèche Gauche */}
        {hasPrev && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            title="Précédent (Flèche gauche)"
            className="absolute top-1/2 left-4 z-40 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/60 text-white backdrop-blur-md transition-all hover:scale-105 hover:bg-white hover:text-black"
          >
            <CaretLeft className="size-6" />
          </button>
        )}

        {/* Flèche Droite */}
        {hasNext && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            title="Suivant (Flèche droite)"
            className="absolute top-1/2 right-4 z-40 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/60 text-white backdrop-blur-md transition-all hover:scale-105 hover:bg-white hover:text-black"
          >
            <CaretRight className="size-6" />
          </button>
        )}

        {/* Image elle-même */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative flex max-h-[82vh] max-w-[92vw] items-center justify-center overflow-hidden rounded-lg shadow-2xl"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.imageUrl}
            alt={item.title}
            className="max-h-[82vh] max-w-[92vw] rounded-lg object-contain"
          />
        </div>
      </div>

      {/* Légende inférieure élégante et intégrée */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="z-40 flex w-full justify-center bg-gradient-to-t from-black/95 via-black/80 to-transparent px-4 pt-8 pb-6 text-white sm:px-8"
      >
        <div className="flex w-full max-w-5xl flex-col justify-between gap-4 sm:flex-row sm:items-center">
          {/* Informations auteur & texte */}
          <div className="flex min-w-0 items-start gap-3.5">
            <SkinHead
              size="default"
              username={item.author.minecraftUsername}
              uuid={item.author.minecraftUuid}
              avatarUrl={item.author.minecraftAvatarUrl}
              updatedAt={item.author.minecraftSkinUpdatedAt}
              className="mt-0.5 shrink-0"
            />
            <div className="flex min-w-0 flex-col gap-0.5">
              <h2 className="font-heading truncate text-base font-semibold tracking-tight text-white sm:text-xl">
                {item.title}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-white/70 sm:text-sm">
                {item.author.characterName ? (
                  <>
                    <span className="font-medium text-white">{item.author.characterName}</span>
                    {item.author.minecraftUsername && (
                      <span className="text-white/60">({item.author.minecraftUsername})</span>
                    )}
                  </>
                ) : (
                  <span className="font-medium text-white">{authorName}</span>
                )}
                <span className="text-white/40">•</span>
                <span className="text-white/60">
                  {formatDate(item.createdAt, {
                    style: "prefix-long",
                    withTime: false,
                    withYear: true,
                  })}
                </span>
              </div>
              {item.description && (
                <p className="mt-1 line-clamp-2 max-w-2xl text-xs leading-relaxed text-white/80">
                  {item.description}
                </p>
              )}
            </div>
          </div>

          {/* Bouton Like élégant */}
          <div className="flex shrink-0 items-center justify-end sm:self-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLike}
              disabled={isPending}
              className={cn(
                "cursor-pointer rounded-full px-4 py-2 text-xs font-semibold backdrop-blur-md transition-all",
                liked
                  ? "border-rose-500 bg-rose-500 text-white hover:bg-rose-600 hover:text-white"
                  : "border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-rose-400"
              )}
            >
              <Heart className={cn("size-3.5", liked && "fill-current")} />
              <span>{likesCount}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function GalleryLightbox(props: GalleryLightboxProps) {
  if (!props.item) return null;
  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex flex-col items-center justify-between overflow-hidden bg-black/95 backdrop-blur-md duration-200 select-none">
      <GalleryLightboxContent key={props.item.id} {...props} item={props.item} />
    </div>
  );
}
