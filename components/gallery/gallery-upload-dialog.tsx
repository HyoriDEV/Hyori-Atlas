"use client";

import { useState, useRef, useTransition } from "react";
import Image from "next/image";
import { UploadSimple, Image as ImageIcon, X } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
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
import { submitGalleryItemAction } from "@/lib/actions/gallery-actions";
import { GalleryCategory, RegistrationStatus } from "@/lib/generated/prisma/enums";
import { GALLERY_CATEGORY_LABELS } from "@/components/gallery/gallery-card";
import { validateGalleryImageFile } from "@/lib/upload-config";
import { toast } from "sonner";

interface GalleryUploadDialogProps {
  currentUser?: {
    id: string;
    role: string;
    registrationStatus?: string | null;
  } | null;
  submissionsEnabled?: boolean;
  categories?: { id: GalleryCategory; label: string }[];
}

export function GalleryUploadDialog({
  currentUser,
  submissionsEnabled = true,
  categories,
}: GalleryUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [category, setCategory] = useState<GalleryCategory>(GalleryCategory.PAYSAGE);
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [isPending, startTransition] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableCategories =
    categories && categories.length > 0
      ? categories
      : Object.entries(GALLERY_CATEGORY_LABELS).map(([k, v]) => ({
          id: k as GalleryCategory,
          label: v,
        }));

  const isWhitelisted =
    currentUser?.role === "ADMIN" ||
    currentUser?.registrationStatus === RegistrationStatus.WHITELISTED;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateGalleryImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error || "Fichier invalide.");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const validation = validateGalleryImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error || "Fichier invalide.");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Veuillez sélectionner une image.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set("file", selectedFile);
    formData.set("category", category);
    formData.set("isSpoiler", isSpoiler ? "true" : "false");

    startTransition(async () => {
      try {
        const res = await submitGalleryItemAction(formData);
        if (res.status === "APPROVED") {
          toast.success("Capture publiée avec succès dans la galerie !");
        } else {
          toast.success("Capture envoyée ! Elle sera examinée par le staff avant publication.");
        }
        setOpen(false);
        handleClearFile();
        setIsSpoiler(false);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Erreur lors de l'envoi.");
      }
    });
  };

  // Le bouton ne doit être visible que lorsque l'on est connecté et whitelisté
  if (!currentUser || !isWhitelisted) {
    return null;
  }

  if (!submissionsEnabled && currentUser.role !== "ADMIN") {
    return (
      <Button variant="outline" disabled className="text-muted-foreground gap-2">
        <UploadSimple className="size-4" />
        <span>Soumissions suspendues</span>
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="gap-2">
            <UploadSimple className="size-4" />
            <span>Partager une capture</span>
          </Button>
        }
      />

      <DialogContent className="gap-6 p-6 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-semibold">
            Partager une capture d&apos;écran
          </DialogTitle>
          <DialogDescription>
            Partagez vos scènes et vos paysages avec la communauté de Hyori RP (format 16:9
            recommandé).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
            {/* Colonne gauche : Téléversement ou aperçu 16:9 */}
            <div className="flex flex-col gap-2">
              <Label className="text-foreground text-xs font-medium">
                Image <span className="text-destructive">*</span>
              </Label>
              {!previewUrl ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 flex aspect-video cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors"
                >
                  <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
                    <ImageIcon className="size-6" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium">
                      Cliquez pour importer ou glissez un fichier ici
                    </span>
                    <span className="text-muted-foreground text-xs">
                      JPEG, PNG ou WebP — Jusqu&apos;à 15 Mo
                    </span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="group relative aspect-video w-full overflow-hidden rounded-lg border bg-black/60 shadow-inner">
                  <Image src={previewUrl} alt="Aperçu capture" fill className="object-cover" />
                  <button
                    type="button"
                    onClick={handleClearFile}
                    className="absolute top-2.5 right-2.5 flex size-7 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-black"
                    title="Changer d'image"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Colonne droite : Champs essentiels (Titre, Catégorie, Description, Spoiler) */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="gallery-upload-title"
                  className="text-foreground text-xs font-medium"
                >
                  Titre de la capture <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="gallery-upload-title"
                  name="title"
                  required
                  maxLength={120}
                  placeholder="ex: Les lueurs de l'aube sur la taverne..."
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="gallery-upload-category"
                  className="text-foreground text-xs font-medium"
                >
                  Catégorie <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={category}
                  onValueChange={(val) => val && setCategory(val as GalleryCategory)}
                >
                  <SelectTrigger id="gallery-upload-category" className="w-full">
                    <SelectValue placeholder="Choisir une catégorie">
                      {availableCategories.find((c) => c.id === category)?.label ??
                        "Choisir une catégorie"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="gallery-upload-description"
                  className="text-foreground text-xs font-medium"
                >
                  Description (Optionnelle)
                </Label>
                <Textarea
                  id="gallery-upload-description"
                  name="description"
                  rows={3}
                  maxLength={1000}
                  placeholder="Racontez le moment rôleplay ou l'atmosphère de cette capture..."
                  className="resize-none text-xs"
                />
              </div>

              {/* Spoiler RP Switch */}
              <div className="border-border bg-muted/20 flex items-center justify-between rounded-lg border p-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium">Contenu sensible / Spoiler RP</span>
                  <span className="text-muted-foreground text-[11px]">
                    Floute l&apos;image par défaut sur la galerie
                  </span>
                </div>
                <Switch
                  checked={isSpoiler}
                  onCheckedChange={setIsSpoiler}
                  id="gallery-upload-spoiler"
                />
              </div>
            </div>
          </div>

          {/* Boutons d'action */}
          <DialogFooter className="gap-2 border-t pt-3 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending || !selectedFile}>
              {isPending ? "Envoi en cours..." : "Partager la capture"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
