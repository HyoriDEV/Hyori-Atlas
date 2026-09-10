"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { InterviewGuideData } from "@/lib/services/interview-guide-service";

interface InterviewGuideViewProps {
  guideData: InterviewGuideData;
}

const articleClassName = cn(
  "border-border/70 bg-card/40 rounded-xl border p-6 sm:p-10 shadow-xs",
  "text-foreground/90 font-sans text-sm sm:text-base leading-relaxed",
  // H1: Volets
  "[&_h1]:font-heading [&_h1]:text-foreground [&_h1]:text-2xl sm:[&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:border-b [&_h1]:border-border/60 [&_h1]:pb-3 [&_h1]:pt-8 [&_h1:first-child]:pt-0",
  // H2: Sections
  "[&_h2]:font-heading [&_h2]:text-foreground [&_h2]:text-xl sm:[&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:border-b [&_h2]:border-border/40 [&_h2]:pb-2 [&_h2]:pt-6 [&_h2]:mt-6",
  // H3: Subsections
  "[&_h3]:font-heading [&_h3]:text-foreground/95 [&_h3]:text-base sm:[&_h3]:text-lg [&_h3]:font-medium [&_h3]:tracking-tight [&_h3]:pt-4 [&_h3]:mt-4",
  // Paragraphs
  "[&_p]:my-3 [&_p]:leading-relaxed",
  // Blockquotes
  "[&_blockquote]:border-l-2 [&_blockquote]:border-primary/70 [&_blockquote]:bg-primary/5 [&_blockquote]:rounded-r-md [&_blockquote]:px-4 [&_blockquote]:py-2.5 [&_blockquote]:my-3.5 [&_blockquote]:text-foreground/90 [&_blockquote]:font-serif [&_blockquote]:italic [&_blockquote_p]:my-1",
  // Lists
  "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5 [&_ul]:my-2.5",
  "[&_ul_ul]:list-[circle] [&_ul_ul]:pl-5 [&_ul_ul]:space-y-1 [&_ul_ul]:mt-1.5",
  "[&_li]:leading-relaxed",
  // Strong and em
  "[&_strong]:font-semibold [&_strong]:text-foreground",
  "[&_em]:italic [&_em]:text-foreground/90",
  // Inline code
  "[&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs sm:[&_code]:text-sm [&_code]:font-mono [&_code]:text-primary"
);

export function InterviewGuideView({ guideData }: InterviewGuideViewProps) {
  return (
    <div className="flex w-full max-w-full min-w-0 flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Guide d&apos;entretien Whitelist
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm">
          Trame d&apos;entretien vocal pour évaluer les candidatures (Volet A : Communauté • Volet B
          : Monde RP).
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="volet-a-aj" className="w-full gap-6">
        <div className="border-border/60 flex items-center justify-between border-b pb-3">
          <TabsList className="bg-muted/70 p-1">
            <TabsTrigger value="volet-a-aj" className="px-4 py-1.5 text-xs sm:text-sm">
              Volet A AJ
            </TabsTrigger>
            <TabsTrigger value="volet-a-nj" className="px-4 py-1.5 text-xs sm:text-sm">
              Volet A NJ
            </TabsTrigger>
            <TabsTrigger value="volet-b" className="px-4 py-1.5 text-xs sm:text-sm">
              Volet B
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Volet A (AJ) */}
        <TabsContent value="volet-a-aj" className="mt-0">
          <article
            className={articleClassName}
            dangerouslySetInnerHTML={{ __html: guideData.voletAAncienHtml }}
          />
        </TabsContent>

        {/* Tab 2: Volet A (NJ) */}
        <TabsContent value="volet-a-nj" className="mt-0">
          <article
            className={articleClassName}
            dangerouslySetInnerHTML={{ __html: guideData.voletANouveauHtml }}
          />
        </TabsContent>

        {/* Tab 3: Volet B */}
        <TabsContent value="volet-b" className="mt-0">
          <article
            className={articleClassName}
            dangerouslySetInnerHTML={{ __html: guideData.voletBHtml }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
