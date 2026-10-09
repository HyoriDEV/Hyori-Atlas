import Link from "next/link";

import { getCharacterStats } from "@/lib/services/statistics/character-stats";
import { describeGranularity, type StatisticsRange } from "@/lib/services/statistics/timeline";
import { formatNumber, formatPercent, pluralize } from "@/lib/statistics-format";
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
