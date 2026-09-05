"use client";

import { useActionState } from "react";
import { toast } from "sonner";
import { Check } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { saveGlobalSettingsAction } from "@/lib/actions/settings-actions";
import { GlobalSettings } from "@/lib/generated/prisma/client";

interface SettingsFormProps {
  defaultValues: GlobalSettings;
}

export function SettingsForm({ defaultValues }: SettingsFormProps) {
  const [, formAction, isPending] = useActionState(
    async (_prevState: unknown, formData: FormData) => {
      try {
        const result = await saveGlobalSettingsAction(formData);
        if (result.success) {
          toast.success("Paramètres enregistrés avec succès.");
        }
        return result;
      } catch {
        toast.error("Erreur lors de l'enregistrement.");
        return { success: false };
      }
    },
    null
  );

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-4">
        <SettingToggle
          name="registrationEnabled"
          label="Inscriptions (via Discord)"
          description="Autoriser la création de nouveaux comptes. Si désactivé, les nouveaux joueurs ne pourront pas se connecter."
          defaultChecked={defaultValues.registrationEnabled}
        />

        <SettingToggle
          name="interviewBookingEnabled"
          label="Réservation d'entretiens Whitelist"
          description="Permettre aux joueurs en liste d'attente de réserver un créneau pour leur entretien."
          defaultChecked={defaultValues.interviewBookingEnabled}
        />

        <SettingToggle
          name="ticketCreationEnabled"
          label="Ouverture de tickets"
          description="Autoriser la création de nouveaux tickets de support."
          defaultChecked={defaultValues.ticketCreationEnabled}
        />

        <SettingToggle
          name="rpTrackingAccessEnabled"
          label="Accès au Suivi RP"
          description="Autoriser l'accès aux conversations de Suivi RP."
          defaultChecked={defaultValues.rpTrackingAccessEnabled}
        />

        <SettingToggle
          name="chapterWritingEnabled"
          label="Écriture de narration (Chapitres)"
          description="Autoriser les joueurs à écrire ou modifier leurs chapitres (la lecture reste accessible)."
          defaultChecked={defaultValues.chapterWritingEnabled}
        />

        <SettingToggle
          name="bdaReportSubmissionEnabled"
          label="Soumission de rapports GC (BDA)"
          description="Autoriser la création de nouveaux rapports au Gestionnaire des Conflits."
          defaultChecked={defaultValues.bdaReportSubmissionEnabled}
        />
      </div>

      <div className="space-y-4 border-t pt-4">
        <div>
          <h2 className="text-base font-semibold">Serveur Minecraft & Liaison de compte</h2>
          <p className="text-muted-foreground mt-1 text-[13px]">
            Configurez les informations du serveur de liaison affichées aux nouveaux joueurs et
            utilisées par le plugin.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="minecraftServerAddress" className="text-sm font-medium">
              Adresse du serveur (IP ou Domaine)
            </label>
            <input
              type="text"
              id="minecraftServerAddress"
              name="minecraftServerAddress"
              defaultValue={defaultValues.minecraftServerAddress}
              placeholder="auth.hyori-rp.fr"
              className="border-input bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
            />
            <p className="text-muted-foreground text-[12px]">
              Adresse sur laquelle les joueurs doivent se connecter pour lier leur compte.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="minecraftServerVersion" className="text-sm font-medium">
              Version Minecraft recommandée
            </label>
            <input
              type="text"
              id="minecraftServerVersion"
              name="minecraftServerVersion"
              defaultValue={defaultValues.minecraftServerVersion}
              placeholder="1.21.11"
              className="border-input bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
            />
            <p className="text-muted-foreground text-[12px]">
              Version indicative affichée aux joueurs sur le site.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="minecraftAuthCommand" className="text-sm font-medium">
            Préfixe de la commande en jeu
          </label>
          <div className="flex items-center">
            <span className="border-input bg-muted text-muted-foreground flex h-9 items-center rounded-l-md border border-r-0 px-3 font-mono text-sm">
              /
            </span>
            <input
              type="text"
              id="minecraftAuthCommand"
              name="minecraftAuthCommand"
              defaultValue={defaultValues.minecraftAuthCommand}
              placeholder="auth"
              className="border-input bg-background focus:ring-ring h-9 w-full rounded-r-md border px-3 py-1.5 font-mono text-sm focus:ring-2 focus:outline-none"
            />
          </div>
          <p className="text-muted-foreground text-[12px]">
            Par exemple : &quot;auth&quot; (donnera <code>/auth &lt;code&gt;</code>) ou
            &quot;link&quot; (donnera <code>/link &lt;code&gt;</code>).
          </p>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={isPending} className="gap-2">
          <Check className="size-4" />
          Enregistrer
        </Button>
      </div>
    </form>
  );
}

function SettingToggle({
  name,
  label,
  description,
  defaultChecked,
}: {
  name: string;
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <div className="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-4 transition-colors">
      <div className="space-y-0.5">
        <label htmlFor={name} className="text-sm font-medium">
          {label}
        </label>
        <p className="text-muted-foreground text-[13px]">{description}</p>
      </div>
      <div>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            id={name}
            name={name}
            value="true"
            defaultChecked={defaultChecked}
            className="peer sr-only"
          />
          <div className="peer bg-muted border-input peer-checked:bg-primary peer-focus:ring-ring dark:peer-focus:ring-primary h-6 w-11 rounded-full border peer-focus:ring-2 peer-focus:outline-none after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700"></div>
        </label>
      </div>
    </div>
  );
}
