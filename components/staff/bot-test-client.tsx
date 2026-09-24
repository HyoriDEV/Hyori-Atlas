"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Pulse,
  ArrowClockwise,
  CheckCircle,
  PaperPlaneTilt,
  ShieldCheck,
  WarningCircle,
  XCircle,
  UserPlus,
  Scroll,
  Ticket,
  CircleNotch,
  User,
  ListBullets,
} from "@phosphor-icons/react";

import {
  CharacterClass,
  CharacterSheetStatus,
  RegistrationStatus,
} from "@/lib/generated/prisma/enums";
import { CHARACTER_CLASSES } from "@/lib/character-classes";
import {
  testBotHealthAction,
  testCharacterSheetNotificationAction,
  testInterviewReminderAction,
  testRegistrationNotificationAction,
  testRoleSyncAction,
  testTicketCreatedNotificationAction,
  testTicketNotificationAction,
} from "@/lib/actions/bot-test-actions";
import { type CharacterSheetNotificationStatus } from "@/lib/services/discord-bot-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { BotHealthResponse } from "@/lib/services/discord-bot-service";
import { cn } from "@/lib/utils";

interface LogEntry {
  id: string;
  time: string;
  action: string;
  success: boolean;
  notified?: boolean;
  dmClosed?: boolean;
  message?: string;
  error?: string;
  raw?: unknown;
}

let logCounter = 0;
function createLogEntry(
  action: string,
  result: {
    success: boolean;
    notified?: boolean;
    dmClosed?: boolean;
    message?: string;
    error?: string;
    raw?: unknown;
  }
): LogEntry {
  logCounter += 1;
  return {
    id: `log-${Date.now()}-${logCounter}`,
    time: new Date().toLocaleTimeString(),
    action,
    success: result.success,
    notified: result.notified,
    dmClosed: result.dmClosed,
    message: result.message,
    error: result.error,
    raw: result.raw,
  };
}

export function BotTestClient({
  currentDiscordId,
  currentDiscordUsername,
}: {
  currentDiscordId: string;
  currentDiscordUsername: string;
}) {
  const [targetId, setTargetId] = useState(currentDiscordId);
  const [selectedClass, setSelectedClass] = useState<CharacterClass>(CharacterClass.NOBLE);
  const [health, setHealth] = useState<BotHealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isPending, startTransition] = useTransition();

  const isBusy = isPending || loadingAction !== null;

  function addLog(
    action: string,
    result: {
      success: boolean;
      notified?: boolean;
      dmClosed?: boolean;
      message?: string;
      error?: string;
      raw?: unknown;
    }
  ) {
    const entry = createLogEntry(action, result);
    setLogs((prev) => [entry, ...prev.slice(0, 19)]);
  }

  async function handleHealthCheck() {
    setHealthLoading(true);
    try {
      const res = await testBotHealthAction();
      setHealth(res);
      if (res.success) {
        toast.success("HyoriBot est en ligne et accessible !");
      } else {
        toast.error(`HyoriBot injoignable : ${res.error}`);
      }
      addLog("Health Check (/health)", {
        success: res.success,
        message: res.status
          ? `Status: ${res.status}, Discord Ready: ${res.discord?.ready}`
          : undefined,
        error: res.error,
        raw: res,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      toast.error(msg);
      addLog("Health Check (/health)", { success: false, error: msg });
    } finally {
      setHealthLoading(false);
    }
  }

  function handleRegistrationTest(status: RegistrationStatus, label: string) {
    if (!targetId.trim()) {
      toast.error("Veuillez renseigner un ID Discord cible.");
      return;
    }

    const actionKey = `reg_${status}`;
    setLoadingAction(actionKey);
    startTransition(async () => {
      try {
        const res = await testRegistrationNotificationAction(targetId, status);
        if (res.success && res.notified) {
          toast.success(`Notification envoyée en MP avec succès (${label}) !`);
        } else if (res.dmClosed) {
          toast.warning("Notification simulée : le membre a désactivé ses MP ou bloqué le bot.");
        } else if (res.success && !res.notified) {
          toast.info(`Requête acceptée (ce statut ne déclenche pas de MP).`);
        } else {
          toast.error(`Échec : ${res.error}`);
        }
        addLog(`Notification Inscription [${status}]`, {
          success: res.success,
          notified: res.notified,
          dmClosed: res.dmClosed,
          message: res.message,
          error: res.error,
          raw: res,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erreur inattendue";
        toast.error(msg);
        addLog(`Notification Inscription [${status}]`, { success: false, error: msg });
      } finally {
        setLoadingAction(null);
      }
    });
  }

  function handleSheetTest(status: CharacterSheetNotificationStatus, label: string) {
    if (!targetId.trim()) {
      toast.error("Veuillez renseigner un ID Discord cible.");
      return;
    }

    const actionKey = `sheet_${status}`;
    setLoadingAction(actionKey);
    startTransition(async () => {
      try {
        const res = await testCharacterSheetNotificationAction(targetId, status);
        if (res.success && res.notified) {
          toast.success(`Notification de fiche envoyée en MP (${label}) !`);
        } else if (res.dmClosed) {
          toast.warning("Notification simulée : le membre a désactivé ses MP ou bloqué le bot.");
        } else if (res.success && !res.notified) {
          toast.info("Requête acceptée (ce statut ne déclenche pas de MP).");
        } else {
          toast.error(`Échec : ${res.error}`);
        }
        addLog(`Notification Fiche [${status}]`, {
          success: res.success,
          notified: res.notified,
          dmClosed: res.dmClosed,
          message: res.message,
          error: res.error,
          raw: res,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erreur inattendue";
        toast.error(msg);
        addLog(`Notification Fiche [${status}]`, { success: false, error: msg });
      } finally {
        setLoadingAction(null);
      }
    });
  }

  function handleInterviewReminderTest() {
    if (!targetId.trim()) {
      toast.error("Veuillez renseigner un ID Discord cible.");
      return;
    }

    setLoadingAction("sheet_reminder");
    startTransition(async () => {
      try {
        const res = await testInterviewReminderAction(targetId);
        if (res.success && res.notified) {
          toast.success("Notification de relance d'entretien envoyée en MP !");
        } else if (res.dmClosed) {
          toast.warning("Notification simulée : le membre a désactivé ses MP ou bloqué le bot.");
        } else {
          toast.error(`Échec : ${res.error}`);
        }
        addLog("Notification Relance Entretien", {
          success: res.success,
          notified: res.notified,
          dmClosed: res.dmClosed,
          message: res.message,
          error: res.error,
          raw: res,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erreur inattendue";
        toast.error(msg);
        addLog("Notification Relance Entretien", { success: false, error: msg });
      } finally {
        setLoadingAction(null);
      }
    });
  }

  function handleTicketMessageTest() {
    if (!targetId.trim()) {
      toast.error("Veuillez renseigner un ID Discord cible.");
      return;
    }

    setLoadingAction("ticket_msg");
    startTransition(async () => {
      try {
        const res = await testTicketNotificationAction(targetId);
        if (res.success && res.notified) {
          toast.success("Notification de nouveau message de ticket envoyée en MP !");
        } else if (res.dmClosed) {
          toast.warning("Notification simulée : le membre a désactivé ses MP ou bloqué le bot.");
        } else {
          toast.error(`Échec : ${res.error}`);
        }
        addLog("Notification Message Ticket", {
          success: res.success,
          notified: res.notified,
          dmClosed: res.dmClosed,
          message: res.message,
          error: res.error,
          raw: res,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erreur inattendue";
        toast.error(msg);
        addLog("Notification Message Ticket", { success: false, error: msg });
      } finally {
        setLoadingAction(null);
      }
    });
  }

  function handleTicketCreatedTest() {
    setLoadingAction("ticket_created");
    startTransition(async () => {
      try {
        const res = await testTicketCreatedNotificationAction();
        if (res.success && res.notified) {
          toast.success("Notification d'ouverture de ticket envoyée sur le salon Discord !");
        } else {
          toast.error(`Échec : ${res.error}`);
        }
        addLog("Notification Ouverture Ticket (Salon externe)", {
          success: res.success,
          notified: res.notified,
          message: res.message,
          error: res.error,
          raw: res,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erreur inattendue";
        toast.error(msg);
        addLog("Notification Ouverture Ticket (Salon externe)", { success: false, error: msg });
      } finally {
        setLoadingAction(null);
      }
    });
  }

  function handleRoleSyncTest() {
    if (!targetId.trim()) {
      toast.error("Veuillez renseigner un ID Discord cible.");
      return;
    }

    setLoadingAction("role_sync");
    startTransition(async () => {
      try {
        const res = await testRoleSyncAction(targetId, selectedClass);
        if (res.success) {
          toast.success(
            `Rôles Whitelist et ${selectedClass} synchronisés avec succès sur Discord !`
          );
        } else {
          toast.error(`Échec de synchronisation des rôles : ${res.error}`);
        }
        addLog(`Synchro Rôles [${selectedClass}]`, {
          success: res.success,
          message: res.message,
          error: res.error,
          raw: res,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erreur inattendue";
        toast.error(msg);
        addLog(`Synchro Rôles [${selectedClass}]`, { success: false, error: msg });
      } finally {
        setLoadingAction(null);
      }
    });
  }

  const registrationActions = [
    {
      id: `reg_${RegistrationStatus.WHITELIST_IN_PROGRESS}`,
      badge: "Acceptée",
      badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
      title: "Candidature acceptée",
      description: "Validation de la candidature écrite : passage aux étapes entretien vocal et rédaction de la fiche.",
      onClick: () =>
        handleRegistrationTest(
          RegistrationStatus.WHITELIST_IN_PROGRESS,
          "Candidature acceptée"
        ),
    },
    {
      id: `reg_${RegistrationStatus.REJECTED}`,
      badge: "Refusée",
      badgeClass: "border-destructive/30 bg-destructive/10 text-destructive",
      title: "Candidature non retenue",
      description: "Information au candidat que sa candidature n'a pas été retenue par l'équipe staff.",
      onClick: () =>
        handleRegistrationTest(RegistrationStatus.REJECTED, "Candidature refusée"),
    },
    {
      id: `reg_${RegistrationStatus.WAITLIST}`,
      badge: "Waitlist",
      badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-600",
      title: "Réintégration sur la liste d'attente",
      description: "Notification de réintégration ou placement du joueur sur la liste d'attente.",
      onClick: () =>
        handleRegistrationTest(
          RegistrationStatus.WAITLIST,
          "Réintégration liste d'attente"
        ),
    },
    {
      id: `reg_${RegistrationStatus.WHITELISTED}`,
      badge: "Whitelisté",
      badgeClass: "border-primary/30 bg-primary/10 text-primary",
      title: "Validation définitive (accès serveur)",
      description: "Félicitations et confirmation de l'accès officiel et complet au serveur Minecraft Hyori.",
      onClick: () =>
        handleRegistrationTest(
          RegistrationStatus.WHITELISTED,
          "Validation définitive"
        ),
    },
  ];

  const sheetActions = [
    {
      id: `sheet_${CharacterSheetStatus.VALIDATED}`,
      badge: "Validée",
      badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
      title: "Fiche personnage validée",
      description: "Confirmation de validation de la fiche par le staff et invitation à réserver un entretien.",
      onClick: () =>
        handleSheetTest(CharacterSheetStatus.VALIDATED, "Fiche validée"),
    },
    {
      id: `sheet_${CharacterSheetStatus.PENDING_PLAYER}`,
      badge: "Retours",
      badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-600",
      title: "Retours disponibles sur la fiche",
      description: "Notification indiquant au joueur que des retours ou demandes de corrections ont été postés.",
      onClick: () =>
        handleSheetTest(CharacterSheetStatus.PENDING_PLAYER, "Retours disponibles"),
    },
    {
      id: "sheet_REOPENED",
      badge: "Réouverture",
      badgeClass: "border-blue-500/30 bg-blue-500/10 text-blue-600",
      title: "Fiche personnage rouverte",
      description: "Alerte informant le joueur que sa fiche a été rouverte pour lui permettre d'éditer ses textes.",
      onClick: () => handleSheetTest("REOPENED", "Fiche rouverte"),
    },
    {
      id: "sheet_reminder",
      badge: "Relance",
      badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-600",
      title: "Relance réservation d'entretien",
      description: "Rappel automatique au candidat ayant une fiche validée de réserver son créneau d'entretien.",
      onClick: handleInterviewReminderTest,
    },
  ];

  const ticketActions = [
    {
      id: "ticket_msg",
      badge: "Nouveau message",
      badgeClass: "border-primary/30 bg-primary/10 text-primary",
      title: "Nouveau message de ticket (MP Joueur)",
      description: "Notification en message privé Discord envoyée au joueur lorsqu'un membre du staff lui répond.",
      onClick: handleTicketMessageTest,
    },
    {
      id: "ticket_created",
      badge: "Ouverture Ticket",
      badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-600",
      title: "Alerte d'ouverture de ticket (Salon externe Staff)",
      description: "Publication d'un embed d'alerte avec bouton d'accès dans le salon Discord staff dédié.",
      onClick: handleTicketCreatedTest,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* 1. État de santé & Cible du test côte à côte */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Carte État de santé */}
        <Card className="flex flex-col justify-between">
          <div>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Pulse className="text-primary size-5" />
                  État de la passerelle HyoriBot
                </CardTitle>
                <CardDescription className="text-xs">
                  Vérifiez la disponibilité de l&apos;API interne et de la passerelle Discord.
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleHealthCheck}
                disabled={healthLoading}
                className="gap-1.5 shrink-0"
              >
                <ArrowClockwise className={healthLoading ? "size-3.5 animate-spin" : "size-3.5"} />
                {healthLoading ? "Vérification..." : "Tester la connexion"}
              </Button>
            </CardHeader>
            <CardContent>
              {health ? (
                <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-2 xl:grid-cols-4">
                  <div className="bg-muted/40 rounded-lg border p-2.5">
                    <span className="text-muted-foreground block text-[11px]">
                      Serveur HTTP Bot
                    </span>
                    <div className="mt-1 flex items-center gap-1.5">
                      {health.success ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                        >
                          En ligne ({health.status ?? "ok"})
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Hors-ligne</Badge>
                      )}
                    </div>
                  </div>

                  <div className="bg-muted/40 rounded-lg border p-2.5">
                    <span className="text-muted-foreground block text-[11px]">
                      Passerelle Discord
                    </span>
                    <div className="mt-1 flex items-center gap-1.5 font-medium">
                      {health.discord?.ready ? (
                        <span className="flex items-center gap-1 text-emerald-600">
                          <CheckCircle className="size-3.5" /> Prête ({health.discord.pingMs} ms)
                        </span>
                      ) : (
                        <span className="text-destructive flex items-center gap-1">
                          <XCircle className="size-3.5" /> Non connectée
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-muted/40 rounded-lg border p-2.5">
                    <span className="text-muted-foreground block text-[11px]">
                      Serveurs (Guilds)
                    </span>
                    <span className="mt-1 block font-medium">
                      {health.discord?.guildsCached ?? 0} serveur(s) détecté(s)
                    </span>
                  </div>

                  <div className="bg-muted/40 rounded-lg border p-2.5">
                    <span className="text-muted-foreground block text-[11px]">
                      File d&apos;attente Bot
                    </span>
                    <span className="mt-1 block font-medium">
                      {health.queue?.totalProcessed ?? 0} traitées (échecs:{" "}
                      {health.queue?.totalFailed ?? 0})
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-xs py-2">
                  Cliquez sur &quot;Tester la connexion&quot; pour sonder l&apos;API interne de
                  HyoriBot.
                </p>
              )}
            </CardContent>
          </div>
        </Card>

        {/* Carte Cible du test */}
        <Card className="flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="text-primary size-5" />
                ID Discord cible pour les tests
              </CardTitle>
              <CardDescription className="text-xs">
                Par défaut, votre propre ID Discord est renseigné afin que vous receviez directement
                les messages privés de test.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <Label htmlFor="target-id" className="sr-only">
                    ID Discord
                  </Label>
                  <Input
                    id="target-id"
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    placeholder="Ex: 1533676574111567952"
                    className="font-mono text-sm"
                  />
                </div>
                {targetId !== currentDiscordId && (
                  <Button variant="outline" size="sm" onClick={() => setTargetId(currentDiscordId)}>
                    Mon compte ({currentDiscordUsername})
                  </Button>
                )}
              </div>
              <p className="text-muted-foreground text-[11px]">
                Compte administrateur actif :{" "}
                <strong className="text-foreground">{currentDiscordUsername}</strong> (ID :{" "}
                <code>{currentDiscordId}</code>)
              </p>
            </CardContent>
          </div>
        </Card>
      </div>

      {/* 2. Organisation par Onglets thématiques pour les tests */}
      <Tabs defaultValue="registration" className="flex flex-col gap-4">
        <TabsList className="bg-muted/70 p-1 rounded-xl h-auto grid grid-cols-2 sm:grid-cols-4 w-full sm:w-auto">
          <TabsTrigger value="registration" className="gap-2 px-3 py-2 text-xs font-medium">
            <UserPlus className="size-4 shrink-0" />
            <span>Inscriptions</span>
          </TabsTrigger>
          <TabsTrigger value="character-sheet" className="gap-2 px-3 py-2 text-xs font-medium">
            <Scroll className="size-4 shrink-0" />
            <span>Fiches</span>
          </TabsTrigger>
          <TabsTrigger value="tickets" className="gap-2 px-3 py-2 text-xs font-medium">
            <Ticket className="size-4 shrink-0" />
            <span>Tickets</span>
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2 px-3 py-2 text-xs font-medium">
            <ShieldCheck className="size-4 shrink-0" />
            <span>Rôles Discord</span>
          </TabsTrigger>
        </TabsList>

        {/* Onglet 1 : Inscriptions */}
        <TabsContent value="registration">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <UserPlus className="text-primary size-5" />
                Notifications d&apos;Inscription (MP Discord)
              </CardTitle>
              <CardDescription className="text-xs">
                Simulez les messages privés reçus par le candidat lors des différentes étapes de son processus de candidature.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {registrationActions.map((action) => (
                  <div
                    key={action.id}
                    className="bg-card hover:bg-muted/30 flex flex-col gap-3 rounded-lg border p-3.5 transition-colors sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <Badge
                        variant="outline"
                        className={cn("mt-0.5 shrink-0 text-[11px] font-semibold", action.badgeClass)}
                      >
                        {action.badge}
                      </Badge>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-sm font-medium text-foreground">{action.title}</span>
                        <span className="text-muted-foreground text-xs">{action.description}</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs shrink-0 self-end sm:self-center"
                      onClick={action.onClick}
                      disabled={isBusy}
                    >
                      {loadingAction === action.id ? (
                        <>
                          <CircleNotch className="size-3.5 animate-spin" />
                          <span>Envoi...</span>
                        </>
                      ) : (
                        <>
                          <PaperPlaneTilt className="size-3.5" />
                          <span>Tester l&apos;envoi</span>
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet 2 : Fiches Personnage */}
        <TabsContent value="character-sheet">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Scroll className="text-primary size-5" />
                Notification Fiche Personnage (MP Discord)
              </CardTitle>
              <CardDescription className="text-xs">
                Simulez la notification de validation, de retours staff, de réouverture ou de relance d&apos;entretien.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {sheetActions.map((action) => (
                  <div
                    key={action.id}
                    className="bg-card hover:bg-muted/30 flex flex-col gap-3 rounded-lg border p-3.5 transition-colors sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <Badge
                        variant="outline"
                        className={cn("mt-0.5 shrink-0 text-[11px] font-semibold", action.badgeClass)}
                      >
                        {action.badge}
                      </Badge>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-sm font-medium text-foreground">{action.title}</span>
                        <span className="text-muted-foreground text-xs">{action.description}</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs shrink-0 self-end sm:self-center"
                      onClick={action.onClick}
                      disabled={isBusy}
                    >
                      {loadingAction === action.id ? (
                        <>
                          <CircleNotch className="size-3.5 animate-spin" />
                          <span>Envoi...</span>
                        </>
                      ) : (
                        <>
                          <PaperPlaneTilt className="size-3.5" />
                          <span>Tester l&apos;envoi</span>
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet 3 : Tickets */}
        <TabsContent value="tickets">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Ticket className="text-primary size-5" />
                Notifications Tickets (MP &amp; Salon Staff)
              </CardTitle>
              <CardDescription className="text-xs">
                Simulez les alertes relatives au support : message privé au joueur et notification dans le salon staff externe.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {ticketActions.map((action) => (
                  <div
                    key={action.id}
                    className="bg-card hover:bg-muted/30 flex flex-col gap-3 rounded-lg border p-3.5 transition-colors sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <Badge
                        variant="outline"
                        className={cn("mt-0.5 shrink-0 text-[11px] font-semibold", action.badgeClass)}
                      >
                        {action.badge}
                      </Badge>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-sm font-medium text-foreground">{action.title}</span>
                        <span className="text-muted-foreground text-xs">{action.description}</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs shrink-0 self-end sm:self-center"
                      onClick={action.onClick}
                      disabled={isBusy}
                    >
                      {loadingAction === action.id ? (
                        <>
                          <CircleNotch className="size-3.5 animate-spin" />
                          <span>Envoi...</span>
                        </>
                      ) : (
                        <>
                          <PaperPlaneTilt className="size-3.5" />
                          <span>Tester l&apos;envoi</span>
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet 4 : Rôles Discord */}
        <TabsContent value="roles">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="text-primary size-5" />
                Synchronisation Rôles Discord (Whitelist + Classe RP)
              </CardTitle>
              <CardDescription className="text-xs">
                Attribuez instantanément le rôle Whitelist et le rôle de classe RP correspondant sur le Discord pour le compte cible.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div>
                <span className="text-xs font-medium text-foreground mb-2.5 block">
                  Sélectionnez la classe RP à synchroniser :
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {CHARACTER_CLASSES.map((cls) => {
                    const Icon = cls.icon;
                    const isSelected = selectedClass === cls.id;
                    return (
                      <button
                        key={cls.id}
                        type="button"
                        onClick={() => setSelectedClass(cls.id)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border text-left transition-all cursor-pointer",
                          isSelected
                            ? "border-primary bg-primary/10 text-primary shadow-2xs"
                            : "border-border hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <div
                          className={cn(
                            "p-2 rounded-md shrink-0",
                            isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                          )}
                        >
                          <Icon size={18} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-semibold truncate">{cls.id}</span>
                          <span className="text-[11px] text-muted-foreground truncate">{cls.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground">
                  Rôle de classe sélectionné : <strong className="text-foreground">{selectedClass}</strong> + rôle Whitelist Discord.
                </p>
                <Button
                  onClick={handleRoleSyncTest}
                  disabled={isBusy}
                  className="gap-2 text-xs shrink-0 w-full sm:w-auto"
                >
                  {loadingAction === "role_sync" ? (
                    <>
                      <CircleNotch className="size-4 animate-spin" />
                      <span>Synchronisation en cours...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="size-4" />
                      <span>Attribuer Whitelist + {selectedClass}</span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 3. Journal d'exécution en direct */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ListBullets className="text-primary size-4" />
              Journal des tests en direct
            </CardTitle>
            <CardDescription className="text-xs">
              Détails techniques des dernières réponses reçues de HyoriBot.
            </CardDescription>
          </div>
          {logs.length > 0 && (
            <Button size="xs" variant="ghost" onClick={() => setLogs([])}>
              Effacer
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-xs">
              Aucun test déclenché pour le moment. Cliquez sur un des boutons de test ci-dessus pour lancer une simulation.
            </p>
          ) : (
            <div className="flex flex-col gap-2 font-mono text-xs">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="bg-muted/30 flex flex-col gap-1 rounded-md border p-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {log.success ? (
                        <CheckCircle className="size-4 shrink-0 text-emerald-500" />
                      ) : (
                        <WarningCircle className="text-destructive size-4 shrink-0" />
                      )}
                      <span className="text-foreground font-semibold">{log.action}</span>
                    </div>
                    <span className="text-muted-foreground text-[10px]">{log.time}</span>
                  </div>

                  <div className="text-muted-foreground flex flex-wrap gap-2 text-[11px]">
                    {log.notified !== undefined && (
                      <span>
                        Notifié par MP : <strong>{log.notified ? "Oui" : "Non"}</strong>
                      </span>
                    )}
                    {log.dmClosed && (
                      <Badge
                        variant="outline"
                        className="border-amber-500/30 text-[10px] text-amber-500"
                      >
                        MP fermés / Bot bloqué
                      </Badge>
                    )}
                    {log.message && <span className="text-foreground">{log.message}</span>}
                    {log.error && (
                      <span className="text-destructive font-semibold">{log.error}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
