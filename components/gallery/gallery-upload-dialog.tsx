"use client";

import { useState, useRef, useTransition } from "react";
import Image from "next/image";
import { UploadSimple, Image as ImageIcon, X, Sparkle, WarningCircle, EyeSlash } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
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
}

export function GalleryUploadDialog({
  currentUser,
  submissionsEnabled = true,
}: GalleryUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [category, setCategory] = useState<GalleryCategory>(GalleryCategory.PAYSAGE);
  const [isPending, startTransition] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);

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
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Erreur lors de l'envoi.");
      }
    });
  };

  // Bouton déclencheur
  if (!currentUser) {
    return (
      <Button
        variant="default"
        onClick={() => {
          window.location.href = "/api/auth/signin/discord";
        }}
        className="gap-2 rounded-xl shadow-md"
      >
        <UploadSimple className="size-4" />
        <span>Partager une capture</span>
      </Button>
    );
  }

  if (!isWhitelisted) {
    return (
      <Button
        variant="outline"
        onClick={() => {
          toast.info("Seuls les joueurs acceptés sur la whitelist peuvent partager leurs captures.");
        }}
        className="gap-2 rounded-xl text-muted-foreground"
      >
        <UploadSimple className="size-4" />
        <span>Partager une capture</span>
      </Button>
    );
  }

  if (!submissionsEnabled && currentUser.role !== "ADMIN") {
    return (
      <Button
        variant="outline"
        disabled
        className="gap-2 rounded-xl text-muted-foreground"
      >
        <UploadSimple className="size-4" />
        <span>Soumissions suspendues</span>
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="gap-2 rounded-xl shadow-md transition-transform hover:scale-102" />
        }
      >
        <UploadSimple className="size-4" />
        <span>Partager une capture</span>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl flex items-center gap-2">
            <Sparkle className="size-5 text-primary" />
            Partager une capture en jeu
          </DialogTitle>
          <DialogDescription>
            Partagez vos moments forts, vos décors et vos scènes de rôleplay avec toute la communauté.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-2">
          {/* Zone Drag & Drop ou Preview */}
          {!previewUrl ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border hover:border-primary/60 bg-muted/20 hover:bg-muted/40 transition-colors rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer text-center"
            >
              <div className="size-14 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <ImageIcon className="size-7" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold">
                  Cliquez pour choisir un screenshot ou glissez-le ici
                </span>
                <span className="text-xs text-muted-foreground">
                  Formats acceptés : JPEG, PNG, WEBP — Jusqu&apos;à 15 Mo
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
            <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden border bg-black/60 shadow-inner group">
              <Image
                src={previewUrl}
                alt="Aperçu capture"
                fill
                className="object-contain"
              />
              <button
                type="button"
                onClick={handleClearFile}
                className="absolute top-3 right-3 size-8 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center transition-transform hover:scale-110"
              >
                <X className="size-4" />
              </button>
            </div>
          )}

          {/* Astuce F1 */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-primary/5 border border-primary/15 text-xs text-muted-foreground">
            <WarningCircle className="size-4 text-primary shrink-0 mt-0.5" />
            <span>
              <strong>Conseil immersion :</strong> Pensez à activer le mode cinéma avec la touche <strong>F1</strong> en jeu pour cacher l&apos;interface (HUD, inventaire, chat) et sublimer votre scène !
            </span>
          </div>

          {/* Formulaire métadonnées */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="title" className="text-xs font-semibold">
                Titre de la capture <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="title"
                name="title"
                required
                maxLength={120}
                placeholder="ex: Les lueurs de l'aube sur la Taverne..."
                className="rounded-xl"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category" className="text-xs font-semibold">
                Catégorie
              </Label>
              <Select
                value={category}
                onValueChange={(val) => setCategory(val as GalleryCategory)}
              >
                <SelectTrigger id="category" className="rounded-xl">
                  <SelectValue placeholder="Choisir une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(GALLERY_CATEGORY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="location" className="text-xs font-semibold">
                Lieu en jeu (Optionnel)
              </Label>
              <Input
                id="location"
                name="location"
                maxLength={100}
                placeholder="ex: Le Port de Hyori, Forêt des Murmures"
                className="rounded-xl"
              />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="shader" className="text-xs font-semibold">
                Shaders / Texture Pack (Optionnel)
              </Label>
              <Input
                id="shader"
                name="shader"
                maxLength={100}
                placeholder="ex: Complementary Reimagined, BSL v8..."
                className="rounded-xl"
              />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="description" className="text-xs font-semibold">
                Récit & Contexte RP (Optionnel)
              </Label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                maxLength={1000}
                placeholder="Racontez le moment rôleplay, l'anecdote ou l'atmosphère de cette capture..."
                className="rounded-xl resize-none font-serif text-sm"
              />
            </div>

            {/* Switch Spoiler RP */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/80 bg-muted/20 sm:col-span-2">
              <div className="flex items-center gap-2.5">
                <EyeSlash className="size-5 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold">Spoiler d&apos;intrigue RP</span>
                  <span className="text-[11px] text-muted-foreground">
                    Flouter la photo sur la galerie publique pour ne pas dévoiler de secret d&apos;histoire.
                  </span>
                </div>
              </div>
              <Switch
                checked={isSpoiler}
                onCheckedChange={setIsSpoiler}
              />
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="rounded-xl"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isPending || !selectedFile}
              className="rounded-xl"
            >
              {isPending ? "Traitement & Envoi..." : "Envoyer la capture"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
