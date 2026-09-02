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
  const [state, formAction, isPending] = useActionState(async (prevState: any, formData: FormData) => {
    try {
      const result = await saveGlobalSettingsAction(formData);
      if (result.success) {
        toast.success("Paramètres enregistrés avec succès.");
      }
      return result;
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement.");
      return { success: false };
    }
  }, null);

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

      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={isPending} className="gap-2">
          <Check className="size-4" />
          Enregistrer
        </Button>
      </div>
    </form>
  );
}

function SettingToggle({ name, label, description, defaultChecked }: { name: string, label: string, description: string, defaultChecked: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
      <div className="space-y-0.5">
        <label htmlFor={name} className="text-sm font-medium">
          {label}
        </label>
        <p className="text-[13px] text-muted-foreground">{description}</p>
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
          <div className="peer h-6 w-11 rounded-full bg-muted border border-input after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-primary"></div>
        </label>
      </div>
    </div>
  );
}
