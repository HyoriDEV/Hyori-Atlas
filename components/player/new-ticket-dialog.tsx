"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Scroll, Wrench, CheckCircle } from "@phosphor-icons/react";
import { toast } from "sonner";

import { createTicket } from "@/lib/actions/ticket-actions";
import { TICKET_SUBJECT_MAX_LENGTH } from "@/lib/ticket-constants";
import { formatTicketCategoryName, isTechniqueCategory } from "@/lib/navigation";
import type { TicketCategoryConfigData } from "@/lib/actions/ticket-config-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
    setSubject("");
    setDescription("");
  }

  function handleSelectCategory(catId: string) {
    setSelectedCategoryId(catId);
    setSelectedSubcategoryId("");
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
          subject,
          description,
        });

        toast.success("Ticket ouvert avec succès.");
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl sm:p-6">
        <DialogHeader className="gap-1.5 pb-2">
          <DialogTitle className="text-xl">Ouvrir un ticket</DialogTitle>
          <DialogDescription className="text-sm">
            Suis les étapes ci-dessous pour transmettre ta demande à l&apos;équipe appropriée.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-2">
          {/* ÉTAPE 1 : CHOIX DE LA CATÉGORIE PRINCIPALE */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="bg-primary text-primary-foreground flex size-5 items-center justify-center rounded-full text-[11px] font-bold">
                1
              </span>
              <Label className="text-sm font-semibold">Choisis la catégorie principale</Label>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {categories.map((cat) => {
                const isSelected = cat.id === selectedCategoryId;
                const isTech = isTechniqueCategory(cat);
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
                          {formatTicketCategoryName(cat.name)}
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

          {/* ÉTAPE 2 : SOUS-CATÉGORIES (Se dévoile si catégorie choisie) */}
          {selectedCategory && (
            <div className="animate-in fade-in slide-in-from-top-2 flex flex-col gap-4 border-t pt-5 duration-200">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground flex size-5 items-center justify-center rounded-full text-[11px] font-bold">
                    2
                  </span>
                  <Label className="text-sm font-semibold">Précise la nature de ta demande</Label>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {selectedCategory.subcategories.map((sub) => {
                    const isSubSelected = sub.id === selectedSubcategoryId;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => handleSelectSubcategory(sub.id)}
                        className={cn(
                          "flex flex-col items-start gap-1.5 rounded-lg border p-3.5 text-left transition-all",
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
            </div>
          )}

          {/* ÉTAPE 3 : DÉTAILS DU TICKET (Se dévoile si sous-catégorie choisie) */}
          {selectedSubcategory && (
            <div className="animate-in fade-in slide-in-from-top-2 flex flex-col gap-4 border-t pt-5 duration-200">
              <div className="flex items-center gap-2">
                <span className="bg-primary text-primary-foreground flex size-5 items-center justify-center rounded-full text-[11px] font-bold">
                  3
                </span>
                <Label className="text-sm font-semibold">Détails de ta demande</Label>
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
                    selectedSubcategory.placeholderSubject || "Résume brièvement ta demande..."
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
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    selectedSubcategory.placeholderDescription ||
                    "Détaille ta demande pour permettre à l'équipe de te répondre au mieux..."
                  }
                  disabled={isPending}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
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
