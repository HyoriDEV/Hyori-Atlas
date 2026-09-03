"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, ArrowClockwise, Clock, ShieldCheck } from "@phosphor-icons/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  generateMinecraftCodeAction,
  getMinecraftStatusAction,
} from "@/lib/actions/minecraft-actions";

interface MinecraftLinkDialogProps {
  linked: boolean;
  serverAddress: string;
  serverVersion: string;
  authCommand: string;
}

export function MinecraftLinkDialog({
  linked,
  serverAddress,
  serverVersion,
  authCommand,
}: MinecraftLinkDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isExpired, setIsExpired] = useState(false);
  const [isGenerating, startGenerating] = useTransition();

  const commandPrefix = authCommand.replace(/^\//, "").trim() || "auth";
  const fullCommand = code ? `/${commandPrefix} ${code}` : `/${commandPrefix} <code>`;

  // Fetch or generate code when modal opens
  useEffect(() => {
    if (!isOpen || linked) return;

    let isMounted = true;

    async function loadStatus() {
      try {
        const status = await getMinecraftStatusAction();
        if (!isMounted) return;

        if (status.linked) {
          toast.success("Compte Minecraft déjà lié !");
          router.refresh();
          setIsOpen(false);
          return;
        }

        if (status.activeCode) {
          setCode(status.activeCode.code);
          setExpiresAt(new Date(status.activeCode.expiresAt));
        } else {
          // Auto generate if none
          handleGenerateNewCode();
        }
      } catch {
        // Fallback
      }
    }

    loadStatus();

    // Poll every 4 seconds while modal is open to detect server link
    const pollInterval = setInterval(async () => {
      try {
        const res = await getMinecraftStatusAction();
        if (res.linked) {
          toast.success(`Compte lié avec succès à ${res.minecraftUsername || "Minecraft"} !`);
          clearInterval(pollInterval);
          router.refresh();
          setIsOpen(false);
        }
      } catch {
        // Ignore poll error
      }
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [isOpen, linked, router]);

  // Countdown timer effect
  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft("");
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = expiresAt.getTime() - now;

      if (diff <= 0) {
        setTimeLeft("Expiré");
        setIsExpired(true);
        clearInterval(interval);
      } else {
        setIsExpired(false);
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${minutes}:${seconds < 10 ? "0" : ""}${seconds}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  function handleGenerateNewCode() {
    startGenerating(async () => {
      const res = await generateMinecraftCodeAction();
      if (res.success && res.code && res.expiresAt) {
        setCode(res.code);
        setExpiresAt(new Date(res.expiresAt));
        setIsExpired(false);
        toast.success("Nouveau code généré !");
      } else {
        toast.error(res.message || "Erreur lors de la génération du code.");
      }
    });
  }

  async function handleCopyCommand() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(fullCommand);
      setCopiedCommand(true);
      toast.success("Commande copiée !");
      setTimeout(() => setCopiedCommand(false), 2000);
    } catch {
      toast.error("Impossible de copier la commande.");
    }
  }

  async function handleCopyAddress() {
    try {
      await navigator.clipboard.writeText(serverAddress);
      setCopiedAddress(true);
      toast.success("Adresse du serveur copiée !");
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch {
      toast.error("Impossible de copier l'adresse.");
    }
  }

  if (linked) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<Button />}>Se connecter</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col gap-4">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-primary/10 p-2 text-primary">
                <ShieldCheck className="size-5" />
              </div>
              <DialogTitle>Lier ton compte Minecraft</DialogTitle>
            </div>
            <DialogDescription>
              Connecte-toi sur notre serveur de liaison et tape la commande en jeu pour certifier ton identité.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            {/* Server Connection Info */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs font-medium">Adresse du serveur</span>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={serverAddress}
                    readOnly
                    className="border-input bg-muted/50 w-full rounded-md border px-2.5 py-1.5 pr-8 text-xs font-mono font-medium focus:outline-none"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={handleCopyAddress}
                    className="absolute right-1 text-muted-foreground hover:text-foreground"
                  >
                    {copiedAddress ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs font-medium">Version</span>
                <input
                  type="text"
                  value={serverVersion}
                  readOnly
                  className="border-input bg-muted/50 w-full rounded-md border px-2.5 py-1.5 text-xs font-medium focus:outline-none"
                />
              </div>
            </div>

            {/* Generated Link Code Display */}
            <div className="rounded-lg border bg-card p-3 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Code de vérification
                </span>
                {timeLeft && (
                  <span
                    className={`flex items-center gap-1 text-xs font-medium ${
                      isExpired ? "text-destructive font-semibold" : "text-amber-500 dark:text-amber-400"
                    }`}
                  >
                    <Clock className="size-3" />
                    {isExpired ? "Expiré" : `Expire dans ${timeLeft}`}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="font-mono text-2xl font-bold tracking-widest text-primary px-1">
                  {code ? (
                    <span className={isExpired ? "line-through opacity-50" : ""}>{code}</span>
                  ) : (
                    <span className="text-sm font-normal text-muted-foreground italic">Génération...</span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateNewCode}
                  disabled={isGenerating}
                  className="gap-1.5 text-xs"
                >
                  <ArrowClockwise className={`size-3.5 ${isGenerating ? "animate-spin" : ""}`} />
                  Nouveau code
                </Button>
              </div>
            </div>

            {/* In-Game Command to run */}
            <div className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-xs font-medium">
                Commande à copier et exécuter en jeu
              </span>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={fullCommand}
                  readOnly
                  className="border-input bg-muted/60 w-full rounded-md border px-3 py-2 pr-10 font-mono text-sm font-semibold tracking-wide focus:outline-none"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleCopyCommand}
                  disabled={!code || isExpired}
                  className="absolute right-1.5 text-muted-foreground hover:text-foreground"
                >
                  {copiedCommand ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Rejoins le serveur et colle cette commande dans le chat. Ton compte sera automatiquement validé !
              </p>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <span className="inline-block size-2 rounded-full bg-emerald-500 animate-pulse" />
              En attente de connexion...
            </span>
            <DialogClose render={<Button variant="outline" size="sm" />}>Fermer</DialogClose>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
