"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check } from "@phosphor-icons/react";
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
import { getMinecraftStatusAction } from "@/lib/actions/minecraft-actions";

interface MinecraftLinkDialogProps {
  linked: boolean;
  serverAddress: string;
  serverVersion: string;
  authCommand?: string;
}

export function MinecraftLinkDialog({
  linked,
  serverAddress,
  serverVersion,
}: MinecraftLinkDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [code, setCode] = useState<string | null>(null);

  const commandText = code ? `/auth ${code}` : "/auth <code>";

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
        }
      } catch {
        // Fallback
      }
    }

    loadStatus();

    // Poll every 4 seconds: detects server link OR transparently auto-renews code if expired
    const pollInterval = setInterval(async () => {
      try {
        const res = await getMinecraftStatusAction();
        if (!isMounted) return;

        if (res.linked) {
          toast.success(`Compte lié avec succès à ${res.minecraftUsername || "Minecraft"} !`);
          clearInterval(pollInterval);
          router.refresh();
          setIsOpen(false);
          return;
        }

        if (res.activeCode) {
          setCode(res.activeCode.code);
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

  async function handleCopyCommand() {
    try {
      await navigator.clipboard.writeText(commandText);
      setCopiedCommand(true);
      toast.success("Commande copiée dans le presse-papiers !");
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
      <DialogContent>
        <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Lier ton compte Minecraft</DialogTitle>
            <DialogDescription>
              Connecte-toi au serveur et exécute la commande en jeu pour confirmer ton compte.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="server-address" className="text-muted-foreground text-sm font-medium">
                Adresse du serveur
              </label>
              <div className="relative flex items-center">
                <input
                  id="server-address"
                  type="text"
                  value={serverAddress}
                  readOnly
                  className="border-input bg-muted/50 w-full rounded-md border px-3 py-1.5 pr-9 text-sm font-medium focus:outline-none"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleCopyAddress}
                  className="absolute right-1.5"
                >
                  {copiedAddress ? <Check /> : <Copy />}
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="server-version" className="text-muted-foreground text-sm font-medium">
                Version
              </label>
              <input
                id="server-version"
                type="text"
                value={serverVersion}
                readOnly
                className="border-input bg-muted/50 w-full rounded-md border px-3 py-1.5 text-sm font-medium focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="link-command" className="text-muted-foreground text-sm font-medium">
                Commande à exécuter en jeu
              </label>
              <div className="relative flex items-center">
                <input
                  id="link-command"
                  type="text"
                  value={commandText}
                  readOnly
                  className="border-input bg-muted/50 w-full rounded-md border px-3 py-1.5 pr-9 font-mono text-sm focus:outline-none"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleCopyCommand}
                  className="absolute right-1.5"
                >
                  {copiedCommand ? <Check /> : <Copy />}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <DialogClose render={<Button />}>Fermer</DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
