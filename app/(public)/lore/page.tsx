import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getGlobalSettings } from "@/lib/services/settings-service";

export const metadata: Metadata = {
  title: "Lore de Hyori RP",
  description:
    "Découvre l'histoire du monde de Hyori RP, les récits ancestraux et les villages qui le composent.",
};

export default async function LorePage() {
  const settings = await getGlobalSettings();
  if (!settings.publicLoreEnabled) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6 text-justify">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl tracking-tight sm:text-[40px]">Lore de Hyori RP</h1>
      </div>

      <section aria-labelledby="general-lore-heading" className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground text-sm leading-relaxed sm:text-base">
            L&apos;histoire prend place dans la province fictive de Hyori, à l&apos;est du Japon,
            alors que s&apos;amorce le Bakumatsu. De 1853 à 1868, cette période tourmentée annonce
            la fin du shogunat Tokugawa. Les crises politiques et sociales s&apos;y multiplient,
            plongeant Hyori dans un chaos dont elle ne sortira pas indemne.
          </p>
        </div>

        <div className="border-border relative aspect-video w-full overflow-hidden rounded-xl border bg-black shadow-md">
          <iframe
            src="https://www.youtube-nocookie.com/embed/td2008u5UTM?rel=0"
            title="Trailer officiel de Hyori RP"
            className="absolute inset-0 h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        <blockquote className="border-primary/60 text-muted-foreground border-l-2 py-1 pl-4 font-serif text-base italic sm:text-lg">
          « Hyori tient encore. Mais regarde bien : les fissures sont toujours là. »
        </blockquote>

        <article className="text-foreground/90 flex flex-col gap-6 leading-relaxed">
          <h3 className="font-heading text-2xl font-semibold tracking-tight">
            ⛵ Les navires noirs (1853)
          </h3>

          <p>
            Il y a 11 ans, des navires étrangers apparaissent à l&apos;horizon et forcent le
            shogunat à ouvrir ses ports. À Hyori, on observe d&apos;abord cela comme on regarde un
            orage trop loin pour être dangereux. Le bourg est petit, encaissé dans ses habitudes,
            trop habitué à penser que les grandes secousses du monde restent toujours de
            l&apos;autre côté des collines ou de la mer. On parle des bateaux étrangers dans les
            marchés, sur les quais, dans les maisons de thé, mais avec cette distance qu&apos;on
            réserve aux catastrophes qui n&apos;arrivent qu&apos;aux autres.
          </p>

          <p>
            Puis les semaines passent. Les bateaux ne repartent pas. Les demandes changent de ton.
            Les routes commerciales s&apos;ouvrent, les prix se déplacent, les comptes deviennent
            plus lourds. Le monde extérieur n&apos;entre pas à Hyori avec fracas ; il s&apos;y
            glisse, d&apos;abord par les ports, puis par les taxes, puis par les ordres. Les anciens
            disent plus tard que c&apos;est à ce moment-là que tout a commencé à se dérégler. Pas
            d&apos;un seul coup. Pas comme une rupture nette. Plutôt comme une fissure qui traverse
            lentement le bois d&apos;une maison jusqu&apos;à rendre tout le reste fragile.
          </p>
        </article>

        <article className="text-foreground/90 flex flex-col gap-6 leading-relaxed">
          <h3 className="font-heading text-2xl font-semibold tracking-tight">
            🎎 Le nouveau clan (1854)
          </h3>

          <p>
            L&apos;année suivante, le shogunat a voulu reprendre les choses en main. Les seigneurs
            qui tenaient Hyori depuis six générations sont chassés, sans égard particulier pour ce
            qu&apos;ils avaient laissé derrière eux. Un clan loyaliste prend leur place, avec ses
            hommes, ses sceaux, ses habitudes et son désir brutal de prouver qu&apos;il mérite la
            confiance du pouvoir central. En trois semaines, Hyori change de visage.
          </p>

          <p>
            Les armes du peuple sont confisquées. Les anciens leviers de défense disparaissent des
            maisons, des granges, des étals, des coins de chemin. Les hommes du clan contrôlent ce
            qui entre et ce qui sort. Le tribut, lui, grimpe de quatre parts sur dix à sept. Pour
            beaucoup de familles, ce n&apos;est pas une réforme : c&apos;est une condamnation lente.
            Les vieux du village appellent cela simplement “l&apos;année”. Ils ne précisent jamais
            laquelle, parce qu&apos;il n&apos;y en a qu&apos;une seule dans leur mémoire. C&apos;est
            celle où la vie est devenue plus lourde, plus coûteuse, plus silencieuse. À partir de
            là, Hyori comprend une règle nouvelle : obéir ne garantit pas d&apos;être épargné, mais
            désobéir garantit d&apos;être écrasé.
          </p>
        </article>

        <article className="text-foreground/90 flex flex-col gap-6 leading-relaxed">
          <h3 className="font-heading text-2xl font-semibold tracking-tight">
            ⚔️ La tentative d&apos;insurrection (1856)
          </h3>

          <p>
            Il y a 8 ans, neuf hameaux se soulèvent. Ce n&apos;est pas une grande armée, ni une
            rébellion noble, ni un mouvement parfaitement organisé. C&apos;est un soulèvement de
            nécessité. Les hommes prennent ce qu&apos;ils peuvent : faux de paysans, fléaux,
            couteaux, douze arbalètes volées à un entrepôt côtier. Les femmes cachent, nourrissent,
            soignent, préviennent. Les jeunes courent entre les hameaux. Tout part d&apos;une colère
            qui ne peut plus se taire.
          </p>

          <p>
            Les insurgés tiennent la digue quatre jours. Quatre jours pendant lesquels certains
            commencent à croire qu&apos;Hyori peut encore se redresser. Qu&apos;un autre avenir est
            possible. Qu&apos;une province peut faire trembler ceux qui la serrent à la gorge. Mais
            au cinquième jour, la cavalerie entre dans les rizières. Le sol devient un piège, la
            brume un couvercle, et le sang se mêle à l&apos;eau des champs. Quatre cents morts. Les
            meneurs sont capturés, puis exposés sur la digue jusqu&apos;à ce qu&apos;il n&apos;y ait
            plus rien à exposer.
          </p>

          <p>
            Après cela, Hyori change de langage. On ne parle plus de victoire, ni de justice, ni
            même de révolte. On parle de prudence. De survie. De silence. La leçon est retenue par
            tous : Hyori n&apos;attaque plus jamais de face.
          </p>
        </article>

        <article className="text-foreground/90 flex flex-col gap-6 leading-relaxed">
          <h3 className="font-heading text-2xl font-semibold tracking-tight">
            🍚 Le départ des ressources (1858)
          </h3>

          <p>
            Il y a 6 ans, le riz de Hyori commence à partir vers le port. Il se vend trois fois son
            prix aux étrangers, et le clan y voit une fortune. Sur les registres, cela ressemble à
            un succès. Dans les greniers, cela ressemble à un vide. Les sacs quittent les entrepôts
            alors que les récoltes ne sont même pas encore toutes rentrées, et les villages
            comprennent trop tard que la richesse du port n&apos;est pas la leur.
          </p>

          <p>
            Le premier hiver de famine est celui où les gens apprennent à mesurer les grains. À
            étirer les soupes. À mélanger le riz avec tout ce qui peut encore passer pour de la
            nourriture. À faire semblant de ne pas avoir faim devant les enfants. Depuis, il y en a
            eu six. Six hivers où l&apos;on compte les réserves, où l&apos;on ferme les volets plus
            tôt, où les plus jeunes grandissent avec cette idée que manquer est une habitude
            normale. Les marchés ne sont pas toujours vides, mais ils sont trop chers. Les bateaux
            repartent chargés, et les maisons se referment avec un sentiment d&apos;humiliation qui
            ne dit pas son nom. Le peuple finit par comprendre que la faim n&apos;est pas un
            accident. C&apos;est un système.
          </p>
        </article>
      </section>

      <section aria-labelledby="villages-heading" className="flex flex-col gap-8 pt-4">
        <header className="flex flex-col gap-2">
          <h2
            id="villages-heading"
            className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            Villages de la province
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed sm:text-base">
            La population de Hyori est organisée au sein de cinq lieux principaux.
          </p>
        </header>

        <article className="border-border bg-card hover:border-border/80 flex flex-col overflow-hidden rounded-xl border transition-colors">
          <div className="flex flex-col gap-6 p-6 sm:p-8">
            <figure className="bg-muted/20 overflow-hidden rounded-lg">
              <Image
                src="/lore/main-city.webp"
                alt="Grande ville"
                width={1920}
                height={1033}
                className="h-auto w-full object-cover"
              />
            </figure>

            <div className="text-foreground/90 flex flex-col gap-4 leading-relaxed">
              <h3 className="font-heading text-2xl font-semibold tracking-tight">Grande Ville</h3>

              <p>
                La grande ville concentre tout ce qui est visible, contrôlé et affiché. C'est là que
                les taxes sont levées, que les ordres sont écrits, que les registres sont tenus, que
                les rumeurs prennent forme, que les marchés s'ouvrent et que les tensions se
                croisent. Les quartiers y sont probablement plus marqués qu'ailleurs :
                administratif, marchand, résidentiel, samouraï, portuaire, basse-ville. C'est le
                lieu où les influences de tout le territoire se rencontrent.
              </p>

              <p>
                La ville donne l'image d'une province qui fonctionne. On y voit les rues nettoyées,
                les bâtiments tenus, les gardes, les fonctionnaires, les allées et venues. Mais en
                dessous, il y a les dettes, les marchés gris, les affaires non déclarées, les
                familles sous pression, les registres falsifiés, les caisses qui passent au port
                sans être notées et les alliances invisibles. C'est le cœur de Hyori, mais un cœur
                malade.
              </p>
            </div>
          </div>
        </article>

        <article className="border-border bg-card hover:border-border/80 flex flex-col overflow-hidden rounded-xl border transition-colors">
          <div className="flex flex-col gap-6 p-6 sm:p-8">
            <figure className="bg-muted/20 overflow-hidden rounded-lg">
              <Image
                src="/lore/fishing-village.webp"
                alt="Village de Pêche"
                width={1920}
                height={1033}
                className="h-auto w-full object-cover"
              />
            </figure>

            <div className="text-foreground/90 flex flex-col gap-4 leading-relaxed">
              <h3 className="font-heading text-2xl font-semibold tracking-tight">
                Village de Pêche
              </h3>

              <p>
                Sur la côte, le village de Pêche vit au rythme de la mer. Les départs ont lieu avant
                l'aube, souvent dans un silence presque religieux. Les hommes, les femmes et parfois
                les plus jeunes connaissent les marées comme d'autres connaissent les routes : ils
                savent quand sortir, quand rentrer, quand éviter certains courants, quand la météo
                annonce le danger. Le poisson, le sel, les filets, les réparations des embarcations
                et les livraisons au port rythment la vie du village.
              </p>

              <p>
                Depuis les réformes et les taxes, les pêcheurs n'appartiennent plus tout à fait à
                eux-mêmes. Une part des prises est réquisitionnée, une autre vendue au port, et le
                reste doit suffire à nourrir les familles. Cela crée des habitudes très
                particulières : on cache parfois une partie des paniers, on échange du poisson
                contre des services, on garde des contacts secrets avec certains marchands ou
                certaines familles de la ville.
              </p>

              <p>
                Le village est exposé, vulnérable, mais aussi mobile et difficile à contrôler
                totalement. C'est un lieu idéal pour les rumeurs, les arrivages clandestins, les
                messages transportés entre quartiers et les marchandises qui ne devraient jamais
                passer par les registres officiels.
              </p>
            </div>
          </div>
        </article>

        <article className="border-border bg-card hover:border-border/80 flex flex-col overflow-hidden rounded-xl border transition-colors">
          <div className="flex flex-col gap-6 p-6 sm:p-8">
            <figure className="bg-muted/20 overflow-hidden rounded-lg">
              <Image
                src="/lore/farming-village.webp"
                alt="Village des Paysans"
                width={1920}
                height={1033}
                className="h-auto w-full object-cover"
              />
            </figure>

            <div className="text-foreground/90 flex flex-col gap-4 leading-relaxed">
              <h3 className="font-heading text-2xl font-semibold tracking-tight">
                Village des Paysans
              </h3>

              <p>
                Dans les terres plus intérieures, les villages agricoles forment la base de Hyori.
                Les rizières, les champs et les zones boisées plus épaisses déterminent leur rythme.
                Là, la vie se mesure en saisons, en récoltes, en pluies, en pénuries et en taxes.
                Les paysans travaillent tôt, très tôt, souvent avant que la lumière n'ait
                complètement envahi les plaines. Les éleveurs, eux, gardent les bêtes, organisent
                les abris, protègent les jeunes animaux et négocient les déplacements. Les bûcherons
                vivent un peu à part, plus près des lisières, avec leurs coupes, leurs charrettes,
                leurs sentiers de coupe et leurs allers-retours vers les ateliers et la ville.
              </p>

              <p>
                Dans ces villages, tout le monde sait qu'il faut paraître loyal. On remet le tribut.
                On s'incline. On évite les mots dangereux. Mais en coulisse, les familles
                développent des habitudes de survie très nettes : cacher une partie des grains,
                enterrer des réserves, répartir la nourriture entre plusieurs maisons, prévenir les
                voisins quand les collecteurs approchent, faire semblant d'avoir moins que ce qu'on
                a réellement. Les paysans de Hyori ne vivent pas dans le confort ; ils vivent dans
                l'endurance et la retenue. Ils sont ceux qui nourrissent tout le reste, tout en
                étant les premiers à manquer.
              </p>

              <p>
                Les bûcherons, eux, sont utiles à tout le monde : bois de chauffage, charpentes,
                outils, réparations, barrières, emballages. Ils sont souvent les premiers à savoir
                si une zone de forêt devient dangereuse ou si un sentier a été utilisé pour autre
                chose que la coupe.
              </p>
            </div>
          </div>
        </article>

        <article className="border-border bg-card hover:border-border/80 flex flex-col overflow-hidden rounded-xl border transition-colors">
          <div className="flex flex-col gap-6 p-6 sm:p-8">
            <figure className="bg-muted/20 overflow-hidden rounded-lg">
              <Image
                src="/lore/mining-village.webp"
                alt="Village des Mines"
                width={1920}
                height={1033}
                className="h-auto w-full object-cover"
              />
            </figure>

            <div className="text-foreground/90 flex flex-col gap-4 leading-relaxed">
              <h3 className="font-heading text-2xl font-semibold tracking-tight">
                Village des Mines
              </h3>

              <p>
                Le village des Mines est l'un des plus importants de la province, même si son
                prestige reste inférieur à celui de la grande ville. Il vit de feu, de sueur et de
                précision. On y forge les lames, mais aussi les outils agricoles, les pièces de
                charpente, les clous, les crochets, les serrures, les charnières, les cerclages et
                tout ce qui permet à Hyori de fonctionner. Les forgerons sont indispensables, ce qui
                les rend à la fois respectés et surveillés.
              </p>

              <p>
                Leur quotidien est marqué par des horaires lourds : on allume tôt, on entretient le
                feu presque sans arrêt, on travaille dans le bruit du métal et des marteaux, on
                refroidit, on ajuste, on recommence. Le village a aussi ses règles internes : tout y
                est compté, pesé, réparé, vérifié. Les commandes venues du clan ont priorité, mais
                ce n'est pas toujours celles-là qui rapportent le plus. Certains forgerons
                travaillent donc pour le public le jour, et pour des clients plus discrets la nuit.
              </p>
            </div>
          </div>
        </article>

        <article className="border-border bg-card hover:border-border/80 flex flex-col overflow-hidden rounded-xl border transition-colors">
          <div className="flex flex-col gap-6 p-6 sm:p-8">
            <figure className="bg-muted/20 overflow-hidden rounded-lg">
              <Image
                src="/lore/scholar-village.webp"
                alt="Village des Érudits"
                width={1920}
                height={1033}
                className="h-auto w-full object-cover"
              />
            </figure>

            <div className="text-foreground/90 flex flex-col gap-4 leading-relaxed">
              <h3 className="font-heading text-2xl font-semibold tracking-tight">
                Village des Érudits
              </h3>

              <p>
                À l'origine, ce lieu n'était qu'un simple point de passage. On y croisait des
                artisans, des guérisseurs, des commerçants de route et des voyageurs qui
                s'arrêtaient une nuit ou deux avant de repartir. Puis, peu à peu, le village a pris
                une autre importance. Les maîtres qui y passaient ont commencé à rester plus
                longtemps. Les apprentis aussi. Les ateliers se sont multipliés, les remèdes se sont
                accumulés, les techniques se sont affinées. À force d'être un lieu où l'on apprend,
                où l'on échange et où l'on répare, le village est devenu le principal centre de
                savoir pratique de Hyori.
              </p>

              <p>
                Le village est pourtant loin d'être uni. Deux visions s'y confrontent constamment.
                D'un côté, ceux qui pensent que le savoir doit circuler librement, parce qu'une
                technique utile à tous ne devrait pas rester enfermée dans une seule main. De
                l'autre, ceux qui considèrent qu'un secret vaut de l'or, et qu'un remède, une
                teinture ou une méthode de conservation peut rapporter davantage s'il est protégé,
                vendu ou réservé à quelques familles.
              </p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
