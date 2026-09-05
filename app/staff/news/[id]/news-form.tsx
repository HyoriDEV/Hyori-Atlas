"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NewsType, Role } from "@/lib/generated/prisma/enums";
import { createNews, updateNews, deleteNews } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface NewsFormProps {
  initialData: {
    id: string;
    title: string;
    type: NewsType;
    excerpt: string;
    content: string;
    authorLabel: string;
  } | null;
  userRole: Role;
}

export function NewsForm({ initialData, userRole }: NewsFormProps) {
  const router = useRouter();
  const isDeveloper = userRole === Role.DEVELOPER;

  const [isLoading, setIsLoading] = useState(false);
  const [content, setContent] = useState(initialData?.content || "");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    formData.set("content", content); // Append rich text

    try {
      if (initialData) {
        await updateNews(initialData.id, formData);
        toast.success("Actualité modifiée avec succès.");
      } else {
        await createNews(formData);
        toast.success("Actualité créée avec succès.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    if (!initialData) return;
    setIsLoading(true);
    try {
      await deleteNews(initialData.id);
      toast.success("Actualité supprimée.");
      router.push("/staff/news");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="title">Titre</Label>
          <Input
            id="title"
            name="title"
            defaultValue={initialData?.title}
            required
            placeholder="Mise à jour 1.2"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="type">Type d&apos;actualité</Label>
          <Select
            name="type"
            defaultValue={
              initialData?.type || (isDeveloper ? NewsType.CHANGELOG : NewsType.ANNOUNCEMENT)
            }
            disabled={isDeveloper} // Developers can only post changelogs
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez un type" />
            </SelectTrigger>
            <SelectContent>
              {!isDeveloper && <SelectItem value={NewsType.ANNOUNCEMENT}>Annonce</SelectItem>}
              <SelectItem value={NewsType.CHANGELOG}>Changelog</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="excerpt">Extrait (visible sur la page d&apos;accueil)</Label>
          <Textarea
            id="excerpt"
            name="excerpt"
            defaultValue={initialData?.excerpt}
            required
            placeholder="Bref résumé de l'actualité..."
          />
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="authorLabel">Signé par</Label>
          <Input
            id="authorLabel"
            name="authorLabel"
            defaultValue={
              initialData?.authorLabel ||
              (isDeveloper ? "L'Équipe de Développement" : "L'Administration")
            }
            required
          />
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label>Contenu détaillé</Label>
          <RichTextEditor value={content} onChange={setContent} />
        </div>
      </div>

      <div className="flex items-center justify-between">
        {initialData ? (
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isLoading || (isDeveloper && initialData.type !== NewsType.CHANGELOG)}
                >
                  Supprimer
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. L&apos;actualité sera supprimée définitivement.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <div /> // Spacer
        )}

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/staff/news")}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button type="submit" disabled={isLoading}>
            Enregistrer
          </Button>
        </div>
      </div>
    </form>
  );
}
