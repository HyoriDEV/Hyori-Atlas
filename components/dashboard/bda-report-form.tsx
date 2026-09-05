"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PlayerSelect, type PlayerOption } from "@/components/player-select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SkinHead } from "@/components/ui/skin-head";
import { Plus, Trash, CircleNotch, CloudArrowUp } from "@phosphor-icons/react";
import { createBdaReport } from "@/lib/actions/bda-actions";
import { uploadBdaImage } from "@/lib/actions/upload-actions";

export interface BdaReportTicketOption {
  id: string;
  subject: string;
  player: {
    discordDisplayName: string;
    minecraftUsername: string | null;
  };
}

export interface BdaReportCurrentUser {
  id: string;
  discordDisplayName: string;
  discordUsername: string;
  discordAvatarUrl?: string | null;
  minecraftUsername?: string | null;
}

export interface BdaReportFormProps {
  currentUser?: BdaReportCurrentUser | null;
  staffMembers?: PlayerOption[];
  players: PlayerOption[];
  tickets?: BdaReportTicketOption[];
}

export function BdaReportForm({
  currentUser,
  staffMembers = [],
  players,
  tickets = [],
}: BdaReportFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ticketId, setTicketId] = useState<string>("");
  const [staffMemberIds, setStaffMemberIds] = useState<string[]>([]);
  const [parties, setParties] = useState([{ name: "Partie 1", playerIds: [] as string[] }]);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const addParty = () => {
    setParties([...parties, { name: `Partie ${parties.length + 1}`, playerIds: [] }]);
  };

  const removeParty = (index: number) => {
    if (parties.length <= 1) return;
    setParties(parties.filter((_, i) => i !== index));
  };

  const handlePartyChange = (
    index: number,
    field: "name" | "playerIds",
    value: string | string[]
  ) => {
    const newParties = [...parties];
    newParties[index] = { ...newParties[index], [field]: value };
    setParties(newParties);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      const newAttachments = [...attachments];
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("file", files[i]);
        const result = await uploadBdaImage(formData);
        newAttachments.push(result.url);
      }
      setAttachments(newAttachments);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'upload des fichiers.";
      setError(msg);
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    for (const party of parties) {
      if (!party.name.trim()) {
        setError("Toutes les parties doivent avoir un nom.");
        setIsSubmitting(false);
        return;
      }
      if (!party.playerIds || party.playerIds.length === 0) {
        setError(`La partie "${party.name.trim()}" doit contenir au moins un joueur.`);
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const report = await createBdaReport({
        title,
        description,
        ticketId: ticketId || undefined,
        staffMemberIds,
        parties,
        attachments,
      });
      router.push(`/staff/bda-reports/${report.id}`);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Une erreur est survenue lors de la création.";
      setError(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error && (
        <div className="bg-destructive/15 text-destructive rounded-md p-4 text-sm font-medium">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Informations Générales</CardTitle>
          <CardDescription>
            Décris de manière objective les faits liés à ce conflit.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Intitulé du rapport *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Utilisation de métagaming lors d'un braquage..."
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Description des faits *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Résumé des faits..."
              className="min-h-[220px] resize-y text-sm leading-relaxed md:text-sm"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="ticket">Ticket lié (Optionnel)</Label>
            <select
              id="ticket"
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
              className="border-input ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">-- Aucun ticket lié --</option>
              {tickets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.subject} (par {t.player.minecraftUsername || t.player.discordDisplayName})
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comité GC</CardTitle>
          <CardDescription>Membres du staff en charge du dossier.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h3 className="font-heading text-sm font-semibold">Créateur</h3>
            <div className="border-border flex flex-col gap-2.5 border-l-2 pl-3">
              {currentUser ? (
                <div className="flex items-center gap-2.5">
                  {currentUser.minecraftUsername ? (
                    <SkinHead
                      username={currentUser.minecraftUsername}
                      className="size-8 rounded-lg"
                    />
                  ) : (
                    <Avatar className="size-8 rounded-lg">
                      <AvatarImage src={currentUser.discordAvatarUrl ?? undefined} />
                      <AvatarFallback className="text-xs font-semibold">
                        {(currentUser.discordDisplayName ??
                          currentUser.discordUsername)[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex flex-col leading-tight">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium">
                        {currentUser.minecraftUsername ?? currentUser.discordDisplayName}
                      </span>
                      <span className="text-muted-foreground text-xs">(Toi)</span>
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {currentUser.discordUsername}
                    </span>
                  </div>
                </div>
              ) : (
                <span className="text-muted-foreground text-sm">Utilisateur connecté</span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="font-heading text-sm font-semibold">Participants</h3>
            <div className="flex flex-col gap-2">
              <PlayerSelect
                multiple
                players={staffMembers}
                value={staffMemberIds}
                onChange={setStaffMemberIds}
                excludedIds={currentUser ? [currentUser.id] : []}
                placeholder="Sélectionner des membres du staff GC..."
                searchPlaceholder="Rechercher un membre du staff GC..."
                emptyText="Aucun membre du staff GC trouvé."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Parties impliquées</CardTitle>
            <CardDescription>Définis les différents groupes ou joueurs impliqués.</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addParty}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter une partie
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {parties.map((party, index) => (
            <div key={index} className="border-border flex flex-col gap-4 border-l-2 pl-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor={`party-name-${index}`}>Nom de la partie</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id={`party-name-${index}`}
                    value={party.name}
                    onChange={(e) => handlePartyChange(index, "name", e.target.value)}
                    placeholder="Ex: Plaignants, Accusés..."
                    required
                    className="flex-1"
                  />
                  {parties.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive shrink-0"
                      onClick={() => removeParty(index)}
                      title="Supprimer la partie"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Joueurs</Label>
                <PlayerSelect
                  multiple
                  players={players}
                  value={party.playerIds}
                  onChange={(ids) => handlePartyChange(index, "playerIds", ids)}
                  placeholder="Sélectionner des joueurs..."
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pièces jointes (Optionnel)</CardTitle>
          <CardDescription>Ajoute des images ou captures d&apos;écran.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-4">
            {attachments.map((url, i) => (
              <div key={i} className="relative h-24 w-24 overflow-hidden rounded-md border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Pièce jointe ${i + 1}`}
                  className="h-full w-full object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 rounded-full"
                  onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}
                >
                  <Trash className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Label
              htmlFor="attachment-upload"
              className="border-input hover:bg-accent flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed transition-colors"
            >
              {isUploading ? (
                <CircleNotch className="h-6 w-6 animate-spin" />
              ) : (
                <CloudArrowUp className="h-6 w-6" />
              )}
              <span className="mt-2 text-xs">Upload</span>
            </Label>
            <input
              id="attachment-upload"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/staff/bda-reports")}
          disabled={isSubmitting}
        >
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting || isUploading}>
          {isSubmitting ? <CircleNotch className="mr-2 h-4 w-4 animate-spin" /> : null}
          Créer le rapport
        </Button>
      </div>
    </form>
  );
}
