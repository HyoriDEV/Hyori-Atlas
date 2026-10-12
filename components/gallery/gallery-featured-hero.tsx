"use client";

import Image from "next/image";
import { Sparkle, MapPin, Eye, Heart } from "@phosphor-icons/react";
import { SkinHead } from "@/components/ui/skin-head";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GalleryCardItem, GALLERY_CATEGORY_LABELS } from "@/components/gallery/gallery-card";
import { formatDate } from "@/lib/date";

interface GalleryFeaturedHeroProps {
  item: GalleryCardItem | null;
  onOpen: (item: GalleryCardItem) => void;
}

export function GalleryFeaturedHero({ item, onOpen }: GalleryFeaturedHeroProps) {
  if (!item) return null;

  const authorName = item.author.minecraftUsername ?? item.author.discordDisplayName ?? "Joueur";

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card/95 to-muted/40 shadow-xl transition-all duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
        {/* Colonne texte / contexte */}
        <div className="flex flex-col gap-5 p-6 sm:p-10 lg:col-span-5 z-10">
          <div className="flex items-center gap-2">
            <Badge className="border-amber-400/40 bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center gap-1.5 px-3 py-1 text-xs font-semibold backdrop-blur-md">
              <Sparkle className="size-3.5 fill-current" />
              Capture de la Semaine
            </Badge>
            <Badge variant="outline" className="text-xs">
              {GALLERY_CATEGORY_LABELS[item.category] || "Capture"}
            </Badge>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground leading-tight">
              {item.title}
            </h2>
            {item.description ? (
              <p className="text-sm sm:text-base text-muted-foreground line-clamp-3 leading-relaxed font-serif">
                {item.description}
              </p>
            ) : item.location ? (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <MapPin className="size-4 text-primary shrink-0" />
                <span>Prise au lieu : {item.location}</span>
              </p>
            ) : null}
          </div>

          {/* Profil Auteur & Date */}
          <div className="flex items-center justify-between border-t border-border/60 pt-4">
            <div className="flex items-center gap-3">
              <SkinHead
                size="lg"
                username={item.author.minecraftUsername}
                uuid={item.author.minecraftUuid}
                avatarUrl={item.author.minecraftAvatarUrl}
                updatedAt={item.author.minecraftSkinUpdatedAt}
              />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">{authorName}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(item.createdAt, {
                    style: "prefix-long",
                    withTime: false,
                    withYear: true,
                  })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-medium text-rose-500">
              <Heart className="size-4 fill-current" />
              <span>{item.likeCount}</span>
            </div>
          </div>

          <div className="pt-2">
            <Button
              onClick={() => onOpen(item)}
              className="gap-2 rounded-xl shadow-md transition-transform hover:scale-102"
            >
              <Eye className="size-4" />
              Explorer en plein écran
            </Button>
          </div>
        </div>

        {/* Colonne Image Plein Format avec zoom au hover */}
        <div
          onClick={() => onOpen(item)}
          className="group relative cursor-pointer lg:col-span-7 h-[320px] sm:h-[420px] lg:h-[460px] overflow-hidden bg-black/40"
        >
          <Image
            src={item.imageUrl}
            alt={item.title}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 60vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent lg:bg-gradient-to-r lg:from-card/60 lg:via-transparent lg:to-transparent" />
          <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white backdrop-blur-md transition-opacity group-hover:bg-black/80">
            <Eye className="size-3.5" />
            <span>Agrandir</span>
          </div>
        </div>
      </div>
    </section>
  );
}
