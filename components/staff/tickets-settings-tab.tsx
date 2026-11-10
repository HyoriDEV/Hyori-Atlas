"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  DiscordLogo,
  Plus,
  PencilSimple,
  Trash,
  Check,
  ShieldCheck,
  EyeSlash,
  Wrench,
  Scroll,
} from "@phosphor-icons/react";

import { Role } from "@/lib/generated/prisma/enums";
import { staffRoleLabels } from "@/lib/navigation";
import {
  saveDiscordTemplatesAction,
  type DiscordTemplateInput,
} from "@/lib/actions/settings-actions";
import {
  saveTicketCategoryAction,
  deleteTicketCategoryAction,
  saveTicketSubcategoryAction,
  deleteTicketSubcategoryAction,
  setCategorySpoilerAction,
  type TicketCategoryConfigData,
  type TicketSubcategoryConfigData,
} from "@/lib/actions/ticket-config-actions";
import type { DiscordTemplateData } from "./discord-settings-tab";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  initialTemplates?: DiscordTemplateData[];
  initialCategories?: TicketCategoryConfigData[];
}

const TICKET_CHANNEL_TEMPLATES = [
  {
    id: "TICKET_RP_CREATED",
    title: "Tickets Roleplay (Standard)",
    description: "Notifications pour les demandes de suivi RP et questions whitelist.",
    icon: Scroll,
    badgeColor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  {
    id: "TICKET_RP_SPOILER_CREATED",
    title: "Tickets Roleplay (Spoiler / Confidentiel)",
    description:
      "Salon réservé aux administrateurs et à l'équipe Suivi RP pour les projets et intrigues sensibles.",
    icon: EyeSlash,
    badgeColor: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
  {
    id: "TICKET_TECH_CREATED",
    title: "Tickets Technique",
    description:
      "Salon dédié aux reports de bug et suggestions, réservé aux administrateurs et développeurs.",
    icon: Wrench,
    badgeColor: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  },
];

const STAFF_ROLES: Role[] = [
  Role.ADMIN,
  Role.HELPER,
  Role.CONFLICT_MANAGEMENT,
  Role.RP_TRACKING,
  Role.EVENT,
  Role.DEVELOPER,
];

export function TicketsSettingsTab({
  initialTemplates = [],
  initialCategories = [],
}: TicketsSettingsTabProps) {
  // --- Discord Channels State ---
  const [templates, setTemplates] = useState<
    Record<string, { channelId: string; roleId: string; enabled: boolean }>
  >(() => {
    const map: Record<string, { channelId: string; roleId: string; enabled: boolean }> = {};
    for (const t of TICKET_CHANNEL_TEMPLATES) {
      const found = initialTemplates.find((x) => x.id === t.id);
      map[t.id] = {
        channelId: found?.channelId || "",
        roleId: found?.roleId || "",
        enabled: found?.enabled ?? true,
      };
    }
    return map;
  });
  const [isSavingDiscord, startSaveDiscordTransition] = useTransition();

  // --- Categories & Subcategories State ---
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

  // Spoiler Option Quick Control
  const rpCategory =
    categories.find((c) => c.slug === "rp") || categories.find((c) => c.allowSpoiler);
  const isSpoilerOptionActive = rpCategory?.allowSpoiler ?? false;
  const [isTogglingSpoiler, startToggleSpoilerTransition] = useTransition();

  const handleToggleSpoilerOption = (nextChecked: boolean) => {
    if (!rpCategory) {
      toast.error("Catégorie Roleplay introuvable.");
      return;
    }

    startToggleSpoilerTransition(async () => {
      const res = await setCategorySpoilerAction(rpCategory.id, nextChecked);
      if (res.success) {
        setCategories((prev) =>
          prev.map((c) => (c.id === rpCategory.id ? { ...c, allowSpoiler: nextChecked } : c))
        );
        toast.success(
          nextChecked
            ? "Option spoiler activée : les joueurs peuvent désormais ouvrir des tickets confidentiels."
            : "Option spoiler désactivée : la case est masquée dans le formulaire d'ouverture joueur."
        );
      } else {
        toast.error(res.error || "Impossible de modifier l'option spoiler.");
      }
    });
  };

  // Handle Discord Channels Save
  const handleSaveDiscordChannels = () => {
    startSaveDiscordTransition(async () => {
      try {
        const payload: DiscordTemplateInput[] = Object.entries(templates).map(([id, val]) => ({
          id,
          enabled: val.enabled,
          channelId: val.channelId.trim() || null,
          roleId: val.roleId.trim() || null,
        }));

        const res = await saveDiscordTemplatesAction(payload);
        if (res.success) {
          toast.success("Salons et mentions Discord des tickets enregistrés !");
        } else {
          toast.error(res.error || "Erreur lors de la sauvegarde.");
        }
      } catch {
        toast.error("Erreur inattendue.");
      }
    });
  };

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
          allowSpoiler: editingCategory.allowSpoiler ?? false,
          enabled: editingCategory.enabled ?? true,
          allowedRoles: editingCategory.allowedRoles ?? [],
        });

        if (res.success) {
          toast.success(editingCategory.id ? "Catégorie modifiée !" : "Nouvelle catégorie créée !");
          setCategoryModalOpen(false);
          // Update local state
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
                allowSpoiler: editingCategory.allowSpoiler ?? false,
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
          // Update local state
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
    <div className="flex flex-col gap-8">
      {/* SECTION 1 : Salons Discord (HyoriBot) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DiscordLogo className="size-5 text-indigo-400" />
            <CardTitle className="text-lg">Salons Discord de réception des tickets</CardTitle>
          </div>
          <CardDescription>
            Configurez les salons Discord vers lesquels le bot HyoriBot transmet automatiquement les
            3 types de tickets.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {TICKET_CHANNEL_TEMPLATES.map((tmpl) => {
              const current = templates[tmpl.id] || { channelId: "", roleId: "", enabled: true };
              const Icon = tmpl.icon;
              return (
                <div
                  key={tmpl.id}
                  className="bg-card/60 flex flex-col justify-between rounded-lg border p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-medium">
                        <Icon className="text-muted-foreground size-4 shrink-0" />
                        <span className="text-sm font-semibold">{tmpl.title}</span>
                      </div>
                      <Switch
                        checked={current.enabled}
                        onCheckedChange={(checked) =>
                          setTemplates((prev) => ({
                            ...prev,
                            [tmpl.id]: { ...prev[tmpl.id], enabled: checked },
                          }))
                        }
                      />
                    </div>
                    <p className="text-muted-foreground text-xs">{tmpl.description}</p>
                    <div className="flex flex-col gap-2 pt-2">
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs font-medium">ID Salon Discord</Label>
                        <Input
                          placeholder="Ex: 123456789012345678"
                          value={current.channelId}
                          onChange={(e) =>
                            setTemplates((prev) => ({
                              ...prev,
                              [tmpl.id]: { ...prev[tmpl.id], channelId: e.target.value },
                            }))
                          }
                          className="font-mono text-xs"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs font-medium">
                          ID Rôle à mentionner (optionnel)
                        </Label>
                        <Input
                          placeholder="Ex: 987654321098765432"
                          value={current.roleId}
                          onChange={(e) =>
                            setTemplates((prev) => ({
                              ...prev,
                              [tmpl.id]: { ...prev[tmpl.id], roleId: e.target.value },
                            }))
                          }
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              onClick={handleSaveDiscordChannels}
              disabled={isSavingDiscord}
              className="gap-2"
            >
              <Check className="size-4" />
              {isSavingDiscord ? "Enregistrement..." : "Enregistrer les salons Discord"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SECTION : Contrôle direct de l'Option Spoiler joueur */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 pb-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-500">
              <EyeSlash className="size-5" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">
                  Option Spoiler (Demandes Confidentielles RP)
                </CardTitle>
                <Badge
                  className={cn(
                    "border text-[11px]",
                    isSpoilerOptionActive
                      ? "border-amber-500/30 bg-amber-500/15 text-amber-500"
                      : "border-muted bg-muted text-muted-foreground"
                  )}
                >
                  {isSpoilerOptionActive ? "Active dans le formulaire" : "Désactivée (Masquée)"}
                </Badge>
              </div>
              <CardDescription className="max-w-2xl text-xs leading-relaxed">
                Permet aux joueurs d&apos;activer la mention spoiler lors de l&apos;ouverture
                d&apos;un ticket (réservant l&apos;accès uniquement aux Administrateurs et au Suivi
                RP). Vous pouvez désactiver cette option dès la mise en production et la réactiver à
                tout moment.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground text-xs font-medium">
              {isSpoilerOptionActive ? "Autoriser les spoilers" : "Bloquer les spoilers"}
            </span>
            <Switch
              checked={isSpoilerOptionActive}
              onCheckedChange={handleToggleSpoilerOption}
              disabled={isTogglingSpoiler || !rpCategory}
              className="data-[state=checked]:bg-amber-500"
            />
          </div>
        </CardHeader>
      </Card>

      {/* SECTION 2 : Catégories & Sous-catégories modulables */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-lg font-semibold">
              Catégories & Sous-catégories dynamiques
            </h2>
            <p className="text-muted-foreground text-sm">
              Personnalisez les parcours d&apos;ouverture, les placeholders et les rôles staff ayant
              accès à chaque type de ticket.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => {
              setEditingCategory({
                name: "",
                slug: "",
                description: "",
                allowSpoiler: false,
                enabled: true,
                allowedRoles: [Role.ADMIN],
              });
              setCategoryModalOpen(true);
            }}
          >
            <Plus className="size-4" />
            Nouvelle catégorie
          </Button>
        </div>

        <div className="flex flex-col gap-6">
          {categories.map((cat) => (
            <Card key={cat.id} className={cn(!cat.enabled && "opacity-60")}>
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 pb-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-heading text-base font-semibold">{cat.name}</span>
                    <Badge variant="outline" className="font-mono text-xs">
                      slug: {cat.slug}
                    </Badge>
                    {cat.allowSpoiler ? (
                      <Badge className="gap-1 border-amber-500/20 bg-amber-500/10 text-xs text-amber-500">
                        <EyeSlash className="size-3" />
                        Option Spoiler autorisée
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Spoiler désactivé
                      </Badge>
                    )}
                    {!cat.enabled && (
                      <Badge variant="destructive" className="text-xs">
                        Désactivée
                      </Badge>
                    )}
                  </div>
                  {cat.description && (
                    <p className="text-muted-foreground text-xs">{cat.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={() => {
                      setEditingCategory(cat);
                      setCategoryModalOpen(true);
                    }}
                  >
                    <PencilSimple className="size-3.5" />
                    Modifier
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 gap-1 text-xs"
                    onClick={() => handleDeleteCategory(cat)}
                  >
                    <Trash className="size-3.5" />
                    Supprimer
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="flex flex-col gap-4">
                {/* Rôles staff autorisés */}
                <div className="bg-muted/40 flex flex-wrap items-center gap-2 rounded-md p-2.5 text-xs">
                  <span className="text-muted-foreground flex items-center gap-1 font-medium">
                    <ShieldCheck className="size-3.5" />
                    Rôles staff autorisés :
                  </span>
                  {cat.allowedRoles && cat.allowedRoles.length > 0 ? (
                    cat.allowedRoles.map((r) => (
                      <Badge key={r} variant="secondary" className="text-[11px]">
                        {staffRoleLabels[r] || r}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground italic">Uniquement administrateurs</span>
                  )}
                </div>

                {/* Sous-catégories */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                      Sous-catégories associées ({cat.subcategories.length})
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-primary h-7 gap-1 text-xs"
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
                      <Plus className="size-3.5" />
                      Ajouter une sous-catégorie
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {cat.subcategories.map((sub) => (
                      <div
                        key={sub.id}
                        className="bg-card flex flex-col justify-between rounded border p-3 text-xs shadow-xs"
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-foreground font-semibold">{sub.name}</span>
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {sub.slug}
                            </Badge>
                          </div>
                          {sub.description && (
                            <p className="text-muted-foreground line-clamp-2">{sub.description}</p>
                          )}
                          {sub.placeholderSubject && (
                            <p className="text-muted-foreground/80 text-[11px] italic">
                              <span className="font-medium not-italic">Exemple sujet :</span>{" "}
                              {sub.placeholderSubject}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-end gap-1 pt-2">
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
                            <PencilSimple className="mr-1 size-3" />
                            Éditer
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10 h-6 px-2 text-[11px]"
                            onClick={() => handleDeleteSubcategory(sub)}
                          >
                            <Trash className="size-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
                  placeholder="Ex: Roleplay, Technique..."
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

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex flex-col gap-0.5">
                <Label className="text-sm font-semibold">Autoriser l&apos;option Spoiler</Label>
                <span className="text-muted-foreground text-xs">
                  Permet au joueur de marquer son ticket comme spoil/confidentiel (réservé Admin +
                  Suivi RP).
                </span>
              </div>
              <Switch
                checked={editingCategory?.allowSpoiler ?? false}
                onCheckedChange={(checked) =>
                  setEditingCategory((p) => ({ ...p, allowSpoiler: checked }))
                }
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
                placeholder="Précisez ce que cette sous-catégorie couvre (projets, lore, assassinats, etc.)..."
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
                id="sub-placeholder-desc"
                rows={3}
                value={editingSubcategory?.placeholderDescription || ""}
                onChange={(e) =>
                  setEditingSubcategory((p) => ({ ...p, placeholderDescription: e.target.value }))
                }
                placeholder="Ex: Détaillez votre projet, les personnages impliqués, le lieu et vos objectifs RP..."
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
