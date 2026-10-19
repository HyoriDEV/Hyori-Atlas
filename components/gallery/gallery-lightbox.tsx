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
  Info,
  ArrowsOutSimple,
  ArrowsInSimple,
} from "@phosphor-icons/react";
import { SkinHead } from "@/components/ui/skin-head";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GalleryCardItem, GALLERY_CATEGORY_LABELS } from "@/components/gallery/gallery-card";
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
  const [showInfo, setShowInfo] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  // Synchronisation fullscreen event
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

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
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
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
    <div className="animate-in fade-in fixed inset-0 z-50 flex flex-col items-center justify-between overflow-hidden bg-black/95 backdrop-blur-md duration-200 select-none">
      {/* Barre d'action supérieure flottante */}
      <div className="z-50 flex w-full items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent p-4">
        <div className="flex items-center gap-2.5">
          <Badge
            variant="secondary"
            className="border-border/60 bg-card/80 text-foreground text-xs font-medium backdrop-blur-md"
          >
            {GALLERY_CATEGORY_LABELS[item.category] || "Capture"}
          </Badge>

          {items.length > 1 && (
            <span className="text-muted-foreground font-mono text-xs">
              {currentIndex + 1} / {items.length}
            </span>
          )}
        </div>

        <div className="text-foreground flex items-center gap-1.5">
          {/* Bouton afficher/masquer légende */}
          <button
            type="button"
            onClick={() => setShowInfo((prev) => !prev)}
            title="Afficher / Masquer la légende (I)"
            className={cn(
              "border-border/40 flex size-9 items-center justify-center rounded-full border transition-colors",
              showInfo
                ? "bg-card text-primary border-primary/40"
                : "bg-card/60 text-muted-foreground hover:bg-card hover:text-foreground"
            )}
          >
            <Info className="size-4.5" />
          </button>

          {/* Plein écran */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Quitter le plein écran (F)" : "Plein écran (F)"}
            className="border-border/40 bg-card/60 text-muted-foreground hover:bg-card hover:text-foreground flex size-9 items-center justify-center rounded-full border transition-colors"
          >
            {isFullscreen ? (
              <ArrowsInSimple className="size-4.5" />
            ) : (
              <ArrowsOutSimple className="size-4.5" />
            )}
          </button>

          {/* Partage */}
          <button
            type="button"
            onClick={handleShare}
            title="Copier le lien permanent"
            className="border-border/40 bg-card/60 text-muted-foreground hover:bg-card hover:text-foreground flex size-9 items-center justify-center rounded-full border transition-colors"
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
            className="border-border/40 bg-card/60 text-muted-foreground hover:bg-card hover:text-foreground flex size-9 items-center justify-center rounded-full border transition-colors"
          >
            <DownloadSimple className="size-4.5" />
          </a>

          {/* Suppression */}
          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              title="Supprimer la capture"
              className="border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive flex size-9 items-center justify-center rounded-full border transition-colors hover:text-white"
            >
              <Trash className="size-4.5" />
            </button>
          )}

          {/* Fermer */}
          <button
            type="button"
            onClick={onClose}
            title="Fermer (Échap)"
            className="border-border/60 bg-card/80 text-foreground hover:bg-primary hover:text-primary-foreground ml-1 flex size-9 items-center justify-center rounded-full border transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>

      {/* Conteneur principal de l'image (Centré à 100%, sans décalage) */}
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
            className="border-border/50 bg-card/70 text-foreground hover:bg-card hover:text-primary absolute top-1/2 left-4 z-40 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border backdrop-blur-md transition-all hover:scale-105"
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
            className="border-border/50 bg-card/70 text-foreground hover:bg-card hover:text-primary absolute top-1/2 right-4 z-40 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border backdrop-blur-md transition-all hover:scale-105"
          >
            <CaretRight className="size-6" />
          </button>
        )}

        {/* Image elle-même */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative flex max-h-[80vh] max-w-[90vw] items-center justify-center overflow-hidden rounded-lg shadow-2xl"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.imageUrl}
            alt={item.title}
            className="max-h-[80vh] max-w-[90vw] rounded-lg object-contain"
          />
        </div>
      </div>

      {/* Légende inférieure flottante (Pas de volet latéral) */}
      {showInfo && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="z-40 flex w-full justify-center bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pb-6"
        >
          <div className="border-border/80 bg-card/90 flex w-full max-w-3xl flex-col justify-between gap-4 rounded-xl border p-4 shadow-2xl backdrop-blur-xl sm:flex-row sm:items-center">
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
              <div className="flex min-w-0 flex-col">
                <div className="flex items-baseline gap-2">
                  <h2 className="font-heading text-foreground truncate text-base font-semibold sm:text-lg">
                    {item.title}
                  </h2>
                </div>
                <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <span className="text-foreground font-medium">{authorName}</span>
                  <span>•</span>
                  <span>
                    {formatDate(item.createdAt, {
                      style: "prefix-long",
                      withTime: false,
                      withYear: true,
                    })}
                  </span>
                </div>
                {item.description && (
                  <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-relaxed">
                    {item.description}
                  </p>
                )}
              </div>
            </div>

            {/* Bouton Like interactif */}
            <div className="flex shrink-0 items-center justify-end sm:self-center">
              <Button
                type="button"
                variant={liked ? "default" : "outline"}
                size="sm"
                onClick={handleLike}
                disabled={isPending}
                className={cn(
                  "gap-1.5 text-xs font-semibold transition-all",
                  liked
                    ? "border-rose-600 bg-rose-600 text-white hover:bg-rose-500"
                    : "border-border bg-card/60 text-foreground hover:bg-card hover:text-rose-500"
                )}
              >
                <Heart className={cn("size-3.5", liked && "fill-current")} />
                <span>{likesCount}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function GalleryLightbox(props: GalleryLightboxProps) {
  if (!props.item) return null;
  return <GalleryLightboxContent key={props.item.id} {...props} item={props.item} />;
}
