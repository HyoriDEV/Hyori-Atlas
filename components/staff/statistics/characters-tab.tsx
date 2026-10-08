import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

import { MAX_SKILL_POINTS } from "@/lib/character-sheet";
import { getCharacterStats } from "@/lib/services/statistics/character-stats";
import { describeGranularity, type StatisticsRange } from "@/lib/services/statistics/timeline";
import { formatNumber, formatPercent, pluralize } from "@/lib/statistics-format";
import { Button } from "@/components/ui/button";
import { SkinHead } from "@/components/ui/skin-head";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatTile } from "@/components/dashboard/stat-tile";
import { BarList } from "@/components/staff/statistics/bar-list";
import {
  ChartCard,
  ChartEmptyState,
  StatisticsSection,
} from "@/components/staff/statistics/chart-card";
import { TimeSeriesChart } from "@/components/staff/statistics/time-series-chart";

export async function CharactersTab({ range }: { range: StatisticsRange }) {
  const stats = await getCharacterStats(range);
  const { writing } = stats;

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-5">
        <StatTile
          label="Personnages en jeu"
          value={formatNumber(stats.activeCharacters)}
          hint="actifs, fiche validée"
        />
        <StatTile
          label="Âge moyen"
          value={stats.meanAge === null ? "—" : `${formatNumber(stats.meanAge)} ans`}
          hint="des personnages en jeu"
        />
        <StatTile
          label="Joueurs qui écrivent"
          value={formatNumber(writing.authors)}
          hint={
            writing.whitelisted > 0
              ? `${formatPercent(writing.authors / writing.whitelisted)} des whitelistés`
              : undefined
          }
        />
        <StatTile
          label="Mots écrits"
          value={formatNumber(writing.totalWords)}
          hint={pluralize(writing.totalChapters, "chapitre")}
        />
        <StatTile
          label="Moyenne par auteur"
          value={
            writing.meanWordsPerAuthor === null
              ? "—"
              : formatNumber(Math.round(writing.meanWordsPerAuthor))
          }
          hint="mots"
        />
      </div>

      <StatisticsSection
        title="Personnages"
        description="État actuel, indépendant de la période choisie."
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard title="Statut" description="Tous les personnages créés.">
            <BarList items={stats.byStatus} showShare emptyLabel="Aucun personnage." />
          </ChartCard>
          <ChartCard title="Genre" description="Personnages en jeu.">
            <BarList items={stats.gender} showShare emptyLabel="Aucun personnage en jeu." />
          </ChartCard>
          <ChartCard title="Âge" description="Personnages en jeu.">
            <BarList items={stats.ageBands} showShare emptyLabel="Aucun personnage en jeu." />
          </ChartCard>
        </div>

        <ChartCard
          title="Compétences moyennes"
          description={`Moyenne sur ${MAX_SKILL_POINTS} points des personnages en jeu.`}
        >
          {stats.activeCharacters === 0 ? (
            <ChartEmptyState>Aucun personnage en jeu.</ChartEmptyState>
          ) : (
            <div className="grid grid-cols-1 gap-x-8 gap-y-5 lg:grid-cols-3">
              {stats.skills.map((category) => (
                <div key={category.category} className="flex flex-col gap-2.5">
                  <h4 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    {category.category}
                  </h4>
                  <BarList
                    max={MAX_SKILL_POINTS}
                    decimals={1}
                    items={category.skills.map((skill) => ({
                      label: skill.label,
                      value: skill.average,
                    }))}
                  />
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Classes et métiers retenus"
          description={`Affiliation renseignée par ${pluralize(stats.affiliatedPlayers, "joueur")}, selon le choix retenu par le staff.`}
          action={
            <Button
              size="sm"
              variant="outline"
              render={<Link href="/staff/distribution" prefetch={false} />}
            >
              Voir la distribution
              <ArrowRight className="size-3.5" />
            </Button>
          }
        >
          {stats.affiliatedPlayers === 0 ? (
            <ChartEmptyState>Aucune affiliation renseignée.</ChartEmptyState>
          ) : (
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-2">
              {stats.classes.map((playerClass) => (
                <div key={playerClass.name} className="flex flex-col gap-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h4 className="text-foreground text-sm font-semibold">{playerClass.name}</h4>
                    <span className="text-muted-foreground text-xs">
                      {pluralize(playerClass.count, "joueur")} ·{" "}
                      {formatPercent(playerClass.count / stats.affiliatedPlayers)}
                    </span>
                  </div>
                  <BarList
                    items={playerClass.roles}
                    emptyLabel="Aucun joueur avec un métier précis."
                  />
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </StatisticsSection>

      <StatisticsSection title="Écriture de trame">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard
            title={`Chapitres créés ${describeGranularity(writing.granularity)}`}
            description={`${pluralize(writing.chaptersInPeriod, "chapitre créé", "chapitres créés")} sur la période.`}
          >
            <TimeSeriesChart
              data={writing.timeline}
              series={[{ key: "chapters", label: "Chapitres créés", color: "var(--chart-1)" }]}
            />
          </ChartCard>

          <ChartCard
            title="Auteurs les plus prolifiques"
            description="Tous personnages confondus, depuis le début."
          >
            {writing.topAuthors.length === 0 ? (
              <ChartEmptyState>Aucune trame rédigée pour l&apos;instant.</ChartEmptyState>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Joueur</TableHead>
                    <TableHead className="text-right">Mots</TableHead>
                    <TableHead className="text-right">Chapitres</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {writing.topAuthors.map((author) => (
                    <TableRow key={author.playerId}>
                      <TableCell>
                        <Link
                          href={`/staff/writing/${author.playerId}`}
                          prefetch={false}
                          className="inline-flex items-center gap-2 transition-opacity hover:opacity-80"
                          title={`Lire la trame de ${author.name}`}
                        >
                          <SkinHead size="sm" username={author.minecraftUsername ?? author.name} />
                          <span className="font-medium hover:underline">{author.name}</span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(author.words)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right tabular-nums">
                        {formatNumber(author.chapters)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ChartCard>
        </div>
      </StatisticsSection>
    </div>
  );
}
