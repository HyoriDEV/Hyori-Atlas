"use client";

import { useMemo, useState } from "react";
import { Plus, Trash, Pencil, CaretUp, CaretDown } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { toast } from "sonner";
import {
  createRuleSection,
  updateRuleSection,
  deleteRuleSection,
  createRuleArticle,
  updateRuleArticle,
  deleteRuleArticle,
  createRuleItem,
  updateRuleItem,
  deleteRuleItem,
  reorderItems,
} from "./actions";

interface RuleItem {
  id: string;
  articleId: string;
  content: string;
  order: number;
}

interface RuleArticle {
  id: string;
  sectionId: string;
  title: string;
  order: number;
  rules: RuleItem[];
}

interface RuleSection {
  id: string;
  title: string;
  order: number;
  isPreface?: boolean;
  articles: RuleArticle[];
}

export function RulesManager({ initialSections }: { initialSections: RuleSection[] }) {
  const [isLoading, setIsLoading] = useState(false);

  // Edit states
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState("");

  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [editingArticleTitle, setEditingArticleTitle] = useState("");

  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editingRuleContent, setEditingRuleContent] = useState("");

  const prefaceSection = initialSections.find((s) => s.isPreface);
  const voletSections = initialSections.filter((s) => !s.isPreface);

  // Continuous article numbering across volets (preface excluded)
  const articleNumberMap = useMemo(() => {
    const map = new Map<string, number>();
    let count = 0;
    for (const volet of voletSections) {
      for (const article of volet.articles) {
        count += 1;
        map.set(article.id, count);
      }
    }
    return map;
  }, [voletSections]);

  async function handleAddSection(isPreface: boolean = false) {
    setIsLoading(true);
    try {
      await createRuleSection(isPreface ? "Préface" : "Nouveau volet", isPreface);
      toast.success(isPreface ? "Préface ajoutée" : "Volet ajouté");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur lors de l'ajout";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveSection(id: string) {
    setIsLoading(true);
    try {
      await updateRuleSection(id, editingSectionTitle);
      setEditingSectionId(null);
      toast.success("Titre modifié");
    } catch {
      toast.error("Erreur de modification");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteSection(id: string, isPreface: boolean = false) {
    const label = isPreface ? "cette préface" : "ce volet";
    if (!confirm(`Voulez-vous vraiment supprimer ${label} et tout son contenu ?`)) return;
    setIsLoading(true);
    try {
      await deleteRuleSection(id);
      toast.success(isPreface ? "Préface supprimée" : "Volet supprimé");
    } catch {
      toast.error("Erreur de suppression");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddArticle(sectionId: string) {
    setIsLoading(true);
    try {
      await createRuleArticle(sectionId, "Nouvel article");
      toast.success("Article ajouté");
    } catch {
      toast.error("Erreur lors de l'ajout");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveArticle(id: string) {
    setIsLoading(true);
    try {
      await updateRuleArticle(id, editingArticleTitle);
      setEditingArticleId(null);
      toast.success("Article modifié");
    } catch {
      toast.error("Erreur de modification");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteArticle(id: string) {
    if (!confirm("Voulez-vous vraiment supprimer cet article et toutes ses règles ?")) return;
    setIsLoading(true);
    try {
      await deleteRuleArticle(id);
      toast.success("Article supprimé");
    } catch {
      toast.error("Erreur de suppression");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddRule(articleId: string) {
    setIsLoading(true);
    try {
      await createRuleItem(articleId, "Nouvelle règle");
      toast.success("Règle ajoutée");
    } catch {
      toast.error("Erreur lors de l'ajout");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveRule(id: string) {
    setIsLoading(true);
    try {
      await updateRuleItem(id, editingRuleContent);
      setEditingRuleId(null);
      toast.success("Règle modifiée");
    } catch {
      toast.error("Erreur de modification");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteRule(id: string) {
    if (!confirm("Voulez-vous vraiment supprimer cette règle ?")) return;
    setIsLoading(true);
    try {
      await deleteRuleItem(id);
      toast.success("Règle supprimée");
    } catch {
      toast.error("Erreur de suppression");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleMove(
    type: "section" | "article" | "item",
    list: { id: string; order: number }[],
    index: number,
    direction: "up" | "down"
  ) {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === list.length - 1)
    ) {
      return;
    }

    const swapIndex = direction === "up" ? index - 1 : index + 1;
    const current = list[index];
    const swap = list[swapIndex];

    const updates = [
      { id: current.id, order: swap.order },
      { id: swap.id, order: current.order },
    ];

    setIsLoading(true);
    try {
      await reorderItems(type, updates);
      toast.success("Ordre modifié");
    } catch {
      toast.error("Erreur lors de la réorganisation");
    } finally {
      setIsLoading(false);
    }
  }

  // Renders a section card (for both preface and volets)
  function renderSectionCard(
    section: RuleSection,
    isPreface: boolean,
    sIndex: number,
    sectionLetter?: string
  ) {
    return (
      <Card
        key={section.id}
        className={`overflow-hidden border-2 ${
          isPreface ? "border-primary/40 bg-card/80 shadow-xs" : ""
        }`}
      >
        <CardHeader className="bg-muted/30 border-b p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-1 items-center gap-4">
              {!isPreface && (
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleMove("section", voletSections, sIndex, "up")}
                    disabled={sIndex === 0 || isLoading}
                  >
                    <CaretUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleMove("section", voletSections, sIndex, "down")}
                    disabled={sIndex === voletSections.length - 1 || isLoading}
                  >
                    <CaretDown />
                  </Button>
                </div>
              )}

              <div className="flex flex-1 items-center gap-3">
                {isPreface ? (
                  <span className="font-heading text-primary text-xl font-bold">Préface</span>
                ) : (
                  <>
                    <span className="font-heading text-primary text-xl font-bold">
                      Volet {sectionLetter}
                    </span>

                    {editingSectionId === section.id ? (
                      <div className="flex flex-1 items-center gap-2">
                        <Input
                          value={editingSectionTitle}
                          onChange={(e) => setEditingSectionTitle(e.target.value)}
                          className="max-w-sm font-semibold"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleSaveSection(section.id)}
                          disabled={isLoading}
                        >
                          Enregistrer
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingSectionId(null)}>
                          Annuler
                        </Button>
                      </div>
                    ) : (
                      <h2 className="font-heading text-xl font-semibold">{section.title}</h2>
                    )}
                  </>
                )}
              </div>
            </div>

            {!editingSectionId && (
              <div className="flex items-center gap-2">
                {!isPreface && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setEditingSectionTitle(section.title);
                      setEditingSectionId(section.id);
                    }}
                  >
                    <Pencil className="mr-2 size-4" />
                    Modifier
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => handleDeleteSection(section.id, isPreface)}
                >
                  <Trash className="size-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-6 p-6">
          {section.articles.length === 0 ? (
            <p className="text-muted-foreground text-sm italic">
              {isPreface ? "Aucun article dans la préface." : "Aucun article dans ce volet."}
            </p>
          ) : (
            section.articles.map((article, aIndex) => {
              const currentArticleNumber = isPreface
                ? 0
                : (articleNumberMap.get(article.id) ?? aIndex + 1);
              const articleLabel = isPreface
                ? article.title
                  ? article.title.replace(/^article\s*\d*\s*[:\-–—]?\s*/i, "").trim() ||
                    article.title
                  : `Article ${aIndex + 1}`
                : `Article ${currentArticleNumber}`;

              return (
                <div
                  key={article.id}
                  className="border-border w-full max-w-full min-w-0 rounded-lg border p-4"
                >
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div className="flex flex-1 items-center gap-4">
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleMove("article", section.articles, aIndex, "up")}
                          disabled={aIndex === 0 || isLoading}
                        >
                          <CaretUp />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleMove("article", section.articles, aIndex, "down")}
                          disabled={aIndex === section.articles.length - 1 || isLoading}
                        >
                          <CaretDown />
                        </Button>
                      </div>

                      <div className="flex flex-1 items-center gap-2">
                        <span className="text-muted-foreground text-sm font-semibold">
                          {articleLabel}
                        </span>
                        {editingArticleId === article.id ? (
                          <div className="flex flex-1 items-center gap-2">
                            <Input
                              value={editingArticleTitle}
                              onChange={(e) => setEditingArticleTitle(e.target.value)}
                              className="max-w-sm font-semibold"
                            />
                            <Button
                              size="sm"
                              onClick={() => handleSaveArticle(article.id)}
                              disabled={isLoading}
                            >
                              Enregistrer
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingArticleId(null)}
                            >
                              Annuler
                            </Button>
                          </div>
                        ) : (
                          <h3 className="text-lg font-semibold">{article.title}</h3>
                        )}
                      </div>
                    </div>

                    {!editingArticleId && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingArticleTitle(article.title);
                            setEditingArticleId(article.id);
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleDeleteArticle(article.id)}
                        >
                          <Trash className="size-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="ml-8 flex w-full max-w-full min-w-0 flex-col gap-3">
                    {article.rules.length === 0 ? (
                      <p className="text-muted-foreground text-sm italic">
                        Aucune règle dans cet article.
                      </p>
                    ) : (
                      article.rules.map((rule, rIndex) => (
                        <div key={rule.id} className="flex w-full max-w-full min-w-0 gap-4">
                          <div className="flex flex-col gap-1 pt-1">
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => handleMove("item", article.rules, rIndex, "up")}
                              disabled={rIndex === 0 || isLoading}
                              className="size-5"
                            >
                              <CaretUp className="size-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => handleMove("item", article.rules, rIndex, "down")}
                              disabled={rIndex === article.rules.length - 1 || isLoading}
                              className="size-5"
                            >
                              <CaretDown className="size-3" />
                            </Button>
                          </div>

                          <div className="flex max-w-full min-w-0 flex-1 flex-col gap-2">
                            <div className="flex max-w-full min-w-0 items-start gap-2.5">
                              {isPreface ? (
                                <span
                                  className="bg-primary/80 mt-2 size-1.5 shrink-0 rounded-full select-none"
                                  aria-hidden="true"
                                />
                              ) : (
                                <span className="text-primary shrink-0 font-sans text-sm font-medium tabular-nums select-none">
                                  {currentArticleNumber}.{rIndex + 1}
                                </span>
                              )}

                              {editingRuleId === rule.id ? (
                                <div className="flex max-w-full min-w-0 flex-1 flex-col gap-2">
                                  <RichTextEditor
                                    value={editingRuleContent}
                                    onChange={setEditingRuleContent}
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleSaveRule(rule.id)}
                                      disabled={isLoading}
                                    >
                                      Enregistrer
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setEditingRuleId(null)}
                                    >
                                      Annuler
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div
                                  className="text-foreground/90 max-w-full min-w-0 flex-1 font-sans text-sm leading-relaxed break-words [&_p]:my-0 [&_p]:leading-relaxed"
                                  dangerouslySetInnerHTML={{ __html: rule.content }}
                                />
                              )}
                            </div>
                          </div>

                          {!editingRuleId && (
                            <div className="flex items-start gap-1 opacity-50 transition-opacity hover:opacity-100">
                              <Button
                                size="icon-xs"
                                variant="ghost"
                                onClick={() => {
                                  setEditingRuleContent(rule.content);
                                  setEditingRuleId(rule.id);
                                }}
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                size="icon-xs"
                                variant="ghost"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => handleDeleteRule(rule.id)}
                              >
                                <Trash className="size-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))
                    )}

                    <div className="mt-2 pl-6">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddRule(article.id)}
                        disabled={isLoading}
                        className="h-7 text-xs"
                      >
                        <Plus className="mr-1.5 size-3" />
                        Ajouter une règle
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          <div className="flex justify-center pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleAddArticle(section.id)}
              disabled={isLoading}
            >
              <Plus className="mr-2 size-4" />
              {isPreface ? "Ajouter un article à la préface" : "Ajouter un article à ce volet"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-end gap-3">
        {!prefaceSection && (
          <Button
            onClick={() => handleAddSection(true)}
            disabled={isLoading}
            variant="outline"
            className="border-primary/40 text-primary hover:bg-primary/10 gap-2"
          >
            <Plus className="size-4" />
            Ajouter une préface
          </Button>
        )}
        <Button onClick={() => handleAddSection(false)} disabled={isLoading} className="gap-2">
          <Plus className="size-4" />
          Ajouter un volet
        </Button>
      </div>

      {initialSections.length === 0 ? (
        <p className="text-muted-foreground text-center">Aucun volet pour le moment.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {/* 1. Preface section rendered first if present */}
          {prefaceSection && renderSectionCard(prefaceSection, true, 0)}

          {/* 2. Volet sections */}
          {voletSections.map((section, vIndex) => {
            const sectionLetter = String.fromCharCode(65 + vIndex);
            return renderSectionCard(section, false, vIndex, sectionLetter);
          })}
        </div>
      )}
    </div>
  );
}
