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
  Eye,
  EyeSlash,
  MapPin,
  Sparkle,
  Users,
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
  const [liked, setLiked] = useState(item.isLikedByCurrentUser ?? false);
  const [likesCount, setLikesCount] = useState(item.likeCount);
  const [isPending, startTransition] = useTransition();
  const [showDock, setShowDock] = useState(true);

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
  const categoryLabel = GALLERY_CATEGORY_LABELS[item.category] ?? "Capture";

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

  const hasExtraDetails = Boolean(
    item.description ||
      item.location ||
      item.shader ||
      (item.taggedUsers && item.taggedUsers.length > 0)
  );

  return (
    <div className="relative size-full select-none">
      {/* 1. Barre d'action supérieure flottante */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-50 flex items-center justify-between p-4 sm:p-6">
        {/* Compteur d'images à gauche */}
        <div className="pointer-events-auto flex items-center gap-2.5">
          {items.length > 1 && (
            <span className="rounded-full border border-white/15 bg-black/60 px-3.5 py-1 font-mono text-xs font-medium text-white/90 shadow-md backdrop-blur-md">
              {currentIndex + 1} / {items.length}
            </span>
          )}
        </div>

        {/* Boutons d'action à droite */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Mode Cinéma (Afficher / Masquer le dock) */}
          <button
            type="button"
            onClick={() => setShowDock((prev) => !prev)}
            title={showDock ? "Masquer les informations" : "Afficher les informations"}
            className={cn(
              "flex size-9 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/60 text-white/80 shadow-md backdrop-blur-md transition-all hover:scale-105 hover:bg-white hover:text-black",
              !showDock && "border-primary/60 bg-primary/20 text-primary"
            )}
          >
            {showDock ? <EyeSlash className="size-4.5" /> : <Eye className="size-4.5" />}
          </button>

          {/* Partage */}
          <button
            type="button"
            onClick={handleShare}
            title="Copier le lien permanent"
            className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/60 text-white/80 shadow-md backdrop-blur-md transition-all hover:scale-105 hover:bg-white hover:text-black"
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
            className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/60 text-white/80 shadow-md backdrop-blur-md transition-all hover:scale-105 hover:bg-white hover:text-black"
          >
            <DownloadSimple className="size-4.5" />
          </a>

          {/* Suppression */}
          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              title="Supprimer la capture"
              className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-destructive/40 bg-destructive/20 text-destructive shadow-md backdrop-blur-md transition-all hover:scale-105 hover:bg-destructive hover:text-white"
            >
              <Trash className="size-4.5" />
            </button>
          )}

          {/* Fermer */}
          <button
            type="button"
            onClick={onClose}
            title="Fermer (Échap)"
            className="ml-1 flex size-9 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/15 text-white shadow-md backdrop-blur-md transition-all hover:scale-105 hover:bg-white hover:text-black"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>

      {/* 2. Zone d'affichage fixe et constante pour l'image (l'image ne bouge JAMAIS) */}
      <div
        onClick={onClose}
        className="absolute inset-0 flex items-center justify-center px-4 pt-16 pb-36 sm:px-20 sm:pt-20 sm:pb-44"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative flex max-h-full max-w-full items-center justify-center overflow-hidden rounded-xl shadow-2xl transition-transform duration-200"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.imageUrl}
            alt={item.title}
            className="max-h-[calc(100vh-180px)] max-w-[92vw] rounded-xl object-contain shadow-2xl sm:max-h-[calc(100vh-210px)] sm:max-w-[86vw]"
          />
        </div>
      </div>

      {/* 3. Flèches de navigation gauche / droite centrées */}
      {hasPrev && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          title="Précédent (Flèche gauche)"
          className="absolute top-1/2 left-3 z-40 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/60 text-white shadow-xl backdrop-blur-md transition-all hover:scale-110 hover:bg-white hover:text-black sm:left-6 sm:size-12"
        >
          <CaretLeft className="size-6" />
        </button>
      )}

      {hasNext && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          title="Suivant (Flèche droite)"
          className="absolute top-1/2 right-3 z-40 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/60 text-white shadow-xl backdrop-blur-md transition-all hover:scale-110 hover:bg-white hover:text-black sm:right-6 sm:size-12"
        >
          <CaretRight className="size-6" />
        </button>
      )}

      {/* 4. Dock Flottant en verre dépoli (Floating Glass Dock) */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-4 z-40 mx-auto w-full max-w-3xl px-3 transition-all duration-300 sm:bottom-6 sm:px-6",
          showDock
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-6 opacity-0"
        )}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="pointer-events-auto relative flex flex-col gap-2 rounded-2xl border border-white/15 bg-[#181818]/90 p-3.5 text-white shadow-2xl ring-1 ring-black/40 backdrop-blur-xl sm:p-4"
        >
          {/* Ligne principale : Auteur, Titre & Like */}
          <div className="flex items-center justify-between gap-3">
            {/* Gauche : Auteur & Titre */}
            <div className="flex min-w-0 items-center gap-3">
              <SkinHead
                size="default"
                username={item.author.minecraftUsername}
                uuid={item.author.minecraftUuid}
                avatarUrl={item.author.minecraftAvatarUrl}
                updatedAt={item.author.minecraftSkinUpdatedAt}
                className="shrink-0 ring-1 ring-white/15"
              />
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <h2 className="font-heading truncate text-base font-semibold tracking-tight text-[#f8f5e8] sm:text-lg">
                    {item.title}
                  </h2>
                  <Badge
                    variant="secondary"
                    className="hidden shrink-0 border-white/10 bg-white/10 px-2 py-0 text-[11px] font-normal text-white/90 sm:inline-flex"
                  >
                    {categoryLabel}
                  </Badge>
                  {item.isSpoiler && (
                    <Badge
                      variant="outline"
                      className="shrink-0 border-amber-500/40 px-1.5 py-0 text-[10px] font-medium text-amber-400"
                    >
                      Spoiler RP
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
                  {item.author.characterName ? (
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-white">{item.author.characterName}</span>
                      {item.author.minecraftUsername && (
                        <span className="text-white/60">({item.author.minecraftUsername})</span>
                      )}
                    </div>
                  ) : (
                    <span className="font-medium text-white">{authorName}</span>
                  )}
                  <span className="text-white/30">•</span>
                  <span className="text-white/60">
                    {formatDate(item.createdAt, {
                      style: "prefix-long",
                      withTime: false,
                      withYear: true,
                    })}
                  </span>
                  <Badge
                    variant="secondary"
                    className="inline-flex shrink-0 border-white/10 bg-white/10 px-1.5 py-0 text-[10px] font-normal text-white/90 sm:hidden"
                  >
                    {categoryLabel}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Droite : Bouton Like */}
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLike}
                disabled={isPending}
                className={cn(
                  "cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold backdrop-blur-md transition-all gap-1.5",
                  liked
                    ? "border-rose-500 bg-rose-500 text-white hover:bg-rose-600 hover:text-white"
                    : "border-white/15 bg-white/10 text-white hover:bg-white/20 hover:text-rose-400"
                )}
              >
                <Heart className={cn("size-3.5", liked && "fill-current")} />
                <span className="font-mono">{likesCount}</span>
              </Button>
            </div>
          </div>

          {/* Description & métadonnées additionnelles */}
          {hasExtraDetails && (
            <div className="mt-1 flex flex-col gap-2 border-t border-white/10 pt-2.5">
              {item.description && (
                <p className="line-clamp-2 text-xs leading-relaxed text-white/80 sm:text-sm">
                  {item.description}
                </p>
              )}

              {(item.location ||
                item.shader ||
                (item.taggedUsers && item.taggedUsers.length > 0)) && (
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/70">
                  {item.location && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5">
                      <MapPin className="text-primary size-3" />
                      {item.location}
                    </span>
                  )}
                  {item.shader && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5">
                      <Sparkle className="text-primary size-3" />
                      {item.shader}
                    </span>
                  )}
                  {item.taggedUsers && item.taggedUsers.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5">
                      <Users className="text-primary size-3" />
                      {item.taggedUsers
                        .map((t) => t.user.characterName || t.user.minecraftUsername)
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function GalleryLightbox(props: GalleryLightboxProps) {
  if (!props.item) return null;
  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/95 duration-200 select-none backdrop-blur-md">
      <GalleryLightboxContent key={props.item.id} {...props} item={props.item} />
    </div>
  );
}

