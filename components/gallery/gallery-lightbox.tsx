"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import {
  X,
  CaretLeft,
  CaretRight,
  Heart,
  ShareNetwork,
  DownloadSimple,
  MapPin,
  Sparkle,
  Trash,
  Info,
} from "@phosphor-icons/react";
import { SkinHead } from "@/components/ui/skin-head";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  GalleryCardItem,
  GALLERY_CATEGORY_LABELS,
} from "@/components/gallery/gallery-card";
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

  const canDelete = currentUserId && (currentUserId === item.author.id || currentUserRole === "ADMIN");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md select-none animate-in fade-in duration-200">
      {/* Barre d'action supérieure */}
      <div className="absolute top-0 inset-x-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className="bg-white/10 text-white/90 border-white/20 backdrop-blur-md text-xs font-medium"
          >
            {GALLERY_CATEGORY_LABELS[item.category] || "Capture"}
          </Badge>
          {item.isFeatured && (
            <Badge className="bg-amber-500/90 text-amber-950 font-semibold text-xs flex items-center gap-1 shadow-md">
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
              showInfo ? "bg-white/20 text-white" : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
            )}
          >
            <Info className="size-5" />
          </button>

          <button
            type="button"
            onClick={handleShare}
            title="Copier le lien permanent"
            className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
          >
            <ShareNetwork className="size-5" />
          </button>

          <a
            href={item.imageUrl}
            download={`hyori-${item.id}.webp`}
            target="_blank"
            rel="noopener noreferrer"
            title="Télécharger l'image HD"
            className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
          >
            <DownloadSimple className="size-5" />
          </a>

          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              title="Supprimer la capture"
              className="flex size-10 items-center justify-center rounded-full bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white transition-colors"
            >
              <Trash className="size-5" />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            title="Fermer (Échap)"
            className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/25 hover:text-white transition-colors ml-2"
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
          className="absolute left-4 top-1/2 -translate-y-1/2 z-40 flex size-12 items-center justify-center rounded-full bg-black/50 text-white/80 hover:bg-black/80 hover:text-white backdrop-blur-md transition-all hover:scale-105 border border-white/10"
        >
          <CaretLeft className="size-6" />
        </button>
      )}

      {hasNext && (
        <button
          type="button"
          onClick={handleNext}
          title="Suivant (Flèche droite)"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-40 flex size-12 items-center justify-center rounded-full bg-black/50 text-white/80 hover:bg-black/80 hover:text-white backdrop-blur-md transition-all hover:scale-105 border border-white/10"
        >
          <CaretRight className="size-6" />
        </button>
      )}

      {/* Conteneur principal de l'image */}
      <div
        onClick={onClose}
        className={cn(
          "relative flex size-full items-center justify-center p-4 sm:p-12 transition-all duration-300",
          showInfo ? "sm:pr-[380px]" : ""
        )}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative max-h-full max-w-full overflow-hidden rounded-lg shadow-2xl flex items-center justify-center"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.imageUrl}
            alt={item.title}
            className="max-h-[85vh] max-w-[85vw] object-contain rounded-lg"
          />
        </div>
      </div>

      {/* Volet Latéral des Détails */}
      {showInfo && (
        <aside
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 inset-y-0 w-full sm:w-[360px] z-40 bg-zinc-950/90 text-zinc-100 border-l border-zinc-800/80 p-6 flex flex-col justify-between backdrop-blur-2xl overflow-y-auto animate-in slide-in-from-right duration-200"
        >
          <div className="flex flex-col gap-5 pt-12 sm:pt-4">
            {/* Titre & Date */}
            <div className="flex flex-col gap-1.5">
              <span className="text-zinc-400 text-xs font-mono uppercase tracking-wider">
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
            <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
              <SkinHead
                size="lg"
                username={item.author.minecraftUsername}
                uuid={item.author.minecraftUuid}
                avatarUrl={item.author.minecraftAvatarUrl}
                updatedAt={item.author.minecraftSkinUpdatedAt}
              />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">{authorName}</span>
                <span className="text-xs text-zinc-400 font-mono">
                  {item.author.discordDisplayName ?? item.author.discordUsername ?? "Membre"}
                </span>
              </div>
            </div>

            {/* Description narrative / anecdote RP */}
            {item.description && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Récit & Contexte RP
                </span>
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line bg-zinc-900/40 p-3 rounded-lg border border-zinc-800/60 font-serif">
                  {item.description}
                </p>
              </div>
            )}

            {/* Données de localisation & Shader */}
            <div className="flex flex-col gap-2.5 text-xs text-zinc-300">
              {item.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-emerald-400 shrink-0" />
                  <span className="text-zinc-200 font-medium">Lieu :</span>
                  <span className="text-zinc-300">{item.location}</span>
                </div>
              )}

              {item.shader && (
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400 font-medium">Shader / Pack :</span>
                  <span className="text-zinc-200">{item.shader}</span>
                </div>
              )}
            </div>

            {/* Personnages / Joueurs identifiés */}
            {item.taggedUsers && item.taggedUsers.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Personnages identifiés
                </span>
                <div className="flex flex-wrap gap-2">
                  {item.taggedUsers.map(({ user }) => {
                    const tagName = user.minecraftUsername ?? user.discordDisplayName ?? "Joueur";
                    return (
                      <div
                        key={user.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-200"
                      >
                        <SkinHead
                          size="sm"
                          username={user.minecraftUsername}
                          uuid={user.minecraftUuid}
                          avatarUrl={user.minecraftAvatarUrl}
                          updatedAt={user.minecraftSkinUpdatedAt}
                        />
                        <span>{tagName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Action Like & Interaction */}
          <div className="pt-6 border-t border-zinc-800/80 flex items-center justify-between">
            <Button
              type="button"
              variant={liked ? "default" : "outline"}
              onClick={handleLike}
              disabled={isPending}
              className={cn(
                "w-full gap-2 text-sm font-semibold transition-all",
                liked
                  ? "bg-rose-600 hover:bg-rose-500 text-white"
                  : "bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-700 hover:text-rose-400"
              )}
            >
              <Heart className={cn("size-4", liked && "fill-current")} />
              <span>{liked ? "Aimé" : "J'aime"} ({likesCount})</span>
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
