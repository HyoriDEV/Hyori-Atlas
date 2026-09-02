import {
  BdaReportStatus,
  CharacterSheetStatus,
  InterviewBookingStatus,
  RegistrationStatus,
  Role,
  TicketStatus,
} from "@/lib/generated/prisma/enums";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getStaffNavGroups, staffRoleLabels } from "@/lib/navigation";
import { AppShell, type AppShellNavGroup } from "@/components/app-shell/app-shell";

const staffRoles = Object.values(Role).filter((role) => role !== Role.PLAYER);

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(staffRoles);

  const roleGroups = getStaffNavGroups(user.role);

  const [
    pendingTicketsCount,
    unreadBdaReportsCount,
    pendingSheetsCount,
    waitlistCount,
    registeredInterviewBookingsCount,
  ] = await Promise.all([
    prisma.ticket.count({
      where: { status: TicketStatus.PENDING_STAFF },
    }),
    prisma.bdaReport.count({
      where: { status: BdaReportStatus.UNREAD },
    }),
    prisma.characterSheet.count({
      where: { reviewStatus: CharacterSheetStatus.PENDING_STAFF },
    }),
    prisma.user.count({
      where: { registrationStatus: RegistrationStatus.WAITLIST },
    }),
    prisma.interviewBooking.count({
      where: { status: InterviewBookingStatus.REGISTERED },
    }),
  ]);

  const navNotificationMap: Record<string, boolean> = {
    "/staff/tickets": pendingTicketsCount > 0,
    "/staff/bda-reports": unreadBdaReportsCount > 0,
    "/staff/atlas": pendingSheetsCount > 0,
    "/staff/waitlist": waitlistCount > 0,
    "/staff/interview-slots": registeredInterviewBookingsCount > 0,
  };

  const navGroups: AppShellNavGroup[] = roleGroups
    .map((group) => ({
      title: group.title,
      items: group.items
        .filter((item) => item.roles.includes(user.role))
        .map((item) => ({
          label: item.label,
          href: item.href,
          iconKey: item.iconKey,
          fullWidth: item.fullWidth,
          hasNotification: navNotificationMap[item.href] ?? false,
        })),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <AppShell
      sectionLabel="Espace Staff"
      navGroups={navGroups}
      user={{
        id: user.id,
        name: user.minecraftUsername ?? user.discordUsername ?? "Staff",
        secondaryLabel: staffRoleLabels[user.role],
        avatarUrl: user.discordAvatarUrl,
        isStaff: true,
      }}
    >
      {children}
    </AppShell>
  );
}
