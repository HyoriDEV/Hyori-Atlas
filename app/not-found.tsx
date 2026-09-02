import type { Metadata } from "next";
import Link from "next/link";
import { Compass } from "@phosphor-icons/react/dist/ssr";
import { PublicNav } from "@/components/public-nav";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page introuvable",
  description: "La page demandée est introuvable.",
};

export default function NotFound() {
  return (
    <>
      <PublicNav />
      <main className="mx-auto flex w-full max-w-[960px] flex-1 flex-col items-center justify-center gap-16 px-4 py-16 sm:px-6 sm:py-24">
        <div className="flex w-full max-w-xl flex-col items-center gap-4 text-center">
          <div className="border-primary/20 bg-primary/10 text-primary relative flex size-16 items-center justify-center rounded-2xl border shadow-lg shadow-black/40">
            <div className="bg-primary/20 absolute inset-0 -z-10 animate-pulse rounded-2xl blur-md" />
            <Compass className="size-8" />
          </div>

          <span className="border-primary/30 bg-primary/10 text-primary inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wide uppercase">
            Erreur 404
          </span>

          <div className="flex flex-col items-center gap-2">
            <h1 className="font-heading text-foreground text-4xl font-semibold tracking-tight sm:text-5xl">
              Tu t&apos;es perdu...
            </h1>
            <p className="text-muted-foreground max-w-md text-base leading-relaxed">
              ou ce que tu cherches n&apos;a peut-être jamais existé.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button render={<Link href="/" />}>Retourner à l&apos;accueil</Button>
          </div>
        </div>
      </main>
    </>
  );
}
