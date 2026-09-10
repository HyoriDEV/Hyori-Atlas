import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/generated/prisma/enums";
import { getInterviewGuides } from "@/lib/services/interview-guide-service";
import { InterviewGuideView } from "./interview-guide-view";

export const metadata = {
  title: "Guide d'entretien Whitelist",
};

export default async function StaffInterviewGuidePage() {
  await requireRole([Role.ADMIN]);

  const guideData = await getInterviewGuides();

  return <InterviewGuideView guideData={guideData} />;
}
