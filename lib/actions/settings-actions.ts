"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/generated/prisma/enums";
import { updateGlobalSettings } from "@/lib/services/settings-service";

export async function saveGlobalSettingsAction(formData: FormData) {
  const user = await requireRole([Role.ADMIN]);

  const registrationEnabled = formData.get("registrationEnabled") === "true";
  const interviewBookingEnabled = formData.get("interviewBookingEnabled") === "true";
  const ticketCreationEnabled = formData.get("ticketCreationEnabled") === "true";
  const rpTrackingAccessEnabled = formData.get("rpTrackingAccessEnabled") === "true";
  const chapterWritingEnabled = formData.get("chapterWritingEnabled") === "true";
  const bdaReportSubmissionEnabled = formData.get("bdaReportSubmissionEnabled") === "true";

  await updateGlobalSettings(
    {
      registrationEnabled,
      interviewBookingEnabled,
      ticketCreationEnabled,
      rpTrackingAccessEnabled,
      chapterWritingEnabled,
      bdaReportSubmissionEnabled,
    },
    user.id
  );

  revalidatePath("/", "layout");

  return { success: true };
}
