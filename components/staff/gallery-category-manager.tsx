"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Tag, FloppyDisk } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { saveGalleryCategoriesConfigAction } from "@/lib/actions/gallery-actions";
import type { GalleryCategoryItemConfig } from "@/lib/gallery-category-config";
import { cn } from "@/lib/utils";

interface GalleryCategoryManagerProps {
  initialCategories?: GalleryCategoryItemConfig[];
}

export function GalleryCategoryManager({
  initialCategories = [],
}: GalleryCategoryManagerProps) {
  const [categories, setCategories] = useState<GalleryCategoryItemConfig[]>(initialCategories);
  const [isPending, startTransition] = useTransition();

  const handleToggleCategory = (id: string, enabled: boolean) => {
    setCategories((prev) => prev.map((cat) => (cat.id === id ? { ...cat, enabled } : cat)));
  };

  const handleLabelChange = (id: string, label: string) => {
    setCategories((prev) => prev.map((cat) => (cat.id === id ? { ...cat, label } : cat)));
  };

  const handleSave = () => {
    const atLeastOneEnabled = categories.some((c) => c.enabled);
    if (!atLeastOneEnabled) {
      toast.error("Au moins une catégorie doit être activée.");
      return;
    }

    startTransition(async () => {
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
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between gap-3 p-4 pb-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <Tag className="size-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Catégories d&apos;images</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Activez les catégories disponibles pour les joueurs et personnalisez leurs libellés sur le site.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={isPending}
          className="h-8 shrink-0 gap-1.5 text-xs"
        >
          <FloppyDisk className="size-3.5" />
          <span>{isPending ? "Enregistrement..." : "Enregistrer les catégories"}</span>
        </Button>
      </CardHeader>

      <CardContent className="p-4 pt-0">
        <div className="divide-y rounded-md border bg-muted/10">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between gap-3 p-2.5 text-xs transition-colors hover:bg-muted/20"
            >
              <div className="flex items-center gap-2.5">
                <Switch
                  checked={cat.enabled}
                  onCheckedChange={(checked) => handleToggleCategory(cat.id, checked)}
                  id={`cat-switch-${cat.id}`}
                  className="scale-90"
                />
                <span className="font-mono text-[11px] uppercase text-muted-foreground">
                  {cat.id}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    cat.enabled
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground"
                  )}
                >
                  {cat.enabled ? "Active" : "Désactivée"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  id={`cat-label-${cat.id}`}
                  value={cat.label}
                  onChange={(e) => handleLabelChange(cat.id, e.target.value)}
                  disabled={!cat.enabled}
                  placeholder="Libellé affiché"
                  className="h-7 w-44 text-xs disabled:opacity-50"
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
