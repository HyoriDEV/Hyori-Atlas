"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Tag, FloppyDisk } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { saveGalleryCategoriesConfigAction } from "@/lib/actions/gallery-actions";
import type { GalleryCategoryItemConfig } from "@/lib/gallery-category-config";

interface GallerySettingsTabProps {
  defaultValues: {
    publicGalleryEnabled?: boolean;
    gallerySubmissionsEnabled?: boolean;
    galleryAutoApprove?: boolean;
    galleryMaxDailyUploads?: number;
  };
  initialCategories: GalleryCategoryItemConfig[];
}

export function GallerySettingsTab({ defaultValues, initialCategories }: GallerySettingsTabProps) {
  const [categories, setCategories] = useState<GalleryCategoryItemConfig[]>(initialCategories);
  const [isPendingCategories, startCategoriesTransition] = useTransition();

  const handleToggleCategory = (id: string, enabled: boolean) => {
    setCategories((prev) => prev.map((cat) => (cat.id === id ? { ...cat, enabled } : cat)));
  };

  const handleLabelChange = (id: string, label: string) => {
    setCategories((prev) => prev.map((cat) => (cat.id === id ? { ...cat, label } : cat)));
  };

  const handleSaveCategories = () => {
    const atLeastOneEnabled = categories.some((c) => c.enabled);
    if (!atLeastOneEnabled) {
      toast.error("Au moins une catégorie doit être activée.");
      return;
    }

    startCategoriesTransition(async () => {
      try {
        await saveGalleryCategoriesConfigAction(categories);
        toast.success("Catégories de la galerie enregistrées avec succès.");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Erreur lors de l'enregistrement des catégories."
        );
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 1. RÉGLAGES GÉNÉRAUX & ACCÈS */}
      <div className="bg-card divide-y rounded-lg border">
        <SettingRow
          name="publicGalleryEnabled"
          label="Page Galerie (/gallery)"
          description="Rend la galerie publique accessible aux visiteurs et aux joueurs"
          defaultChecked={defaultValues.publicGalleryEnabled ?? true}
        />
        <SettingRow
          name="gallerySubmissionsEnabled"
          label="Autoriser les soumissions de captures"
          description="Permet aux joueurs whitelistés de partager de nouvelles captures d'écran"
          defaultChecked={defaultValues.gallerySubmissionsEnabled ?? true}
        />
        <SettingRow
          name="galleryAutoApprove"
          label="Publication automatique (sans modération préalable)"
          description="Publie instantanément les captures sans passer par la file d'attente staff"
          defaultChecked={defaultValues.galleryAutoApprove ?? false}
        />
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">Limite quotidienne par joueur</span>
            <span className="text-muted-foreground text-xs">
              Nombre maximum de captures qu&apos;un joueur peut soumettre par jour
            </span>
          </div>
          <input
            type="number"
            name="galleryMaxDailyUploads"
            min="1"
            max="50"
            defaultValue={defaultValues.galleryMaxDailyUploads ?? 5}
            className="border-input bg-background w-20 rounded-md border px-3 py-1.5 text-right text-sm font-medium"
          />
        </div>
      </div>

      {/* 2. GESTION DES CATÉGORIES STAFF */}
      <Card>
        <CardHeader className="p-4 pb-2 sm:p-6">
          <div className="flex items-center gap-2">
            <Tag className="text-primary size-5" />
            <CardTitle className="text-base font-semibold">Catégories de la galerie</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Activez ou désactivez les catégories disponibles pour les joueurs et personnalisez leurs
            libellés affichés sur le site.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-2 sm:p-6">
          <div className="bg-muted/20 divide-border divide-y rounded-lg border">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <Switch
                    checked={cat.enabled}
                    onCheckedChange={(checked) => handleToggleCategory(cat.id, checked)}
                    id={`cat-switch-${cat.id}`}
                  />
                  <div className="flex flex-col">
                    <span className="text-muted-foreground font-mono text-xs">{cat.id}</span>
                    <span className="text-muted-foreground text-xs">
                      {cat.enabled ? (
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                          Active
                        </span>
                      ) : (
                        <span>Désactivée</span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label
                    htmlFor={`cat-label-${cat.id}`}
                    className="text-muted-foreground text-xs sm:sr-only"
                  >
                    Libellé :
                  </label>
                  <Input
                    id={`cat-label-${cat.id}`}
                    value={cat.label}
                    onChange={(e) => handleLabelChange(cat.id, e.target.value)}
                    disabled={!cat.enabled}
                    placeholder="Libellé affiché"
                    className="h-8 w-full text-sm sm:w-48"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSaveCategories}
              disabled={isPendingCategories}
              className="gap-1.5"
            >
              {isPendingCategories ? (
                <>Enregistrement...</>
              ) : (
                <>
                  <FloppyDisk className="size-4" />
                  <span>Enregistrer les catégories</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingRow({
  name,
  label,
  description,
  defaultChecked = false,
}: {
  name: string;
  label: string;
  description?: string;
  defaultChecked?: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <div
      onClick={() => setChecked(!checked)}
      className="hover:bg-muted/40 flex cursor-pointer items-center justify-between p-4 transition-colors select-none"
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{label}</span>
        {description && <span className="text-muted-foreground text-xs">{description}</span>}
      </div>
      <div onClick={(e) => e.stopPropagation()} className="flex items-center">
        <Switch
          id={`setting-${name}`}
          name={name}
          value="true"
          checked={checked}
          onCheckedChange={setChecked}
        />
      </div>
    </div>
  );
}
