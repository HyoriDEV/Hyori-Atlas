"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Scroll, Wrench, CheckCircle, EyeSlash } from "@phosphor-icons/react";
import { toast } from "sonner";

import { createTicket } from "@/lib/actions/ticket-actions";
import { TICKET_SUBJECT_MAX_LENGTH } from "@/lib/ticket-constants";
import type { TicketCategoryConfigData } from "@/lib/actions/ticket-config-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface NewTicketDialogProps {
  ticketCreationEnabled?: boolean;
  categories?: TicketCategoryConfigData[];
}

export function NewTicketDialog({
  ticketCreationEnabled = true,
  categories = [],
}: NewTicketDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Progressive Disclosure State
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>("");
  const [isSpoiler, setIsSpoiler] = useState<boolean>(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!ticketCreationEnabled) {
    return (
      <Button
        variant="secondary"
        onClick={() =>
          toast.error(
            "L'ouverture de tickets a été temporairement désactivée par un administrateur."
          )
        }
      >
        Ouvrir un ticket
      </Button>
    );
  }

  // Selected Category and Subcategory objects
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const selectedSubcategory = selectedCategory?.subcategories.find(
    (s) => s.id === selectedSubcategoryId
  );

  function resetForm() {
    setSelectedCategoryId("");
    setSelectedSubcategoryId("");
    setIsSpoiler(false);
    setSubject("");
    setDescription("");
  }

  function handleSelectCategory(catId: string) {
    setSelectedCategoryId(catId);
    setSelectedSubcategoryId("");
    setIsSpoiler(false);
  }

  function handleSelectSubcategory(subId: string) {
    setSelectedSubcategoryId(subId);
  }

  function handleSubmit() {
    if (
      !selectedCategoryId ||
      !selectedSubcategoryId ||
      !subject.trim() ||
      subject.trim().length > TICKET_SUBJECT_MAX_LENGTH ||
      !description.trim()
    ) {
      return;
    }
    startTransition(async () => {
      try {
        const ticket = await createTicket({
          categoryId: selectedCategoryId,
          subcategoryId: selectedSubcategoryId,
          isSpoiler,
          subject,
          description,
        });

        toast.success(
          isSpoiler
            ? "Ticket confidentiel ouvert avec succès (Admin & Suivi RP)."
            : "Ticket ouvert avec succès."
        );
        resetForm();
        setOpen(false);
        router.push(`/player/tickets/${ticket.id}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) resetForm();
      }}
    >
      <DialogTrigger render={<Button />}>Ouvrir un ticket</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ouvrir un ticket</DialogTitle>
          <DialogDescription>
            Suivez les étapes ci-dessous pour transmettre votre demande à l&apos;équipe appropriée.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-2">
          {/* ÉTAPE 1 : CHOIX DE LA CATÉGORIE PRINCIPALE */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="bg-primary text-primary-foreground flex size-5 items-center justify-center rounded-full text-[11px] font-bold">
                1
              </span>
              <Label className="text-sm font-semibold">Choisissez la catégorie principale</Label>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {categories.map((cat) => {
                const isSelected = cat.id === selectedCategoryId;
                const isTech = cat.slug === "technique";
                const Icon = isTech ? Wrench : Scroll;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectCategory(cat.id)}
                    className={cn(
                      "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all",
                      isSelected
                        ? "border-primary bg-primary/5 ring-primary shadow-xs ring-1"
                        : "border-border/80 bg-card/60 hover:border-border hover:bg-muted/30"
                    )}
                  >
                    <div className="flex w-full items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "flex size-8 items-center justify-center rounded-lg",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          <Icon className="size-4" />
                        </div>
                        <span className="font-heading text-foreground font-semibold">
                          {cat.name}
                        </span>
                      </div>
                      {isSelected && <CheckCircle className="text-primary size-5" weight="fill" />}
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {cat.description ||
                        (isTech
                          ? "Bugs en jeu ou sur le site web, signalements techniques, suggestions d'amélioration."
                          : "Demandes de suivi RP, intrigues de personnage, questions liées à la whitelist.")}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ÉTAPE 2 : SOUS-CATÉGORIES & SPOILER (Se dévoile si catégorie choisie) */}
          {selectedCategory && (
            <div className="animate-in fade-in slide-in-from-top-2 flex flex-col gap-4 border-t pt-5 duration-200">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground flex size-5 items-center justify-center rounded-full text-[11px] font-bold">
                    2
                  </span>
                  <Label className="text-sm font-semibold">
                    Précisez la nature de votre demande
                  </Label>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {selectedCategory.subcategories.map((sub) => {
                    const isSubSelected = sub.id === selectedSubcategoryId;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => handleSelectSubcategory(sub.id)}
                        className={cn(
                          "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all",
                          isSubSelected
                            ? "border-primary bg-primary/5 ring-primary shadow-2xs ring-1"
                            : "border-border/70 bg-card hover:bg-muted/40"
                        )}
                      >
                        <div className="flex w-full items-center justify-between">
                          <span className="text-foreground text-sm font-semibold">{sub.name}</span>
                          {isSubSelected && (
                            <CheckCircle className="text-primary size-4" weight="fill" />
                          )}
                        </div>
                        {sub.description && (
                          <p className="text-muted-foreground text-xs leading-relaxed">
                            {sub.description}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* OPTION SPOILER (Seulement si autorisé par la catégorie, ex: Roleplay) */}
              {selectedCategory.allowSpoiler && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-500">
                        <EyeSlash className="size-4" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-foreground text-sm font-semibold">
                          Contenu spoiler / Demande confidentielle
                        </span>
                        <p className="text-muted-foreground text-xs leading-relaxed">
                          Activez cette option si votre demande concerne des intrigues RP sensibles,
                          des validations d&apos;assassinat, captures, mort de personnage ou du lore
                          confidentiel.
                          <span className="mt-1 block font-medium text-amber-500">
                            🔒 Ce ticket sera strictement restreint aux Administrateurs et à
                            l&apos;équipe Suivi RP.
                          </span>
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={isSpoiler}
                      onCheckedChange={setIsSpoiler}
                      className="data-[state=checked]:bg-amber-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ÉTAPE 3 : DÉTAILS DU TICKET (Se dévoile si sous-catégorie choisie) */}
          {selectedSubcategory && (
            <div className="animate-in fade-in slide-in-from-top-2 flex flex-col gap-4 border-t pt-5 duration-200">
              <div className="flex items-center gap-2">
                <span className="bg-primary text-primary-foreground flex size-5 items-center justify-center rounded-full text-[11px] font-bold">
                  3
                </span>
                <Label className="text-sm font-semibold">Détails de votre demande</Label>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ticket-subject" className="text-xs font-medium">
                    Sujet du ticket
                  </Label>
                  <span className="text-muted-foreground text-[10px]">
                    {subject.length}/{TICKET_SUBJECT_MAX_LENGTH}
                  </span>
                </div>
                <Input
                  id="ticket-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={TICKET_SUBJECT_MAX_LENGTH}
                  placeholder={
                    selectedSubcategory.placeholderSubject || "Résumez brièvement votre demande..."
                  }
                  disabled={isPending}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ticket-description" className="text-xs font-medium">
                  Message détaillé
                </Label>
                <Textarea
                  id="ticket-description"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    selectedSubcategory.placeholderDescription ||
                    "Détaillez votre demande pour permettre à l'équipe de vous répondre au mieux..."
                  }
                  disabled={isPending}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetForm();
              setOpen(false);
            }}
            disabled={isPending}
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={
              !selectedCategoryId ||
              !selectedSubcategoryId ||
              !subject.trim() ||
              subject.trim().length > TICKET_SUBJECT_MAX_LENGTH ||
              !description.trim() ||
              isPending
            }
            className="gap-2"
          >
            {isPending ? "Création en cours..." : "Créer le ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
