"use client";

import { useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  MagnifyingGlass,
  Sparkle,
  Fire,
  Clock,
  Images,
} from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GalleryCard, GalleryCardItem, GALLERY_CATEGORY_LABELS } from "@/components/gallery/gallery-card";
import { GalleryFeaturedHero } from "@/components/gallery/gallery-featured-hero";
import { GalleryLightbox } from "@/components/gallery/gallery-lightbox";
import { GalleryUploadDialog } from "@/components/gallery/gallery-upload-dialog";
import { cn } from "@/lib/utils";

interface GalleryFeedProps {
  initialItems: GalleryCardItem[];
  featuredItem: GalleryCardItem | null;
  currentUser?: {
    id: string;
    role: string;
    registrationStatus?: string | null;
  } | null;
  submissionsEnabled?: boolean;
}

export function GalleryFeed({
  initialItems,
  featuredItem,
  currentUser,
  submissionsEnabled = true,
}: GalleryFeedProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"recent" | "likes" | "featured">("recent");
  const [selectedLightboxItem, setSelectedLightboxItem] = useState<GalleryCardItem | null>(null);

  // Synchronisation avec le query param `?photo=[id]` via état dérivé
  const photoId = searchParams.get("photo");
  const urlMatchedItem = useMemo(() => {
    if (!photoId) return null;
    return initialItems.find((i) => i.id === photoId) ?? null;
  }, [photoId, initialItems]);

  const activeLightboxItem = selectedLightboxItem ?? urlMatchedItem;

  const handleOpenLightbox = (item: GalleryCardItem) => {
    setSelectedLightboxItem(item);
    const params = new URLSearchParams(window.location.search);
    params.set("photo", item.id);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleCloseLightbox = () => {
    setSelectedLightboxItem(null);
    const params = new URLSearchParams(window.location.search);
    params.delete("photo");
    const query = params.toString();
    router.replace(query ? `?${query}` : window.location.pathname, { scroll: false });
  };

  // Filtrage et Tri en mémoire
  const filteredItems = useMemo(() => {
    return initialItems.filter((item) => {
      // Filtre catégorie
      if (selectedCategory !== "ALL" && item.category !== selectedCategory) {
        return false;
      }

      // Filtre texte
      if (search.trim()) {
        const q = search.toLowerCase();
        const authorName = (
          item.author.minecraftUsername ??
          item.author.discordDisplayName ??
          ""
        ).toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesLocation = item.location?.toLowerCase().includes(q) ?? false;
        const matchesDesc = item.description?.toLowerCase().includes(q) ?? false;
        const matchesAuthor = authorName.includes(q);

        if (!matchesTitle && !matchesLocation && !matchesDesc && !matchesAuthor) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "likes") {
        return b.likeCount - a.likeCount;
      }
      if (sortBy === "featured") {
        if (a.isFeatured !== b.isFeatured) {
          return a.isFeatured ? -1 : 1;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [initialItems, selectedCategory, search, sortBy]);

  const isBrowsingAll = selectedCategory === "ALL" && !search.trim();

  return (
    <div className="flex flex-col gap-10">
      {/* Hero "Coup de cœur de la semaine" si aucune recherche n'est en cours */}
      {isBrowsingAll && featuredItem && (
        <GalleryFeaturedHero item={featuredItem} onOpen={handleOpenLightbox} />
      )}

      {/* Barre de contrôle : Filtres, Recherche, Tri et Bouton Soumission */}
      <div className="flex flex-col gap-5 rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Champ de recherche */}
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par titre, lieu, joueur..."
              className="pl-10 rounded-xl"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Tri */}
            <Select
              value={sortBy}
              onValueChange={(val) => setSortBy(val as "recent" | "likes" | "featured")}
            >
              <SelectTrigger className="w-[170px] rounded-xl">
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent" className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-3.5 text-muted-foreground" />
                    <span>Plus récentes</span>
                  </div>
                </SelectItem>
                <SelectItem value="likes">
                  <div className="flex items-center gap-1.5">
                    <Fire className="size-3.5 text-rose-500" />
                    <span>Plus aimées</span>
                  </div>
                </SelectItem>
                <SelectItem value="featured">
                  <div className="flex items-center gap-1.5">
                    <Sparkle className="size-3.5 text-amber-500" />
                    <span>Coups de cœur</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Bouton Partager une capture */}
            <GalleryUploadDialog
              currentUser={currentUser}
              submissionsEnabled={submissionsEnabled}
            />
          </div>
        </div>

        {/* Pilules de catégories */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory("ALL")}
            className={cn(
              "rounded-xl px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all",
              selectedCategory === "ALL"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            Toutes les captures ({initialItems.length})
          </button>
          {Object.entries(GALLERY_CATEGORY_LABELS).map(([key, label]) => {
            const count = initialItems.filter((i) => i.category === key).length;
            const isSelected = selectedCategory === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedCategory(key)}
                className={cn(
                  "rounded-xl px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Grille des captures */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item, idx) => (
            <GalleryCard
              key={item.id}
              item={item}
              onOpen={handleOpenLightbox}
              currentUserId={currentUser?.id}
              priority={idx < 6}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 p-16 text-center rounded-3xl border border-dashed border-border bg-card/40">
          <div className="size-16 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
            <Images className="size-8" />
          </div>
          <div className="flex flex-col gap-1 max-w-sm">
            <h3 className="font-heading text-lg font-semibold">Aucune capture trouvée</h3>
            <p className="text-sm text-muted-foreground">
              {search || selectedCategory !== "ALL"
                ? "Aucune capture ne correspond à vos filtres de recherche actuels."
                : "La galerie n'a pas encore de captures publiées. Soyez le premier à partager votre chef-d'œuvre !"}
            </p>
          </div>
          {(search || selectedCategory !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSelectedCategory("ALL");
              }}
              className="text-xs text-primary underline underline-offset-4 font-medium mt-1"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}

      {/* Visualiseur Lightbox */}
      <GalleryLightbox
        item={activeLightboxItem}
        items={filteredItems}
        onClose={handleCloseLightbox}
        onNavigate={handleOpenLightbox}
        currentUserId={currentUser?.id}
        currentUserRole={currentUser?.role}
      />
    </div>
  );
}
