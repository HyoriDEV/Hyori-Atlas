"use client";

import { useState, useTransition } from "react";
import { PencilSimple, TrashSimple } from "@phosphor-icons/react";

import { addStaffNote, deleteStaffNote, updateStaffNote } from "@/lib/actions/atlas-actions";
import { formatDate } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface AtlasStaffNoteData {
  id: string;
  authorId: string | null;
  body: string;
  createdAt: Date;
  author: { discordDisplayName: string } | null;
}

export function AtlasStaffNotes({
  playerId,
  notes,
  currentUserId,
}: {
  playerId: string;
  notes: AtlasStaffNoteData[];
  currentUserId: string;
}) {
  const [body, setBody] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!body.trim()) return;
    startTransition(async () => {
      await addStaffNote(playerId, body);
      setBody("");
    });
  }

  function handleStartEdit(note: AtlasStaffNoteData) {
    setEditingNoteId(note.id);
    setEditingBody(note.body);
  }

  function handleCancelEdit() {
    setEditingNoteId(null);
    setEditingBody("");
  }

  function handleSaveEdit(noteId: string) {
    if (!editingBody.trim()) return;
    startTransition(async () => {
      await updateStaffNote(noteId, editingBody);
      setEditingNoteId(null);
      setEditingBody("");
    });
  }

  function handleDeleteConfirm() {
    if (!deletingNoteId) return;
    const noteId = deletingNoteId;
    startTransition(async () => {
      await deleteStaffNote(noteId);
      setDeletingNoteId(null);
    });
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="flex flex-col gap-4 lg:col-span-2">
          <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Notes du staff
          </span>

          <div className="flex flex-col gap-3">
            {notes.length === 0 ? (
              <p className="text-muted-foreground text-sm">Aucune note pour l&apos;instant.</p>
            ) : (
              notes.map((note) => {
                const isAuthor = note.authorId === currentUserId;
                const isEditing = editingNoteId === note.id;

                return (
                  <div
                    key={note.id}
                    className="border-border flex flex-col gap-2 border-b pb-3 last:border-b-0 last:pb-0"
                  >
                    <div className="text-muted-foreground flex items-center gap-1 text-xs">
                      <span>{note.author?.discordDisplayName ?? "Ex-staff"}</span>
                      {"•"}
                      <span>
                        {formatDate(note.createdAt, { style: "prefix-long", withTime: true })}
                      </span>
                      {isAuthor && !isEditing && (
                        <div className="ml-1 flex items-center gap-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            title="Modifier la note"
                            aria-label="Modifier la note"
                            onClick={() => handleStartEdit(note)}
                          >
                            <PencilSimple className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            className="text-destructive hover:text-destructive"
                            title="Supprimer la note"
                            aria-label="Supprimer la note"
                            onClick={() => setDeletingNoteId(note.id)}
                          >
                            <TrashSimple className="size-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="flex flex-col gap-2 pt-1">
                        <Textarea
                          value={editingBody}
                          onChange={(event) => setEditingBody(event.target.value)}
                          rows={3}
                          className="resize-none"
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isPending}
                            onClick={handleCancelEdit}
                          >
                            Annuler
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={isPending || !editingBody.trim()}
                            onClick={() => handleSaveEdit(note.id)}
                          >
                            Enregistrer
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{note.body}</p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <Card className="flex flex-col gap-4 lg:col-span-1">
          <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Ajouter une note
          </span>

          <div className="flex flex-1 flex-col justify-between gap-3">
            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={3}
              placeholder="Ajouter une note..."
              className="resize-none"
            />
            <Button
              type="button"
              className="self-end"
              disabled={isPending || !body.trim()}
              onClick={handleSubmit}
            >
              Publier la note
            </Button>
          </div>
        </Card>
      </div>

      <AlertDialog
        open={deletingNoteId !== null}
        onOpenChange={(open) => !open && setDeletingNoteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la note</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette note ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={handleDeleteConfirm}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
