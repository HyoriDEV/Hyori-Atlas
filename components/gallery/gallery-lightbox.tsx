"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import {
  X,
  CaretLeft,
  CaretRight,
  Heart,
  ShareNetwork,
  DownloadSimple,
  Sparkle,
  Trash,
  Info,
} from "@phosphor-icons/react";
import { SkinHead } from "@/components/ui/skin-head";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GalleryCardItem, GALLERY_CATEGORY_LABELS } from "@/components/gallery/gallery-card";
import { toggleGalleryLikeAction, deleteGalleryItemAction } from "@/lib/actions/gallery-actions";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  const [showInfo, setShowInfo] = useState(true);
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

  // Navigation clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "i" || e.key === "I") {
        setShowInfo((prev) => !prev);
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

  const canDelete =
    currentUserId && (currentUserId === item.author.id || currentUserRole === "ADMIN");

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md duration-200 select-none">
      {/* Barre d'action supérieure */}
      <div className="absolute inset-x-0 top-0 z-50 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent p-4">
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className="border-white/20 bg-white/10 text-xs font-medium text-white/90 backdrop-blur-md"
          >
            {GALLERY_CATEGORY_LABELS[item.category] || "Capture"}
          </Badge>
          {item.isFeatured && (
            <Badge className="flex items-center gap-1 bg-amber-500/90 text-xs font-semibold text-amber-950 shadow-md">
              <Sparkle className="size-3 fill-current" /> Coup de cœur
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 text-white">
          <button
            type="button"
            onClick={() => setShowInfo((prev) => !prev)}
            title="Afficher/Masquer les détails (I)"
            className={cn(
              "flex size-10 items-center justify-center rounded-full transition-colors",
              showInfo
                ? "bg-white/20 text-white"
                : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
            )}
          >
            <Info className="size-5" />
          </button>

          <button
            type="button"
            onClick={handleShare}
            title="Copier le lien permanent"
            className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
          >
            <ShareNetwork className="size-5" />
          </button>

          <a
            href={item.imageUrl}
            download={`hyori-${item.id}.webp`}
            target="_blank"
            rel="noopener noreferrer"
            title="Télécharger l'image HD"
            className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
          >
            <DownloadSimple className="size-5" />
          </a>

          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              title="Supprimer la capture"
              className="flex size-10 items-center justify-center rounded-full bg-rose-500/20 text-rose-300 transition-colors hover:bg-rose-500 hover:text-white"
            >
              <Trash className="size-5" />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            title="Fermer (Échap)"
            className="ml-2 flex size-10 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/25 hover:text-white"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>

      {/* Boutons de navigation Flèches */}
      {hasPrev && (
        <button
          type="button"
          onClick={handlePrev}
          title="Précédent (Flèche gauche)"
          className="absolute top-1/2 left-4 z-40 flex size-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white/80 backdrop-blur-md transition-all hover:scale-105 hover:bg-black/80 hover:text-white"
        >
          <CaretLeft className="size-6" />
        </button>
      )}

      {hasNext && (
        <button
          type="button"
          onClick={handleNext}
          title="Suivant (Flèche droite)"
          className="absolute top-1/2 right-4 z-40 flex size-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white/80 backdrop-blur-md transition-all hover:scale-105 hover:bg-black/80 hover:text-white"
        >
          <CaretRight className="size-6" />
        </button>
      )}

      {/* Conteneur principal de l'image */}
      <div
        onClick={onClose}
        className={cn(
          "relative flex size-full items-center justify-center p-4 transition-all duration-300 sm:p-12",
          showInfo ? "sm:pr-[380px]" : ""
        )}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative flex max-h-full max-w-full items-center justify-center overflow-hidden rounded-lg shadow-2xl"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.imageUrl}
            alt={item.title}
            className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain"
          />
        </div>
      </div>

      {/* Volet Latéral des Détails */}
      {showInfo && (
        <aside
          onClick={(e) => e.stopPropagation()}
          className="animate-in slide-in-from-right absolute inset-y-0 right-0 z-40 flex w-full flex-col justify-between overflow-y-auto border-l border-zinc-800/80 bg-zinc-950/90 p-6 text-zinc-100 backdrop-blur-2xl duration-200 sm:w-[360px]"
        >
          <div className="flex flex-col gap-5 pt-12 sm:pt-4">
            {/* Titre & Date */}
            <div className="flex flex-col gap-1.5">
              <span className="font-mono text-xs tracking-wider text-zinc-400 uppercase">
                {formatDate(item.createdAt, {
                  style: "prefix-long",
                  withTime: false,
                  withYear: true,
                })}
              </span>
              <h2 className="font-heading text-2xl font-bold tracking-tight text-white">
                {item.title}
              </h2>
            </div>

            {/* Auteur */}
            <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/80 p-3">
              <SkinHead
                size="lg"
                username={item.author.minecraftUsername}
                uuid={item.author.minecraftUuid}
                avatarUrl={item.author.minecraftAvatarUrl}
                updatedAt={item.author.minecraftSkinUpdatedAt}
              />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">{authorName}</span>
                <span className="font-mono text-xs text-zinc-400">
                  {item.author.discordDisplayName ?? item.author.discordUsername ?? "Membre"}
                </span>
              </div>
            </div>

            {/* Description narrative / anecdote RP */}
            {item.description && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium tracking-wider text-zinc-400 uppercase">
                  Récit & Contexte RP
                </span>
                <p className="rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-3 font-serif text-sm leading-relaxed whitespace-pre-line text-zinc-300">
                  {item.description}
                </p>
              </div>
            )}
          </div>

          {/* Action Like & Interaction */}
          <div className="flex items-center justify-between border-t border-zinc-800/80 pt-6">
            <Button
              type="button"
              variant={liked ? "default" : "outline"}
              onClick={handleLike}
              disabled={isPending}
              className={cn(
                "w-full gap-2 text-sm font-semibold transition-all",
                liked
                  ? "bg-rose-600 text-white hover:bg-rose-500"
                  : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-rose-400"
              )}
            >
              <Heart className={cn("size-4", liked && "fill-current")} />
              <span>
                {liked ? "Aimé" : "J'aime"} ({likesCount})
              </span>
            </Button>
          </div>
        </aside>
      )}
    </div>
  );
}

export function GalleryLightbox(props: GalleryLightboxProps) {
  if (!props.item) return null;
  return <GalleryLightboxContent key={props.item.id} {...props} item={props.item} />;
}
