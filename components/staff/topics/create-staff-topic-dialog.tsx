"use client";

import { useState, useTransition } from "react";
import { DiscordLogo, Hash } from "@phosphor-icons/react";
import { toast } from "sonner";

import { createStaffTopicAction } from "@/lib/actions/topic-actions";
import { slugifyTopic } from "@/lib/topic-constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface CreateStaffTopicDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  ticketId?: string;
  ticketSubject?: string;
  defaultContext?: string;
}

export function CreateStaffTopicDialog({
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  trigger,
  ticketId,
  ticketSubject,
  defaultContext = "",
}: CreateStaffTopicDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const defaultTitle = ticketSubject ? `${ticketSubject}` : "";
  const [title, setTitle] = useState(defaultTitle);
  const [slug, setSlug] = useState(() => slugifyTopic(defaultTitle));
  const [slugManuallyModified, setSlugManuallyModified] = useState(false);
  const [context, setContext] = useState(defaultContext);
  const [actions, setActions] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(nextOpen: boolean) {
    if (isPending) return;
    if (isControlled) {
      setControlledOpen?.(nextOpen);
    } else {
      setInternalOpen(nextOpen);
    }
    if (nextOpen) {
      const resetTitle = ticketSubject ? `${ticketSubject}` : "";
      setTitle(resetTitle);
      setSlug(slugifyTopic(resetTitle));
      setSlugManuallyModified(false);
      setContext(defaultContext);
      setActions("");
    }
  }

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugManuallyModified) {
      setSlug(slugifyTopic(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlug(value);
    setSlugManuallyModified(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedContext = context.trim();
    const trimmedActions = actions.trim();

    if (!trimmedTitle) {
      toast.error("Le titre du sujet est obligatoire.");
      return;
    }
    if (!trimmedContext) {
      toast.error("Le contexte du sujet est obligatoire.");
      return;
    }
    if (!trimmedActions) {
      toast.error("Les actions à entreprendre sont obligatoires.");
      return;
    }

    startTransition(async () => {
      const res = await createStaffTopicAction({
        title: trimmedTitle,
        slug: slug.trim(),
        context: trimmedContext,
        actions: trimmedActions,
        ticketId: ticketId ?? null,
      });

      if (!res.success || !res.data) {
        toast.error(res.error || "Erreur lors de la création du sujet.");
        return;
      }

      const created = res.data;
      toast.success(`Le sujet Discord #${created.slug} a été créé dans la catégorie Sujets.`, {
        action: created.channelUrl
          ? {
              label: "Ouvrir Discord",
              onClick: () => window.open(created.channelUrl!, "_blank"),
            }
          : undefined,
      });

      handleOpenChange(false);
    });
  }

  return (
    <>
      {!isControlled && trigger && <DialogTrigger render={trigger as React.ReactElement} />}
      {!isControlled && !trigger && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleOpenChange(true)}
          title="Créer un salon de sujet sur le Discord staff"
          className="gap-1.5"
        >
          <Hash className="size-4 text-[#5865F2]" />
          <span>Créer un sujet</span>
        </Button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl sm:p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-[#5865F2]/10 text-[#5865F2]">
                  <DiscordLogo className="size-5" />
                </div>
                <div>
                  <DialogTitle>Nouveau sujet de discussion</DialogTitle>
                  <DialogDescription>
                    Initialise un salon textuel dans la catégorie <strong>Sujets</strong> sur le
                    Discord staff.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-1">
              {ticketId && (
                <div className="bg-muted/50 border-border flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-foreground font-semibold">Ticket associé :</span>
                    <span className="text-muted-foreground truncate">
                      #{ticketId.slice(-6)} {ticketSubject ? `— ${ticketSubject}` : ""}
                    </span>
                  </div>
                  <span className="shrink-0 rounded bg-[#5865F2]/10 px-1.5 py-0.5 font-medium text-[#5865F2]">
                    Bouton Discord inclus
                  </span>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="topic-title">Titre du sujet</Label>
                  <Input
                    id="topic-title"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Ex: Clarification règle alliance"
                    maxLength={120}
                    required
                    disabled={isPending}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="topic-slug">Nom du salon Discord</Label>
                    <span className="text-muted-foreground text-[10px]">kebab-case</span>
                  </div>
                  <div className="relative flex items-center">
                    <span className="text-muted-foreground absolute left-3 text-xs select-none">
                      #
                    </span>
                    <Input
                      id="topic-slug"
                      value={slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      placeholder="clarification-regle-alliance"
                      maxLength={100}
                      className="pl-7 font-mono text-xs"
                      disabled={isPending}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="topic-context">Contexte (# Contexte)</Label>
                  <span className="text-muted-foreground text-[11px]">Titre H1 Markdown</span>
                </div>
                <Textarea
                  id="topic-context"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Explique la problématique, son origine et la situation actuelle..."
                  rows={4}
                  required
                  disabled={isPending}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="topic-actions">Actions à entreprendre (# Actions)</Label>
                  <span className="text-muted-foreground text-[11px]">Titre H1 Markdown</span>
                </div>
                <Textarea
                  id="topic-actions"
                  value={actions}
                  onChange={(e) => setActions(e.target.value)}
                  placeholder="- Définir la position officielle du staff&#10;- Mettre à jour les règles ou le backlog si besoin&#10;- Faire un retour au joueur"
                  rows={4}
                  required
                  disabled={isPending}
                />
              </div>
            </div>

            <DialogFooter>
              <DialogClose render={<Button variant="outline" disabled={isPending} />}>
                Annuler
              </DialogClose>
              <Button
                type="submit"
                disabled={isPending || !title.trim() || !context.trim() || !actions.trim()}
                className="gap-1.5"
              >
                <Hash className="size-4" />
                {isPending ? "Création du salon..." : "Créer le sujet Discord"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
