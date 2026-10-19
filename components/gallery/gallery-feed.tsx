"use client";

import { useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  MagnifyingGlass,
  Images,
  X,
  ArrowCounterClockwise,
  GridNine,
  SquaresFour,
  Square,
} from "@phosphor-icons/react";
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
import { GalleryUploadDialog } from "@/components/gallery/gallery-upload-dialog";
import { setClientPagePref } from "@/lib/table-preferences";
import { cn } from "@/lib/utils";
import type { GalleryCategoryItemConfig } from "@/lib/gallery-category-config";

export type GalleryGridSize = "sm" | "md" | "lg";

interface GalleryFeedProps {
  initialItems: GalleryCardItem[];
  currentUser?: {
    id: string;
    role: string;
    registrationStatus?: string | null;
  } | null;
  categories: GalleryCategoryItemConfig[];
  categoryLabels: Record<string, string>;
  submissionsEnabled?: boolean;
  initialGridSize?: GalleryGridSize;
}

export function GalleryFeed({
  initialItems,
  currentUser,
  categories,
  categoryLabels,
  submissionsEnabled = true,
  initialGridSize = "md",
}: GalleryFeedProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [gridSize, setGridSize] = useState<GalleryGridSize>(initialGridSize);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"recent" | "likes">("recent");
  const [selectedLightboxItem, setSelectedLightboxItem] = useState<GalleryCardItem | null>(null);

  const handleGridSizeChange = (newSize: GalleryGridSize) => {
    setGridSize(newSize);
    setClientPagePref("/gallery", { galleryGridSize: newSize });
  };

  const categoryItems = useMemo(
    () => [
      { value: "ALL", label: "Toutes les catégories" },
      ...categories.map((cat) => ({ value: cat.id, label: cat.label })),
    ],
    [categories]
  );

  const sortItems = useMemo(
    () => [
      { value: "recent", label: "Plus récentes" },
      { value: "likes", label: "Plus aimées" },
    ],
    []
  );

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
          const characterName = (item.author.characterName ?? "").toLowerCase();
          const matchesTitle = item.title.toLowerCase().includes(q);
          const matchesDesc = item.description?.toLowerCase().includes(q) ?? false;
          const matchesAuthor = authorName.includes(q) || characterName.includes(q);

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
    <div className="flex flex-col gap-8">
      {/* En-tête épuré avec sélecteur de taille et bouton de partage */}
      <div className="border-border/60 flex flex-wrap items-center justify-between gap-4 border-b pb-6">
        <h1 className="font-heading text-3xl tracking-tight sm:text-[40px]">Galerie</h1>
        <div className="flex items-center gap-2.5">
          {/* Boîte de 3 icônes de sélection de taille */}
          <div
            role="group"
            aria-label="Taille d'affichage des captures"
            className="border-border/80 bg-muted/40 flex items-center rounded-lg border p-0.5 shadow-2xs"
          >
            <button
              type="button"
              onClick={() => handleGridSizeChange("sm")}
              title="Petite taille"
              aria-label="Petite taille"
              className={cn(
                "flex size-8 cursor-pointer items-center justify-center rounded-md transition-all",
                gridSize === "sm"
                  ? "bg-background text-foreground font-medium shadow-xs"
                  : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
              )}
            >
              <GridNine className="size-4" weight={gridSize === "sm" ? "bold" : "regular"} />
            </button>
            <button
              type="button"
              onClick={() => handleGridSizeChange("md")}
              title="Taille moyenne"
              aria-label="Taille moyenne"
              className={cn(
                "flex size-8 cursor-pointer items-center justify-center rounded-md transition-all",
                gridSize === "md"
                  ? "bg-background text-foreground font-medium shadow-xs"
                  : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
              )}
            >
              <SquaresFour className="size-4" weight={gridSize === "md" ? "bold" : "regular"} />
            </button>
            <button
              type="button"
              onClick={() => handleGridSizeChange("lg")}
              title="Grande taille"
              aria-label="Grande taille"
              className={cn(
                "flex size-8 cursor-pointer items-center justify-center rounded-md transition-all",
                gridSize === "lg"
                  ? "bg-background text-foreground font-medium shadow-xs"
                  : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
              )}
            >
              <Square className="size-4" weight={gridSize === "lg" ? "bold" : "regular"} />
            </button>
          </div>

          <GalleryUploadDialog
            currentUser={currentUser}
            submissionsEnabled={submissionsEnabled}
            categories={categories}
          />
        </div>
      </div>

      {/* Barre de recherche et filtres harmonisée */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Champ de recherche */}
          <div className="relative">
            <MagnifyingGlass className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par titre ou joueur..."
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
            items={categoryItems}
            value={selectedCategory}
            onValueChange={(val) => setSelectedCategory(val ?? "ALL")}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Toutes les catégories">
                {categoryItems.find((c) => c.value === selectedCategory)?.label ??
                  "Toutes les catégories"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {categoryItems.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Tri */}
          <Select
            items={sortItems}
            value={sortBy}
            onValueChange={(val) => val && setSortBy(val as "recent" | "likes")}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Trier par">
                {sortItems.find((s) => s.value === sortBy)?.label ?? "Trier par"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {sortItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
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

      {/* Grille des captures intelligente */}
      {filteredItems.length > 0 ? (
        <div
          className={cn(
            "grid transition-all duration-200",
            gridSize === "sm" &&
              "grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5",
            gridSize === "md" && "grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3",
            gridSize === "lg" && "grid-cols-1 gap-8 md:grid-cols-2"
          )}
        >
          {filteredItems.map((item, idx) => (
            <GalleryCard
              key={item.id}
              item={item}
              onOpen={handleOpenLightbox}
              currentUserId={currentUser?.id}
              priority={idx < (gridSize === "sm" ? 10 : gridSize === "lg" ? 4 : 6)}
              categoryLabels={categoryLabels}
              gridSize={gridSize}
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
