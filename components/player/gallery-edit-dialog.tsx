"use client";

import { useState, useTransition } from "react";
import { PencilSimple } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { updateGalleryItemMetadataAction } from "@/lib/actions/gallery-actions";
import { GalleryCategory } from "@/lib/generated/prisma/enums";
import { GALLERY_CATEGORY_LABELS, type GalleryCardItem } from "@/components/gallery/gallery-card";
import { toast } from "sonner";

interface GalleryEditDialogProps {
  item: GalleryCardItem;
  categories?: { id: GalleryCategory; label: string }[];
}

export function GalleryEditDialog({ item, categories }: GalleryEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description || "");
  const [category, setCategory] = useState<GalleryCategory>(item.category);
  const [isSpoiler, setIsSpoiler] = useState(item.isSpoiler ?? false);
  const [isPending, startTransition] = useTransition();

  const availableCategories =
    categories && categories.length > 0
      ? categories
      : Object.entries(GALLERY_CATEGORY_LABELS).map(([k, v]) => ({
          id: k as GalleryCategory,
          label: v,
        }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Le titre ne peut pas être vide.");
      return;
    }

    startTransition(async () => {
      try {
        await updateGalleryItemMetadataAction(item.id, {
          title: title.trim(),
          description: description.trim() || null,
          category,
          isSpoiler,
        });
        toast.success("Capture mise à jour.");
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur lors de la modification.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground size-7 p-0"
            title="Modifier les informations"
          >
            <PencilSimple className="size-4" />
          </Button>
        }
      />
      <DialogContent className="p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg font-semibold">
            Modifier la capture
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`edit-title-${item.id}`} className="text-xs font-medium">
              Titre <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`edit-title-${item.id}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={120}
              className="text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`edit-cat-${item.id}`} className="text-xs font-medium">
              Catégorie <span className="text-destructive">*</span>
            </Label>
            <Select
              value={category}
              onValueChange={(val) => val && setCategory(val as GalleryCategory)}
            >
              <SelectTrigger id={`edit-cat-${item.id}`} className="w-full text-sm">
                <SelectValue placeholder="Choisir une catégorie" />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`edit-desc-${item.id}`} className="text-xs font-medium">
              Description (Optionnelle)
            </Label>
            <Textarea
              id={`edit-desc-${item.id}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={1000}
              className="resize-none text-xs"
            />
          </div>

          <div className="border-border bg-muted/20 flex items-center justify-between rounded-lg border p-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium">Contenu sensible / Spoiler RP</span>
              <span className="text-muted-foreground text-[11px]">
                Masque l&apos;image par défaut avec un avertissement
              </span>
            </div>
            <Switch
              checked={isSpoiler}
              onCheckedChange={setIsSpoiler}
              id={`edit-spoiler-${item.id}`}
            />
          </div>

          <DialogFooter className="border-border/60 gap-2 border-t pt-2 sm:gap-0">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
