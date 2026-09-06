"use client";

import { useMemo, useState } from "react";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface RuleItemData {
  id: string;
  content: string;
  order: number;
}

export interface RuleArticleData {
  id: string;
  title: string;
  order: number;
  rules: RuleItemData[];
}

export interface RuleSectionData {
  id: string;
  title: string;
  order: number;
  isPreface: boolean;
  articles: RuleArticleData[];
}

function formatVoletArticleTitle(num: number, rawTitle: string): string {
  const trimmed = (rawTitle || "").trim();
  const cleaned = trimmed.replace(/^article\s*\d+\s*[:\-–—]?\s*/i, "").trim();
  return cleaned ? `Article ${num} : ${cleaned}` : `Article ${num}`;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").toLowerCase();
}

export function RulesView({ sections }: { sections: RuleSectionData[] }) {
  const [searchQuery, setSearchQuery] = useState("");

  const preface = sections.find((s) => s.isPreface);
  const volets = sections.filter((s) => !s.isPreface);

  // Pre-calculate continuous article numbers across all volets (never resets between volets)
  const articleNumberMap = useMemo(() => {
    const map = new Map<string, number>();
    let count = 0;
    for (const volet of volets) {
      for (const article of volet.articles) {
        count += 1;
        map.set(article.id, count);
      }
    }
    return map;
  }, [volets]);

  const cleanQuery = searchQuery.trim().toLowerCase();

  // Filter sections & articles based on search query
  const filteredData = useMemo(() => {
    if (!cleanQuery) {
      return { preface, volets, matchCount: 0 };
    }

    let matchCount = 0;

    // Filter preface
    let filteredPreface: RuleSectionData | null = null;
    if (preface) {
      const sectionMatches = preface.title.toLowerCase().includes(cleanQuery);
      const matchedArticles = preface.articles
        .map((article) => {
          const articleTitleMatches = article.title.toLowerCase().includes(cleanQuery);
          const matchedRules = article.rules.filter((rule) =>
            stripHtml(rule.content).includes(cleanQuery)
          );

          if (articleTitleMatches || sectionMatches) {
            matchCount += Math.max(matchedRules.length, 1);
            return article;
          }

          if (matchedRules.length > 0) {
            matchCount += matchedRules.length;
            return { ...article, rules: matchedRules };
          }

          return null;
        })
        .filter(Boolean) as RuleArticleData[];

      if (sectionMatches || matchedArticles.length > 0) {
        filteredPreface = {
          ...preface,
          articles:
            sectionMatches && matchedArticles.length === 0 ? preface.articles : matchedArticles,
        };
      }
    }

    // Filter volets
    const filteredVolets = volets
      .map((volet) => {
        const sectionMatches = volet.title.toLowerCase().includes(cleanQuery);
        const matchedArticles = volet.articles
          .map((article) => {
            const articleTitleMatches = article.title.toLowerCase().includes(cleanQuery);
            const matchedRules = article.rules.filter((rule) =>
              stripHtml(rule.content).includes(cleanQuery)
            );

            if (articleTitleMatches || sectionMatches) {
              matchCount += Math.max(matchedRules.length, 1);
              return article;
            }

            if (matchedRules.length > 0) {
              matchCount += matchedRules.length;
              return { ...article, rules: matchedRules };
            }

            return null;
          })
          .filter(Boolean) as RuleArticleData[];

        if (sectionMatches || matchedArticles.length > 0) {
          return {
            ...volet,
            articles:
              sectionMatches && matchedArticles.length === 0 ? volet.articles : matchedArticles,
          };
        }

        return null;
      })
      .filter(Boolean) as RuleSectionData[];

    return { preface: filteredPreface, volets: filteredVolets, matchCount };
  }, [cleanQuery, preface, volets]);

  return (
    <div className="flex w-full max-w-full min-w-0 flex-col gap-6">
      {/* Search bar */}
      <div className="flex flex-col gap-2">
        <div className="relative w-full">
          <MagnifyingGlass className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2 select-none" />
          <Input
            type="search"
            placeholder="Rechercher une règle ou un mot-clé..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-card/70 border-border/80 placeholder:text-muted-foreground/70 h-9 w-full pr-9 pl-9 text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Search results count */}
        {cleanQuery && (
          <div className="text-muted-foreground flex items-center justify-between px-1 text-xs">
            <span>
              {filteredData.matchCount === 0
                ? "Aucun résultat trouvé pour cette recherche."
                : `${filteredData.matchCount} règle(s) ou article(s) trouvé(s) pour "${cleanQuery}".`}
            </span>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-primary cursor-pointer underline-offset-4 hover:underline"
            >
              Effacer la recherche
            </button>
          </div>
        )}
      </div>

      {/* No results state */}
      {cleanQuery && !filteredData.preface && filteredData.volets.length === 0 && (
        <div className="border-border/60 bg-card/30 flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed py-8 text-center">
          <p className="text-foreground text-sm font-medium">Aucun résultat</p>
          <p className="text-muted-foreground max-w-sm text-xs">
            Aucun article ou règle ne correspond au terme &quot;{cleanQuery}&quot;.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchQuery("")}
            className="mt-1 h-8 text-xs"
          >
            Réinitialiser la recherche
          </Button>
        </div>
      )}

      {/* Direct display without cards */}
      <div className="flex w-full max-w-full min-w-0 flex-col gap-10">
        {/* Préface */}
        {filteredData.preface && (
          <section id="preface" className="flex w-full max-w-full min-w-0 flex-col gap-5">
            <h2 className="font-heading text-foreground border-border/50 border-b pb-2 text-2xl font-semibold tracking-tight">
              Préface
            </h2>

            <div className="flex w-full max-w-full min-w-0 flex-col gap-6">
              {filteredData.preface.articles.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">
                  Aucun article défini dans la préface.
                </p>
              ) : (
                filteredData.preface.articles.map((article) => (
                  <article
                    key={article.id}
                    className="flex w-full max-w-full min-w-0 flex-col gap-2.5"
                  >
                    {article.title && (
                      <h3 className="font-heading text-foreground text-lg font-semibold tracking-tight">
                        {article.title.replace(/^article\s*\d*\s*[:\-–—]?\s*/i, "").trim() ||
                          article.title}
                      </h3>
                    )}

                    <div className="flex w-full max-w-full min-w-0 flex-col gap-2 pl-1 sm:pl-2">
                      {article.rules.length === 0 ? (
                        <p className="text-muted-foreground text-sm italic">
                          Aucune règle définie pour cet article.
                        </p>
                      ) : (
                        article.rules.map((rule) => (
                          <div
                            key={rule.id}
                            className="flex w-full max-w-full min-w-0 items-start gap-3"
                          >
                            <span
                              className="bg-primary/80 mt-2 size-1.5 shrink-0 rounded-full select-none"
                              aria-hidden="true"
                            />
                            <div
                              className="text-foreground/90 max-w-full min-w-0 flex-1 font-sans text-sm leading-relaxed break-words [&_p]:my-0 [&_p]:leading-relaxed"
                              dangerouslySetInnerHTML={{ __html: rule.content }}
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        )}

        {/* Volets */}
        {filteredData.volets.map((section) => {
          const originalVoletIndex = volets.findIndex((v) => v.id === section.id);
          const sectionLetter = String.fromCharCode(65 + Math.max(0, originalVoletIndex));

          return (
            <section
              key={section.id}
              id={`volet-${sectionLetter.toLowerCase()}`}
              className="flex w-full max-w-full min-w-0 flex-col gap-5"
            >
              <h2 className="font-heading text-foreground border-border/50 border-b pb-2 text-2xl font-semibold tracking-tight">
                Volet {sectionLetter} : {section.title}
              </h2>

              <div className="flex w-full max-w-full min-w-0 flex-col gap-6">
                {section.articles.length === 0 ? (
                  <p className="text-muted-foreground text-sm italic">
                    Aucun article défini dans ce volet.
                  </p>
                ) : (
                  section.articles.map((article) => {
                    const currentArticleNumber = articleNumberMap.get(article.id) ?? 1;

                    return (
                      <article
                        key={article.id}
                        id={`article-${currentArticleNumber}`}
                        className="flex w-full max-w-full min-w-0 flex-col gap-2.5"
                      >
                        <h3 className="font-heading text-foreground text-lg font-semibold tracking-tight">
                          {formatVoletArticleTitle(currentArticleNumber, article.title)}
                        </h3>

                        <div className="flex w-full max-w-full min-w-0 flex-col gap-2 pl-1 sm:pl-2">
                          {article.rules.length === 0 ? (
                            <p className="text-muted-foreground text-sm italic">
                              Aucune règle définie pour cet article.
                            </p>
                          ) : (
                            article.rules.map((rule, rIndex) => (
                              <div
                                key={rule.id}
                                className="flex w-full max-w-full min-w-0 items-start gap-2.5"
                              >
                                <span className="text-primary shrink-0 font-sans text-sm font-medium tabular-nums select-none">
                                  {currentArticleNumber}.{rIndex + 1}
                                </span>
                                <div
                                  className="text-foreground/90 max-w-full min-w-0 flex-1 font-sans text-sm leading-relaxed break-words [&_p]:my-0 [&_p]:leading-relaxed"
                                  dangerouslySetInnerHTML={{ __html: rule.content }}
                                />
                              </div>
                            ))
                          )}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
