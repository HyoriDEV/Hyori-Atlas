"use client";

import { useState } from "react";
import { Copy, Check } from "@phosphor-icons/react";

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

const SERVER_ADDRESS = "link.hyorirp.fr";
const SERVER_VERSION = "1.21.11";
const LINK_COMMAND = "/link <code>";

export function MinecraftLinkDialog({ linked }: { linked: boolean }) {
  const [copied, setCopied] = useState(false);

  if (linked) {
    return null;
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(LINK_COMMAND);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button />}>Se connecter</DialogTrigger>
      <DialogContent>
        <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Lier votre compte Minecraft</DialogTitle>
            <DialogDescription>
              Connecte-toi au serveur et exécute la commande en jeu pour confirmer ton compte.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="server-address" className="text-muted-foreground text-sm font-medium">
                Adresse du serveur
              </label>
              <input
                id="server-address"
                type="text"
                value={SERVER_ADDRESS}
                readOnly
                className="border-input bg-muted/50 w-full rounded-md border px-3 py-1.5 text-sm font-medium focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="server-version" className="text-muted-foreground text-sm font-medium">
                Version
              </label>
              <input
                id="server-version"
                type="text"
                value={SERVER_VERSION}
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
                  value={LINK_COMMAND}
                  readOnly
                  className="border-input bg-muted/50 w-full rounded-md border px-3 py-1.5 pr-9 font-mono text-sm focus:outline-none"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleCopy}
                  className="absolute right-1.5"
                >
                  {copied ? <Check /> : <Copy />}
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
