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
  testRegistrationNotificationAction,
  testRoleSyncAction,
} from "@/lib/actions/bot-test-actions";
import { type CharacterSheetNotificationStatus } from "@/lib/services/discord-bot-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { BotHealthResponse } from "@/lib/services/discord-bot-service";

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
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isPending, startTransition] = useTransition();

  function addLog(action: string, result: { success: boolean; notified?: boolean; dmClosed?: boolean; message?: string; error?: string; raw?: unknown }) {
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      time: new Date().toLocaleTimeString(),
      action,
      success: result.success,
      notified: result.notified,
      dmClosed: result.dmClosed,
      message: result.message,
      error: result.error,
      raw: result.raw,
    };
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
        message: res.status ? `Status: ${res.status}, Discord Ready: ${res.discord?.ready}` : undefined,
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
      }
    });
  }

  function handleSheetTest(status: CharacterSheetNotificationStatus, label: string) {
    if (!targetId.trim()) {
      toast.error("Veuillez renseigner un ID Discord cible.");
      return;
    }

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
      }
    });
  }

  function handleRoleSyncTest() {
    if (!targetId.trim()) {
      toast.error("Veuillez renseigner un ID Discord cible.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await testRoleSyncAction(targetId, selectedClass);
        if (res.success) {
          toast.success(`Rôles Whitelist et ${selectedClass} synchronisés avec succès sur Discord !`);
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
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Carte État de santé */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Pulse className="size-5 text-primary" />
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
            className="gap-1.5"
          >
            <ArrowClockwise className={healthLoading ? "animate-spin size-3.5" : "size-3.5"} />
            {healthLoading ? "Vérification..." : "Tester la connexion"}
          </Button>
        </CardHeader>
        <CardContent>
          {health ? (
            <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
              <div className="bg-muted/40 rounded-lg border p-2.5">
                <span className="text-muted-foreground block text-[11px]">Serveur HTTP Bot</span>
                <div className="mt-1 flex items-center gap-1.5">
                  {health.success ? (
                    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600">
                      En ligne ({health.status ?? "ok"})
                    </Badge>
                  ) : (
                    <Badge variant="destructive">Hors-ligne</Badge>
                  )}
                </div>
              </div>

              <div className="bg-muted/40 rounded-lg border p-2.5">
                <span className="text-muted-foreground block text-[11px]">Passerelle Discord</span>
                <div className="mt-1 flex items-center gap-1.5 font-medium">
                  {health.discord?.ready ? (
                    <span className="text-emerald-600 flex items-center gap-1">
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
                <span className="text-muted-foreground block text-[11px]">Serveurs (Guilds)</span>
                <span className="mt-1 block font-medium">
                  {health.discord?.guildsCached ?? 0} serveur(s) détecté(s)
                </span>
              </div>

              <div className="bg-muted/40 rounded-lg border p-2.5">
                <span className="text-muted-foreground block text-[11px]">File d&apos;attente Bot</span>
                <span className="mt-1 block font-medium">
                  {health.queue?.totalProcessed ?? 0} traitées (échecs: {health.queue?.totalFailed ?? 0})
                </span>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">
              Cliquez sur &quot;Tester la connexion&quot; pour sonder l&apos;API interne de HyoriBot.
            </p>
          )}
        </CardContent>
      </Card>

      {/* 2. Cible du test */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">ID Discord cible pour les tests</CardTitle>
          <CardDescription className="text-xs">
            Par défaut, votre propre ID Discord est renseigné afin que vous receviez directement les
            messages privés de test.
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTargetId(currentDiscordId)}
              >
                Mon compte ({currentDiscordUsername})
              </Button>
            )}
          </div>
          <p className="text-muted-foreground text-[11px]">
            Compte administrateur actif : <strong className="text-foreground">{currentDiscordUsername}</strong> (ID : <code>{currentDiscordId}</code>)
          </p>
        </CardContent>
      </Card>

      {/* 3. Déclencheurs de test */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Actions Notifications Inscription */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <PaperPlaneTilt className="size-4 text-primary" />
              Notifications d&apos;Inscription (MP Discord)
            </CardTitle>
            <CardDescription className="text-xs">
              Simulez les messages privés reçus lors de l&apos;avancement du joueur dans le processus d&apos;inscription.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5">
            <Button
              variant="outline"
              size="sm"
              className="justify-start gap-2 text-xs"
              onClick={() => handleRegistrationTest(RegistrationStatus.WHITELIST_IN_PROGRESS, "Candidature acceptée")}
              disabled={isPending}
            >
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 text-[10px]">
                Acceptée
              </Badge>
              Candidature acceptée (passage entretien & fiche)
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="justify-start gap-2 text-xs"
              onClick={() => handleRegistrationTest(RegistrationStatus.REJECTED, "Candidature refusée")}
              disabled={isPending}
            >
              <Badge variant="outline" className="bg-destructive/10 text-destructive text-[10px]">
                Refusée
              </Badge>
              Candidature non retenue
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="justify-start gap-2 text-xs"
              onClick={() => handleRegistrationTest(RegistrationStatus.WAITLIST, "Réintégration liste d'attente")}
              disabled={isPending}
            >
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 text-[10px]">
                Waitlist
              </Badge>
              Réintégration sur la liste d&apos;attente
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="justify-start gap-2 text-xs"
              onClick={() => handleRegistrationTest(RegistrationStatus.WHITELISTED, "Validation définitive")}
              disabled={isPending}
            >
              <Badge variant="outline" className="bg-primary/10 text-primary text-[10px]">
                Whitelisté
              </Badge>
              Validation définitive (accès complet au serveur)
            </Button>
          </CardContent>
        </Card>

        {/* Actions Notifications Fiche & Rôles */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <PaperPlaneTilt className="size-4 text-primary" />
                Notification Fiche Personnage (MP Discord)
              </CardTitle>
              <CardDescription className="text-xs">
                Simulez la notification de validation, de retours ou de réouverture par le staff.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 text-xs"
                onClick={() => handleSheetTest(CharacterSheetStatus.VALIDATED, "Fiche validée")}
                disabled={isPending}
              >
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 text-[10px]">
                  Validée
                </Badge>
                Fiche personnage validée par le staff
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 text-xs"
                onClick={() => handleSheetTest(CharacterSheetStatus.PENDING_PLAYER, "Retours disponibles")}
                disabled={isPending}
              >
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 text-[10px]">
                  Retours
                </Badge>
                Retours disponibles sur la fiche personnage
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 text-xs"
                onClick={() => handleSheetTest("REOPENED", "Fiche rouverte")}
                disabled={isPending}
              >
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 text-[10px]">
                  Réouverture
                </Badge>
                Fiche personnage rouverte par le staff
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <ShieldCheck className="size-4 text-primary" />
                Synchronisation Rôles Discord (Whitelist + Classe)
              </CardTitle>
              <CardDescription className="text-xs">
                Attribuez instantanément le rôle Whitelist et le rôle de classe RP sur le Discord.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-1.5">
                {CHARACTER_CLASSES.map((cls) => {
                  const Icon = cls.icon;
                  const isSelected = selectedClass === cls.id;
                  return (
                    <Button
                      key={cls.id}
                      type="button"
                      size="xs"
                      variant={isSelected ? "default" : "outline"}
                      onClick={() => setSelectedClass(cls.id)}
                      className="gap-1.5 text-xs"
                    >
                      <Icon size={14} />
                      {cls.singularLabel}
                    </Button>
                  );
                })}
              </div>

              <Button
                size="sm"
                onClick={handleRoleSyncTest}
                disabled={isPending}
                className="gap-1.5 text-xs"
              >
                <ShieldCheck className="size-4" />
                Attribuer Whitelist + {selectedClass} sur Discord
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 4. Journal d'exécution en direct */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm font-semibold">Journal des tests en direct</CardTitle>
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
            <p className="text-muted-foreground text-xs py-4 text-center">
              Aucun test déclenché pour le moment. Cliquez sur un des boutons ci-dessus pour tester.
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
                        <CheckCircle className="text-emerald-500 size-4 shrink-0" />
                      ) : (
                        <WarningCircle className="text-destructive size-4 shrink-0" />
                      )}
                      <span className="font-semibold text-foreground">{log.action}</span>
                    </div>
                    <span className="text-muted-foreground text-[10px]">{log.time}</span>
                  </div>

                  <div className="text-[11px] text-muted-foreground flex flex-wrap gap-2">
                    {log.notified !== undefined && (
                      <span>Notifié par MP : <strong>{log.notified ? "Oui" : "Non"}</strong></span>
                    )}
                    {log.dmClosed && (
                      <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-[10px]">
                        MP fermés / Bot bloqué
                      </Badge>
                    )}
                    {log.message && <span className="text-foreground">{log.message}</span>}
                    {log.error && <span className="text-destructive font-semibold">{log.error}</span>}
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
