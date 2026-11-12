"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PencilSimple, Tag } from "@phosphor-icons/react";
import { toast } from "sonner";

import { updateTicketCategories } from "@/lib/actions/ticket-actions";
import type { TicketCategoryConfigData } from "@/lib/actions/ticket-config-actions";
import { formatTicketCategoryName, isTechniqueCategory } from "@/lib/navigation";
import { TicketCategory } from "@/lib/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface TicketCategoryBadgeEditorProps {
  ticketId: string;
  categoryId?: string | null;
  subcategoryId?: string | null;
  categoryName: string;
  subcategoryName?: string | null;
  category?: TicketCategory;
  availableCategories: TicketCategoryConfigData[];
  className?: string;
}

export function TicketCategoryBadgeEditor({
  ticketId,
  categoryId,
  subcategoryId,
  categoryName,
  subcategoryName,
  category,
  availableCategories,
  className,
}: TicketCategoryBadgeEditorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Trouver la catégorie initiale
  const initialCategory =
    availableCategories.find((c) =>
      categoryId
        ? c.id === categoryId
        : isTechniqueCategory(c, category) === (category === TicketCategory.TECHNIQUE) ||
          c.slug === (category === TicketCategory.TECHNIQUE ? "technique" : "rp") ||
          c.name.toLowerCase() === categoryName.toLowerCase()
    ) ?? availableCategories[0];

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(initialCategory?.id ?? "");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>(subcategoryId ?? "");

  const selectedCategory = availableCategories.find((c) => c.id === selectedCategoryId);
  const subcategories = selectedCategory?.subcategories ?? [];
  const selectedSubcategory = subcategories.find((s) => s.id === selectedSubcategoryId);

  function handleOpen(nextOpen: boolean) {
    if (nextOpen) {
      // Synchroniser avec les valeurs courantes
      const currentCat =
        availableCategories.find((c) =>
          categoryId
            ? c.id === categoryId
            : isTechniqueCategory(c, category) === (category === TicketCategory.TECHNIQUE) ||
              c.slug === (category === TicketCategory.TECHNIQUE ? "technique" : "rp") ||
              c.name.toLowerCase() === categoryName.toLowerCase()
        ) ?? availableCategories[0];
      setSelectedCategoryId(currentCat?.id ?? "");
      setSelectedSubcategoryId(subcategoryId ?? "");
    }
    setOpen(nextOpen);
  }

  function handleCategoryChange(newCatId: string | null) {
    if (!newCatId) return;
    setSelectedCategoryId(newCatId);
    // Si la nouvelle catégorie ne contient pas la sous-catégorie sélectionnée, on réinitialise
    const newCat = availableCategories.find((c) => c.id === newCatId);
    if (!newCat?.subcategories.some((s) => s.id === selectedSubcategoryId)) {
      setSelectedSubcategoryId("");
    }
  }

  function handleSubmit() {
    if (!selectedCategoryId) return;

    startTransition(async () => {
      try {
        const res = await updateTicketCategories({
          ticketId,
          categoryId: selectedCategoryId,
          subcategoryId: selectedSubcategoryId || null,
        });

        if (res.success) {
          toast.success("Catégories du ticket mises à jour.");
          setOpen(false);
          router.refresh();
        } else {
          toast.error(res.error || "Une erreur est survenue.");
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
      }
    });
  }

  const displayCategory = formatTicketCategoryName(categoryName) || "Ticket";

  return (
    <>
      <button
        type="button"
        onClick={() => handleOpen(true)}
        className={cn(
          "group border-border/80 bg-muted/30 text-foreground hover:border-primary/50 hover:bg-muted/70 inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs transition-all",
          className
        )}
        title="Modifier les catégories du ticket"
      >
        <span className="font-normal">{displayCategory}</span>
        {subcategoryName && (
          <span className="text-foreground/85 font-medium">· {subcategoryName}</span>
        )}
        <PencilSimple className="text-muted-foreground/70 group-hover:text-primary size-3 transition-colors" />
      </button>

      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="text-primary size-5" />
              <span>Modifier les catégories du ticket</span>
            </DialogTitle>
            <DialogDescription>
              Modifie la catégorie et la sous-catégorie de ce ticket, qu&apos;il soit archivé ou
              non.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ticket-category-select">Catégorie principale</Label>
              <Select
                items={availableCategories.map((cat) => ({
                  value: cat.id,
                  label: formatTicketCategoryName(cat.name),
                }))}
                value={selectedCategoryId}
                onValueChange={handleCategoryChange}
                disabled={isPending}
              >
                <SelectTrigger id="ticket-category-select" className="w-full">
                  <SelectValue placeholder="Choisir une catégorie...">
                    {selectedCategory ? formatTicketCategoryName(selectedCategory.name) : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {formatTicketCategoryName(cat.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {subcategories.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ticket-subcategory-select">Sous-catégorie</Label>
                <Select
                  items={[
                    { value: "none", label: "Aucune sous-catégorie" },
                    ...subcategories.map((sub) => ({
                      value: sub.id,
                      label: sub.name,
                    })),
                  ]}
                  value={selectedSubcategoryId || "none"}
                  onValueChange={(val: string | null) =>
                    setSelectedSubcategoryId(!val || val === "none" ? "" : val)
                  }
                  disabled={isPending}
                >
                  <SelectTrigger id="ticket-subcategory-select" className="w-full">
                    <SelectValue placeholder="Choisir une sous-catégorie (optionnelle)...">
                      {selectedSubcategory ? (
                        selectedSubcategory.name
                      ) : (
                        <span className="text-muted-foreground italic">Aucune sous-catégorie</span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-muted-foreground italic">Aucune sous-catégorie</span>
                    </SelectItem>
                    {subcategories.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs italic">
                Aucune sous-catégorie définie pour cette catégorie.
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || !selectedCategoryId}
            >
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
