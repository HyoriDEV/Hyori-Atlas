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

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").toLowerCase();
}

export function RulesView({ sections }: { sections: RuleSectionData[] }) {
  const [searchQuery, setSearchQuery] = useState("");

  const preface = sections.find((s) => s.isPreface);
  const volets = sections.filter((s) => !s.isPreface);

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

  let globalVoletArticleIndex = 0;

  return (
    <div className="flex flex-col gap-6">
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
      <div className="flex flex-col gap-10">
        {/* Préface */}
        {filteredData.preface && (
          <section id="preface" className="flex flex-col gap-5">
            <h2 className="font-heading text-foreground border-border/50 border-b pb-2 text-2xl font-bold tracking-tight">
              Préface
            </h2>

            <div className="flex flex-col gap-6">
              {filteredData.preface.articles.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">
                  Aucun article défini dans la préface.
                </p>
              ) : (
                filteredData.preface.articles.map((article) => (
                  <article key={article.id} className="flex flex-col gap-2.5">
                    {article.title && (
                      <h3 className="font-heading text-foreground text-lg font-semibold tracking-tight">
                        {article.title}
                      </h3>
                    )}

                    <ul className="marker:text-muted-foreground/70 flex list-disc flex-col gap-1.5 pl-5">
                      {article.rules.length === 0 ? (
                        <li className="text-muted-foreground list-none text-sm italic">
                          Aucune règle définie pour cet article.
                        </li>
                      ) : (
                        article.rules.map((rule) => (
                          <li
                            key={rule.id}
                            className="text-foreground/90 pl-1 text-sm leading-relaxed"
                          >
                            <div
                              className="prose prose-zinc dark:prose-invert prose-p:my-0 prose-p:leading-relaxed prose-a:text-primary prose-a:underline-offset-4 hover:prose-a:text-primary/80 text-foreground/90 max-w-none text-sm"
                              dangerouslySetInnerHTML={{ __html: rule.content }}
                            />
                          </li>
                        ))
                      )}
                    </ul>
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
              className="flex flex-col gap-5"
            >
              <h2 className="font-heading text-foreground border-border/50 border-b pb-2 text-2xl font-bold tracking-tight">
                Volet {sectionLetter} : {section.title}
              </h2>

              <div className="flex flex-col gap-6">
                {section.articles.length === 0 ? (
                  <p className="text-muted-foreground text-sm italic">
                    Aucun article défini dans ce volet.
                  </p>
                ) : (
                  section.articles.map((article) => {
                    globalVoletArticleIndex++;
                    const currentArticleNumber = globalVoletArticleIndex;

                    return (
                      <article
                        key={article.id}
                        id={`article-${currentArticleNumber}`}
                        className="flex flex-col gap-2.5"
                      >
                        <h3 className="font-heading text-foreground text-lg font-semibold tracking-tight">
                          Article {currentArticleNumber} : {article.title}
                        </h3>

                        <ul className="marker:text-muted-foreground/70 flex list-disc flex-col gap-1.5 pl-5">
                          {article.rules.length === 0 ? (
                            <li className="text-muted-foreground list-none text-sm italic">
                              Aucune règle définie pour cet article.
                            </li>
                          ) : (
                            article.rules.map((rule) => (
                              <li
                                key={rule.id}
                                className="text-foreground/90 pl-1 text-sm leading-relaxed"
                              >
                                <div
                                  className="prose prose-zinc dark:prose-invert prose-p:my-0 prose-p:leading-relaxed prose-a:text-primary prose-a:underline-offset-4 hover:prose-a:text-primary/80 text-foreground/90 max-w-none text-sm"
                                  dangerouslySetInnerHTML={{ __html: rule.content }}
                                />
                              </li>
                            ))
                          )}
                        </ul>
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
