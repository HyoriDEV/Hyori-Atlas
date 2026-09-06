import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getGlobalSettings } from "@/lib/services/settings-service";

export const metadata: Metadata = {
  title: "Lore & Chroniques — Hyori RP",
  description:
    "Découvrez l'histoire du monde de Hyori RP, les récits ancestraux et les villages qui le composent.",
};

export default async function LorePage() {
  const settings = await getGlobalSettings();
  if (!settings.publicLoreEnabled) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-12 pb-16">
      {/* En-tête principal de la page */}
      <header className="flex flex-col gap-3 border-b border-border/60 pb-8">
        <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          Lore & Chroniques
        </h1>
        <p className="text-muted-foreground text-base leading-relaxed sm:text-lg">
          Plongez dans les récits, les mythes fondateurs et la géographie qui façonnent les terres de Hyori.
        </p>
      </header>

      {/* ========================================================= */}
      {/* SECTION 1 : LORE GÉNÉRAL DU SERVEUR / HISTOIRE GLOBALE    */}
      {/* ========================================================= */}
      <section aria-labelledby="general-lore-heading" className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h2
            id="general-lore-heading"
            className="font-heading text-2xl font-bold tracking-tight sm:text-3xl"
          >
            L&apos;Histoire du Monde
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed sm:text-base">
            Les origines de Hyori, les mythes fondateurs et les événements majeurs qui ont façonné l&apos;époque actuelle.
          </p>
        </div>

        <article className="flex flex-col gap-6 leading-relaxed text-foreground/90">
          {/* Citation / Prologue */}
          <blockquote className="border-l-2 border-primary/60 py-1 pl-4 font-serif text-base italic text-muted-foreground sm:text-lg">
            « Ici commence le récit des terres anciennes, forgées par les guerres, la magie et la volonté de ceux qui refusèrent d&apos;oublier. »
          </blockquote>

          {/* Paragraphes narratifs (texte à compléter) */}
          <p>
            Écrivez ici le grand récit d&apos;introduction du serveur : la genèse du monde, l&apos;apparition des peuples
            ou le cataclysme ancestral qui a redessiné la carte.
          </p>

          <p>
            Vous pouvez ajouter autant de paragraphes que souhaité pour décrire le contexte géopolitique,
            les croyances dominantes, la magie ou les factions qui s&apos;affrontent dans l&apos;ombre.
          </p>

          {/* Illustration globale (bannière / carte du monde) */}
          <figure className="my-2 overflow-hidden rounded-xl border border-border bg-card">
            {/* 
              Emplacement visuel : vous pouvez remplacer ce conteneur par Next Image :
              <Image src="/images/lore/world-map.jpg" alt="Carte du monde" width={1200} height={600} className="w-full object-cover" />
            */}
            <div className="flex aspect-21/9 w-full items-center justify-center bg-muted/30 text-muted-foreground">
              <span className="text-sm font-medium">Illustration générale du monde (bannière ou carte globale)</span>
            </div>
            <figcaption className="border-t border-border/40 px-4 py-2.5 text-center text-xs text-muted-foreground">
              Carte générale des territoires connus de Hyori
            </figcaption>
          </figure>

          <p>
            Paragraphe de conclusion ou de transition vers l&apos;époque actuelle, invitant le lecteur
            à s&apos;intéresser aux différents villages et factions décrits ci-dessous.
          </p>
        </article>
      </section>

      {/* ========================================================= */}
      {/* SECTION 2 : LES VILLAGES & TERRITOIRES                    */}
      {/* ========================================================= */}
      <section aria-labelledby="villages-heading" className="flex flex-col gap-8 pt-4">
        <header className="flex flex-col gap-2">
          <h2
            id="villages-heading"
            className="font-heading text-2xl font-bold tracking-tight sm:text-3xl"
          >
            Les Villages & Territoires
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed sm:text-base">
            Découvrez chaque village, sa culture, son environnement naturel et les spécificités de sa population.
          </p>
        </header>

        {/* 
          -------------------------------------------------------------------------
          MODÈLE DE VILLAGE (À DUPLIQUER POUR CHAQUE VILLAGE)
          Dupliquez ce bloc <article> ci-dessous autant de fois que vous avez de villages.
          -------------------------------------------------------------------------
        */}
        <article
          id="village-modele"
          className="flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-border/80"
        >
          {/* En-tête du village */}
          <header className="flex flex-col gap-3 border-b border-border/60 p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Nom du Village
              </h3>
              {/* Badges / métadonnées (région, affiliation, climat, etc.) */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  Région Nord
                </span>
                <span className="rounded-md border border-border bg-muted/30 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  Fief Féodal
                </span>
              </div>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Courte phrase d&apos;accroche ou devise résumant l&apos;esprit et la renommée de ce village.
            </p>
          </header>

          {/* Corps & Récit du village */}
          <div className="flex flex-col gap-6 p-6 sm:p-8">
            {/* Illustration du village */}
            <figure className="overflow-hidden rounded-lg border border-border/80 bg-muted/20">
              {/* 
                Emplacement visuel : vous pouvez remplacer ce conteneur par Next Image :
                <Image src="/images/lore/villages/nom-du-village.jpg" alt="Vue du village" width={800} height={450} className="w-full object-cover" />
              */}
              <div className="flex aspect-16/9 w-full items-center justify-center bg-muted/30 text-muted-foreground">
                <span className="text-sm font-medium">Illustration / Panorama du village</span>
              </div>
              <figcaption className="border-t border-border/40 px-4 py-2 text-center text-xs text-muted-foreground">
                Aperçu du village et de son architecture typique
              </figcaption>
            </figure>

            {/* Récit et histoire du village */}
            <div className="flex flex-col gap-4 leading-relaxed text-foreground/90">
              <p>
                Racontez ici l&apos;histoire de ce village : ses fondateurs, ses périodes de prospérité ou de crise,
                et ce qui rend son implantation unique sur les terres de Hyori.
              </p>
              <p>
                Décrivez l&apos;ambiance au quotidien, les coutumes locales, le type de gouvernement (seigneurie, conseil d&apos;anciens, corporation...)
                ainsi que ses ressources économiques majeures (mines, agriculture, commerce fluvial, artisanat d&apos;élite...).
              </p>
            </div>

            {/* Fiche synthétique / Caractéristiques clés (facultatif) */}
            <footer className="mt-2 rounded-lg border border-border/60 bg-muted/20 p-4">
              <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="font-semibold text-foreground">Autorité / Dirigeant</dt>
                  <dd className="mt-0.5 text-muted-foreground">Conseil des Anciens / Seigneur X</dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground">Climat & Environnement</dt>
                  <dd className="mt-0.5 text-muted-foreground">Vallée tempérée, forêts denses</dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground">Symbole / Emblème</dt>
                  <dd className="mt-0.5 text-muted-foreground">Le Faucon d&apos;Ébène</dd>
                </div>
              </dl>
            </footer>
          </div>
        </article>
        {/* FIN DU MODÈLE DE VILLAGE */}
      </section>
    </div>
  );
}
