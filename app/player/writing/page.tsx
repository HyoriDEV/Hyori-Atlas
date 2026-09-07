import Link from "next/link";
import { BookOpen } from "@phosphor-icons/react/dist/ssr";

import { requireActivePlayer } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getPlayerCharacters } from "@/lib/services/character-service";
import { CharacterSheetStatus, CharacterStatus, RegistrationStatus } from "@/lib/generated/prisma/enums";
import { characterStatusLabels, isRegistrationStatusAtLeast } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LockedFeatureCard } from "@/components/locked-feature-card";
import { ChapterWorkspace } from "@/components/player/chapter-workspace";
import { CharacterSwitcher } from "@/components/player/character-switcher";
import { getGlobalSettings } from "@/lib/services/settings-service";

export default async function WritingPage(props: {
  searchParams: Promise<{ characterId?: string }>;
}) {
  const user = await requireActivePlayer();
  const searchParams = await props.searchParams;
  const settings = await getGlobalSettings();
  const isWhitelisted = isRegistrationStatusAtLeast(
    user.registrationStatus,
    RegistrationStatus.WHITELISTED
  );

  if (!isWhitelisted) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
        <h1 className="font-heading shrink-0 text-2xl font-semibold">Écriture de trame</h1>
        <LockedFeatureCard description="Débloqué une fois ton inscription acceptée à la whitelist." />
      </div>
    );
  }

  const allCharacters = await getPlayerCharacters(user.id);

  // Trouver le personnage cible : soit via searchParams, soit le personnage ACTIVE, soit le premier
  let selectedCharacter = allCharacters.find((c) => c.id === searchParams.characterId);
  if (!selectedCharacter) {
    selectedCharacter =
      allCharacters.find((c) => c.status === CharacterStatus.ACTIVE) ?? allCharacters[0] ?? null;
  }

  if (!selectedCharacter) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
        <h1 className="font-heading shrink-0 text-2xl font-semibold">Écriture de trame</h1>
        <LockedFeatureCard description="Aucun personnage actif trouvé. Attends que le staff t'attribue un personnage." />
      </div>
    );
  }

  const isSheetValidated = selectedCharacter.reviewStatus === CharacterSheetStatus.VALIDATED;
  const isCharacterActive = selectedCharacter.status === CharacterStatus.ACTIVE;
  const canWrite = settings.chapterWritingEnabled && isCharacterActive && isSheetValidated;

  const chapters = await prisma.chapter.findMany({
    where: { playerId: user.id, characterSheetId: selectedCharacter.id },
    orderBy: { order: "asc" },
  });

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-2xl font-semibold">Écriture de trame</h1>
          {selectedCharacter && (
            <span className="text-muted-foreground text-sm">
              ({selectedCharacter.name || "Nouveau personnage"})
            </span>
          )}
        </div>
        {chapters.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-8.5 gap-2 text-xs font-medium shadow-xs sm:text-sm"
            render={
              <Link
                href={`/player/writing/preview?characterId=${selectedCharacter.id}`}
              />
            }
          >
            <BookOpen className="text-primary size-4" />
            <span>Prévisualiser</span>
          </Button>
        )}
      </div>

      {allCharacters.length > 1 && (
        <CharacterSwitcher
          characters={allCharacters.map((c) => ({
            id: c.id,
            name: c.name,
            status: c.status,
            reviewStatus: c.reviewStatus,
            createdAt: c.createdAt,
          }))}
          selectedCharacterId={selectedCharacter.id}
        />
      )}

      {!isCharacterActive && (
        <Card className="border-border/60 bg-muted/40 flex flex-col gap-1 p-4">
          <p className="text-foreground text-sm font-semibold">
            {selectedCharacter.status === CharacterStatus.DEAD
              ? "Trame archivée d'un personnage décédé (Mort)."
              : "Trame archivée d'un personnage désactivé."}
          </p>
          <p className="text-muted-foreground text-xs">
            Ces chapitres sont conservés pour votre historique et restent consultables en lecture seule.
          </p>
        </Card>
      )}

      {!isSheetValidated ? (
        <Card className="border-border/60 bg-muted/30 flex flex-col items-center justify-center p-8 text-center">
          <BookOpen className="text-muted-foreground size-10 opacity-60" />
          <h3 className="font-heading mt-3 text-lg font-semibold">Fiche personnage en attente de validation</h3>
          <p className="text-muted-foreground mt-1 max-w-md text-xs leading-relaxed">
            La fiche de ton personnage « {selectedCharacter.name || "Nouveau personnage"} » doit d&apos;abord être validée par le staff avant de pouvoir commencer la rédaction de sa trame narrative.
          </p>
          <Button
            variant="default"
            size="sm"
            className="mt-4 text-xs font-medium"
            render={<Link href={`/player/character-sheet?characterId=${selectedCharacter.id}`} />}
          >
            Voir la fiche personnage
          </Button>
        </Card>
      ) : (
        <ChapterWorkspace
          chapterWritingEnabled={canWrite}
          initialChapters={chapters.map((chapter) => ({
            id: chapter.id,
            title: chapter.title,
            content: chapter.content,
            order: chapter.order,
          }))}
        />
      )}
    </div>
  );
}
