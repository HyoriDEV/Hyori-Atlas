import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getGlobalSettings } from "@/lib/services/settings-service";

export default async function RulesPage() {
  const settings = await getGlobalSettings();
  if (!settings.publicRulesEnabled) {
    notFound();
  }

  const sections = await prisma.ruleSection.findMany({
    orderBy: { order: "asc" },
    include: {
      articles: {
        orderBy: { order: "asc" },
        include: {
          rules: {
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });

  let globalArticleIndex = 0;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-12">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-[48px]">Règlement</h1>
        <p className="text-muted-foreground text-lg">
          Consultez les règles régissant l&apos;univers et la communauté.
        </p>
      </div>

      {sections.length === 0 ? (
        <p className="text-muted-foreground italic">Le règlement n&apos;a pas encore été publié.</p>
      ) : (
        <div className="flex flex-col gap-16">
          {sections.map((section, sIndex) => {
            const sectionLetter = String.fromCharCode(65 + sIndex);

            return (
              <section key={section.id} className="flex flex-col gap-8">
                <div className="border-primary/20 border-b-2 pb-4">
                  <h2 className="font-heading text-primary text-3xl font-bold tracking-tight">
                    Volet {sectionLetter} : {section.title}
                  </h2>
                </div>

                <div className="flex flex-col gap-12">
                  {section.articles.map((article) => {
                    globalArticleIndex++;
                    const currentArticleNumber = globalArticleIndex;

                    return (
                      <article key={article.id} className="flex flex-col gap-6">
                        <h3 className="font-heading border-primary/50 border-l-4 pl-4 text-2xl font-semibold tracking-tight">
                          Article {currentArticleNumber} : {article.title}
                        </h3>

                        <div className="flex flex-col gap-4 pl-2 sm:pl-6">
                          {article.rules.length === 0 ? (
                            <p className="text-muted-foreground text-sm italic">
                              Aucune règle définie pour cet article.
                            </p>
                          ) : (
                            article.rules.map((rule, rIndex) => (
                              <div
                                key={rule.id}
                                className="bg-muted/20 hover:bg-muted/40 flex gap-4 rounded-lg p-4 transition-colors sm:gap-6"
                              >
                                <span className="text-primary mt-1 w-8 shrink-0 font-mono text-sm font-bold">
                                  {currentArticleNumber}.{rIndex + 1}
                                </span>
                                <div
                                  className="prose prose-zinc dark:prose-invert prose-p:my-0 prose-p:leading-relaxed prose-a:text-primary prose-a:underline-offset-4 hover:prose-a:text-primary/80 max-w-none flex-1"
                                  dangerouslySetInnerHTML={{ __html: rule.content }}
                                />
                              </div>
                            ))
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
