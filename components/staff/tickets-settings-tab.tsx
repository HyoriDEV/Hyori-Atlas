"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Plus,
  PencilSimple,
  Trash,
  ShieldCheck,
  Tag,
  ArrowSquareOut,
} from "@phosphor-icons/react";

import { Role } from "@/lib/generated/prisma/enums";
import { staffRoleLabels } from "@/lib/navigation";
import {
  saveTicketCategoryAction,
  deleteTicketCategoryAction,
  saveTicketSubcategoryAction,
  deleteTicketSubcategoryAction,
  type TicketCategoryConfigData,
  type TicketSubcategoryConfigData,
} from "@/lib/actions/ticket-config-actions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface TicketsSettingsTabProps {
  initialCategories?: TicketCategoryConfigData[];
}

const STAFF_ROLES: Role[] = [
  Role.ADMIN,
  Role.HELPER,
  Role.CONFLICT_MANAGEMENT,
  Role.RP_TRACKING,
  Role.EVENT,
  Role.DEVELOPER,
];

export function TicketsSettingsTab({
  initialCategories = [],
}: TicketsSettingsTabProps) {
  const [categories, setCategories] = useState<TicketCategoryConfigData[]>(initialCategories);

  // Category Edit Modal State
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<TicketCategoryConfigData> | null>(
    null
  );
  const [isSavingCategory, startSaveCategoryTransition] = useTransition();

  // Subcategory Edit Modal State
  const [subcategoryModalOpen, setSubcategoryModalOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] =
    useState<Partial<TicketSubcategoryConfigData> | null>(null);
  const [isSavingSubcategory, startSaveSubcategoryTransition] = useTransition();

  // Handle Category Save
  const handleSaveCategory = () => {
    if (!editingCategory?.name?.trim() || !editingCategory?.slug?.trim()) {
      toast.error("Le nom et le slug de la catégorie sont obligatoires.");
      return;
    }

    startSaveCategoryTransition(async () => {
      try {
        const res = await saveTicketCategoryAction({
          id: editingCategory.id,
          slug: editingCategory.slug || "",
          name: editingCategory.name || "",
          description: editingCategory.description,
          icon: editingCategory.icon,
          enabled: editingCategory.enabled ?? true,
          allowedRoles: editingCategory.allowedRoles ?? [],
        });

        if (res.success) {
          toast.success(editingCategory.id ? "Catégorie modifiée !" : "Nouvelle catégorie créée !");
          setCategoryModalOpen(false);
          setCategories((prev) => {
            if (editingCategory.id) {
              return prev.map((c) =>
                c.id === editingCategory.id
                  ? { ...c, ...(editingCategory as TicketCategoryConfigData) }
                  : c
              );
            }
            return [
              ...prev,
              {
                id: `temp_${Date.now()}`,
                slug: editingCategory.slug!,
                name: editingCategory.name!,
                description: editingCategory.description || null,
                icon: editingCategory.icon || null,
                order: prev.length,
                enabled: editingCategory.enabled ?? true,
                allowedRoles: editingCategory.allowedRoles ?? [],
                subcategories: [],
              },
            ];
          });
        } else {
          toast.error(res.error || "Erreur lors de l'enregistrement.");
        }
      } catch {
        toast.error("Erreur inattendue.");
      }
    });
  };

  // Handle Category Delete / Disable
  const handleDeleteCategory = (cat: TicketCategoryConfigData) => {
    if (!confirm(`Supprimer ou désactiver la catégorie "${cat.name}" ?`)) return;
    startSaveCategoryTransition(async () => {
      const res = await deleteTicketCategoryAction(cat.id);
      if (res.success) {
        toast.success(res.message || "Catégorie retirée avec succès.");
        setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      } else {
        toast.error(res.error || "Impossible de supprimer.");
      }
    });
  };

  // Handle Subcategory Save
  const handleSaveSubcategory = () => {
    if (
      !editingSubcategory?.name?.trim() ||
      !editingSubcategory?.slug?.trim() ||
      !editingSubcategory?.categoryId
    ) {
      toast.error("Le nom, le slug et la catégorie parente sont obligatoires.");
      return;
    }

    startSaveSubcategoryTransition(async () => {
      try {
        const res = await saveTicketSubcategoryAction({
          id: editingSubcategory.id,
          categoryId: editingSubcategory.categoryId || "",
          slug: editingSubcategory.slug || "",
          name: editingSubcategory.name || "",
          description: editingSubcategory.description,
          placeholderSubject: editingSubcategory.placeholderSubject,
          placeholderDescription: editingSubcategory.placeholderDescription,
          enabled: editingSubcategory.enabled ?? true,
        });

        if (res.success) {
          toast.success(
            editingSubcategory.id ? "Sous-catégorie modifiée !" : "Nouvelle sous-catégorie créée !"
          );
          setSubcategoryModalOpen(false);
          setCategories((prev) =>
            prev.map((cat) => {
              if (cat.id !== editingSubcategory.categoryId) return cat;
              if (editingSubcategory.id) {
                return {
                  ...cat,
                  subcategories: cat.subcategories.map((s) =>
                    s.id === editingSubcategory.id
                      ? { ...s, ...(editingSubcategory as TicketSubcategoryConfigData) }
                      : s
                  ),
                };
              }
              return {
                ...cat,
                subcategories: [
                  ...cat.subcategories,
                  {
                    id: `temp_sub_${Date.now()}`,
                    categoryId: editingSubcategory.categoryId!,
                    slug: editingSubcategory.slug!,
                    name: editingSubcategory.name!,
                    description: editingSubcategory.description || null,
                    order: cat.subcategories.length,
                    enabled: editingSubcategory.enabled ?? true,
                    placeholderSubject: editingSubcategory.placeholderSubject || null,
                    placeholderDescription: editingSubcategory.placeholderDescription || null,
                  },
                ],
              };
            })
          );
        } else {
          toast.error(res.error || "Erreur lors de l'enregistrement.");
        }
      } catch {
        toast.error("Erreur inattendue.");
      }
    });
  };

  // Handle Subcategory Delete
  const handleDeleteSubcategory = (sub: TicketSubcategoryConfigData) => {
    if (!confirm(`Supprimer ou désactiver la sous-catégorie "${sub.name}" ?`)) return;
    startSaveSubcategoryTransition(async () => {
      const res = await deleteTicketSubcategoryAction(sub.id);
      if (res.success) {
        toast.success(res.message || "Sous-catégorie retirée.");
        setCategories((prev) =>
          prev.map((cat) => {
            if (cat.id !== sub.categoryId) return cat;
            return {
              ...cat,
              subcategories: cat.subcategories.filter((s) => s.id !== sub.id),
            };
          })
        );
      } else {
        toast.error(res.error || "Erreur de suppression.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête et info */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-lg font-semibold">
            Catégories &amp; Sous-catégories de tickets
          </h2>
          <p className="text-muted-foreground text-xs">
            Personnalisez les formulaires d&apos;ouverture de tickets, les guides de saisie et les rôles staff assignés.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 self-start sm:self-auto text-xs"
          onClick={() => {
            setEditingCategory({
              name: "",
              slug: "",
              description: "",
              enabled: true,
              allowedRoles: [Role.ADMIN],
            });
            setCategoryModalOpen(true);
          }}
        >
          <Plus className="size-3.5" />
          <span>Nouvelle catégorie</span>
        </Button>
      </div>

      {/* Rappel d'intégration Discord */}
      <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <ArrowSquareOut className="size-4 shrink-0 text-primary" />
        <span>
          Les salons Discord et les rôles notifiés pour la création de tickets se configurent dans l&apos;onglet <strong>Discord</strong>.
        </span>
      </div>

      {/* Liste compacte des catégories */}
      <div className="flex flex-col gap-4">
        {categories.map((cat) => (
          <Card key={cat.id} className={cn("border-border/60 overflow-hidden", !cat.enabled && "opacity-60")}>
            <CardHeader className="bg-muted/20 p-3.5 sm:p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <Tag className="size-4 text-primary shrink-0" />
                  <span className="font-semibold text-sm">{cat.name}</span>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {cat.slug}
                  </Badge>
                  {!cat.enabled && (
                    <Badge variant="destructive" className="text-[10px]">
                      Désactivée
                    </Badge>
                  )}
                  <span className="text-muted-foreground text-xs">
                    ({cat.subcategories.length} sous-catégorie{cat.subcategories.length > 1 ? "s" : ""})
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => {
                      setEditingSubcategory({
                        categoryId: cat.id,
                        name: "",
                        slug: "",
                        description: "",
                        placeholderSubject: "",
                        placeholderDescription: "",
                        enabled: true,
                      });
                      setSubcategoryModalOpen(true);
                    }}
                  >
                    <Plus className="size-3" />
                    <span className="hidden sm:inline">Sous-catégorie</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => {
                      setEditingCategory(cat);
                      setCategoryModalOpen(true);
                    }}
                  >
                    <PencilSimple className="size-3" />
                    <span>Modifier</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteCategory(cat)}
                  >
                    <Trash className="size-3" />
                  </Button>
                </div>
              </div>

              {cat.description && (
                <p className="text-muted-foreground text-xs mt-1">{cat.description}</p>
              )}
            </CardHeader>

            <CardContent className="p-3.5 sm:p-4 flex flex-col gap-3">
              {/* Rôles staff autorisés */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-muted-foreground text-[11px] font-medium flex items-center gap-1">
                  <ShieldCheck className="size-3.5 text-primary" /> Rôles staff autorisés :
                </span>
                {cat.allowedRoles && cat.allowedRoles.length > 0 ? (
                  cat.allowedRoles.map((r) => (
                    <Badge key={r} variant="secondary" className="text-[10px] py-0 px-1.5">
                      {staffRoleLabels[r] || r}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground text-[11px] italic">Tous les administrateurs</span>
                )}
              </div>

              {/* Sous-catégories compactes */}
              {cat.subcategories.length > 0 ? (
                <div className="divide-y rounded-md border bg-muted/10">
                  {cat.subcategories.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between gap-3 p-2.5 text-xs hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{sub.name}</span>
                          <Badge variant="outline" className="font-mono text-[9px] py-0">
                            {sub.slug}
                          </Badge>
                          {!sub.enabled && (
                            <Badge variant="destructive" className="text-[9px] py-0">
                              Désactivée
                            </Badge>
                          )}
                        </div>
                        {sub.description && (
                          <p className="text-muted-foreground text-[11px] truncate max-w-md">
                            {sub.description}
                          </p>
                        )}
                        {sub.placeholderSubject && (
                          <p className="text-muted-foreground/80 text-[10px] truncate max-w-md italic">
                            Sujet : {sub.placeholderSubject}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[11px]"
                          onClick={() => {
                            setEditingSubcategory(sub);
                            setSubcategoryModalOpen(true);
                          }}
                        >
                          <PencilSimple className="size-3 mr-1" />
                          Éditer
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteSubcategory(sub)}
                        >
                          <Trash className="size-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-3 text-xs text-muted-foreground border border-dashed rounded-md">
                  Aucune sous-catégorie configurée pour le moment.
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* MODALE : ÉDITION CATÉGORIE */}
      <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCategory?.id ? "Modifier la catégorie" : "Nouvelle catégorie de ticket"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cat-name">Nom d&apos;affichage</Label>
                <Input
                  id="cat-name"
                  value={editingCategory?.name || ""}
                  onChange={(e) => setEditingCategory((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Ticket RP, Ticket technique..."
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cat-slug">Identifiant technique (slug)</Label>
                <Input
                  id="cat-slug"
                  value={editingCategory?.slug || ""}
                  onChange={(e) => setEditingCategory((p) => ({ ...p, slug: e.target.value }))}
                  placeholder="Ex: rp, technique..."
                  disabled={Boolean(editingCategory?.id)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cat-desc">Description courte pour le joueur</Label>
              <Textarea
                id="cat-desc"
                rows={2}
                value={editingCategory?.description || ""}
                onChange={(e) => setEditingCategory((p) => ({ ...p, description: e.target.value }))}
                placeholder="Explication claire du but de cette catégorie..."
              />
            </div>

            {/* Rôles staff autorisés */}
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-semibold">
                Rôles staff autorisés à voir cette catégorie
              </Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {STAFF_ROLES.map((role) => {
                  const isChecked = editingCategory?.allowedRoles?.includes(role) ?? false;
                  return (
                    <label
                      key={role}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded border p-2 text-xs transition-colors",
                        isChecked
                          ? "border-primary bg-primary/5 font-medium"
                          : "border-border text-muted-foreground"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setEditingCategory((p) => {
                            const roles = p?.allowedRoles || [];
                            return {
                              ...p,
                              allowedRoles: checked
                                ? [...roles, role]
                                : roles.filter((r) => r !== role),
                            };
                          });
                        }}
                        className="border-border text-primary rounded"
                      />
                      <span>{staffRoleLabels[role] || role}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-sm">Catégorie active (visible à la création)</span>
              <Switch
                checked={editingCategory?.enabled ?? true}
                onCheckedChange={(checked) =>
                  setEditingCategory((p) => ({ ...p, enabled: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCategoryModalOpen(false)}>
              Annuler
            </Button>
            <Button type="button" onClick={handleSaveCategory} disabled={isSavingCategory}>
              {isSavingCategory ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODALE : ÉDITION SOUS-CATÉGORIE */}
      <Dialog open={subcategoryModalOpen} onOpenChange={setSubcategoryModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSubcategory?.id ? "Modifier la sous-catégorie" : "Nouvelle sous-catégorie"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sub-name">Nom</Label>
                <Input
                  id="sub-name"
                  value={editingSubcategory?.name || ""}
                  onChange={(e) => setEditingSubcategory((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Demande suivi RP, Report de bug..."
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sub-slug">Slug</Label>
                <Input
                  id="sub-slug"
                  value={editingSubcategory?.slug || ""}
                  onChange={(e) => setEditingSubcategory((p) => ({ ...p, slug: e.target.value }))}
                  placeholder="Ex: rp_tracking, bug..."
                  disabled={Boolean(editingSubcategory?.id)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sub-desc">Description indicative</Label>
              <Textarea
                id="sub-desc"
                rows={2}
                value={editingSubcategory?.description || ""}
                onChange={(e) =>
                  setEditingSubcategory((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Précisez ce que cette sous-catégorie couvre..."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sub-placeholder-subject">
                Placeholder du sujet (suggestion pour le joueur)
              </Label>
              <Input
                id="sub-placeholder-subject"
                value={editingSubcategory?.placeholderSubject || ""}
                onChange={(e) =>
                  setEditingSubcategory((p) => ({ ...p, placeholderSubject: e.target.value }))
                }
                placeholder="Ex: Demande de validation pour un projet de taverne..."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sub-placeholder-desc">
                Placeholder du message (guidage pour le joueur)
              </Label>
              <Textarea
                rows={3}
                id="sub-placeholder-desc"
                value={editingSubcategory?.placeholderDescription || ""}
                onChange={(e) =>
                  setEditingSubcategory((p) => ({ ...p, placeholderDescription: e.target.value }))
                }
                placeholder="Ex: Détaillez votre projet, les personnages impliqués..."
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-sm">Sous-catégorie active</span>
              <Switch
                checked={editingSubcategory?.enabled ?? true}
                onCheckedChange={(checked) =>
                  setEditingSubcategory((p) => ({ ...p, enabled: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSubcategoryModalOpen(false)}>
              Annuler
            </Button>
            <Button type="button" onClick={handleSaveSubcategory} disabled={isSavingSubcategory}>
              {isSavingSubcategory ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
