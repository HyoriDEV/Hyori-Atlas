"use client";

import { useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { MagnifyingGlass, Images, X, ArrowCounterClockwise } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GalleryCard, GalleryCardItem } from "@/components/gallery/gallery-card";
import { GalleryLightbox } from "@/components/gallery/gallery-lightbox";
import type { GalleryCategoryItemConfig } from "@/lib/gallery-category-config";

interface GalleryFeedProps {
  initialItems: GalleryCardItem[];
  currentUser?: {
    id: string;
    role: string;
    registrationStatus?: string | null;
  } | null;
  categories: GalleryCategoryItemConfig[];
  categoryLabels: Record<string, string>;
}

export function GalleryFeed({
  initialItems,
  currentUser,
  categories,
  categoryLabels,
}: GalleryFeedProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"recent" | "likes">("recent");
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

  const handleResetFilters = () => {
    setSearch("");
    setSelectedCategory("ALL");
    setSortBy("recent");
  };

  const isFiltered = Boolean(search.trim()) || selectedCategory !== "ALL" || sortBy !== "recent";

  // Filtrage et Tri en mémoire
  const filteredItems = useMemo(() => {
    return initialItems
      .filter((item) => {
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
          const matchesDesc = item.description?.toLowerCase().includes(q) ?? false;
          const matchesAuthor = authorName.includes(q);

          if (!matchesTitle && !matchesDesc && !matchesAuthor) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "likes") {
          return b.likeCount - a.likeCount;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [initialItems, selectedCategory, search, sortBy]);

  return (
    <div className="flex flex-col gap-6">
      {/* Barre de recherche et filtres harmonisée */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Champ de recherche */}
          <div className="relative">
            <MagnifyingGlass className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par titre, description, joueur..."
              className="w-72 pr-8 pl-8 sm:w-80"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer p-0.5"
                title="Effacer la recherche"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>

          {/* Filtre par catégorie */}
          <Select
            value={selectedCategory}
            onValueChange={(val) => setSelectedCategory(val ?? "ALL")}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Toutes les catégories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Toutes les catégories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Tri */}
          <Select
            value={sortBy}
            onValueChange={(val) => val && setSortBy(val as "recent" | "likes")}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Trier par" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Plus récentes</SelectItem>
              <SelectItem value="likes">Plus aimées</SelectItem>
            </SelectContent>
          </Select>

          {/* Bouton de réinitialisation */}
          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs"
            >
              <ArrowCounterClockwise className="size-3.5" />
              Réinitialiser
            </Button>
          )}
        </div>

        <div className="text-muted-foreground text-xs font-medium">
          {filteredItems.length} capture{filteredItems.length > 1 ? "s" : ""}
        </div>
      </div>

      {/* Grille des captures */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item, idx) => (
            <GalleryCard
              key={item.id}
              item={item}
              onOpen={handleOpenLightbox}
              currentUserId={currentUser?.id}
              priority={idx < 6}
              categoryLabels={categoryLabels}
            />
          ))}
        </div>
      ) : (
        <div className="border-border bg-card/40 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-16 text-center">
          <div className="bg-muted/60 text-muted-foreground flex size-14 items-center justify-center rounded-full">
            <Images className="size-7" />
          </div>
          <div className="flex max-w-sm flex-col gap-1">
            <h3 className="font-heading text-lg font-semibold">Aucune capture trouvée</h3>
            <p className="text-muted-foreground text-sm">
              {search || selectedCategory !== "ALL"
                ? "Aucune capture ne correspond à vos filtres actuels."
                : "La galerie n'a pas encore de captures publiées. Soyez le premier à partager votre cliché !"}
            </p>
          </div>
          {isFiltered && (
            <Button
              variant="link"
              size="sm"
              onClick={handleResetFilters}
              className="text-primary mt-1 text-xs"
            >
              Réinitialiser les filtres
            </Button>
          )}
        </div>
      )}

      {/* Lightbox Plein Écran */}
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
