import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getServerPagePrefs, checkRedirectWithSavedPrefs } from "@/lib/table-preferences";
import { Role } from "@/lib/generated/prisma/enums";
import { staffRoleLabels } from "@/lib/navigation";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SkinHead } from "@/components/ui/skin-head";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/components/dashboard/table-pagination";
import { StaffTeamFilters } from "@/components/staff/staff-team-filters";
import { StaffRoleBadge } from "@/components/staff/staff-role-badge";
import { RoleAssignmentCell } from "@/components/staff/role-assignment-cell";
import { RemoveStaffMemberButton } from "@/components/staff/remove-staff-member-button";
import { AddStaffMemberDialog } from "@/components/staff/add-staff-member-dialog";
import { Shield, Users } from "@phosphor-icons/react/dist/ssr";

const PAGE_SIZE = 15;

type PageProps = {
  searchParams: Promise<{
    q?: string;
    role?: string;
    page?: string;
  }>;
};

export default async function StaffTeamPage(props: PageProps) {
  // Page accessible UNIQUEMENT aux administrateurs
  const currentAdmin = await requireRole([Role.ADMIN]);

  const searchParams = await props.searchParams;
  const cookieStore = await cookies();
  const savedPrefs = getServerPagePrefs(cookieStore, "/staff/staff-team");
  const redirectUrl = checkRedirectWithSavedPrefs("/staff/staff-team", searchParams, savedPrefs);
  if (redirectUrl) {
    redirect(redirectUrl);
  }

  const query = searchParams.q?.trim() ?? "";
  const roleParam = searchParams.role ?? "ALL";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  // Validation du filtre de rôle (rôles staff uniquement)
  const parsedRole =
    roleParam !== "ALL" &&
    Object.values(Role).includes(roleParam as Role) &&
    roleParam !== Role.PLAYER
      ? (roleParam as Role)
      : null;

  // Filtrage strict : UNIQUEMENT les membres du staff (role !== PLAYER)
  const whereClause = {
    role: parsedRole ? parsedRole : { not: Role.PLAYER },
    ...(query
      ? {
          OR: [
            { minecraftUsername: { contains: query, mode: "insensitive" as const } },
            { discordDisplayName: { contains: query, mode: "insensitive" as const } },
            { discordUsername: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [
    totalStaffCount,
    adminCount,
    commCount,
    conflictCount,
    rpTrackingCount,
    devCount,
    filteredStaffCount,
    staffMembers,
    availablePlayers,
  ] = await Promise.all([
    prisma.user.count({ where: { role: { not: Role.PLAYER } } }),
    prisma.user.count({ where: { role: Role.ADMIN } }),
    prisma.user.count({ where: { role: Role.COMMUNICATION } }),
    prisma.user.count({ where: { role: Role.CONFLICT_MANAGEMENT } }),
    prisma.user.count({ where: { role: Role.RP_TRACKING } }),
    prisma.user.count({ where: { role: Role.DEVELOPER } }),
    prisma.user.count({ where: whereClause }),
    prisma.user.findMany({
      where: whereClause,
      orderBy: [{ role: "asc" }, { discordDisplayName: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    // Joueurs non-staff éligibles à être ajoutés dans l'équipe staff
    prisma.user.findMany({
      where: { role: Role.PLAYER },
      select: {
        id: true,
        minecraftUsername: true,
        discordDisplayName: true,
        discordUsername: true,
        discordAvatarUrl: true,
        role: true,
        registrationStatus: true,
        characterSheets: { select: { name: true, status: true } },
      },
      orderBy: [{ discordDisplayName: "asc" }, { discordUsername: "asc" }],
    }),
  ]);

  const totalPages = Math.ceil(filteredStaffCount / PAGE_SIZE) || 1;
  const hasActiveFilters = Boolean(query || roleParam !== "ALL");

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête de la page */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Équipe du staff</h1>
        <div className="flex flex-wrap items-center gap-3">
          <StaffTeamFilters query={query} roleFilter={roleParam} />
          <AddStaffMemberDialog availablePlayers={availablePlayers} />
        </div>
      </div>

      {/* Cartes statistiques synthétiques des pôles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card className="flex flex-col gap-1 p-3.5">
          <span className="text-muted-foreground text-xs font-medium">Équipe staff</span>
          <span className="font-heading text-2xl font-semibold">{totalStaffCount}</span>
        </Card>

        <Card className="flex flex-col gap-1 p-3.5">
          <span className="text-muted-foreground text-xs font-medium">Admins</span>
          <span className="font-heading text-2xl font-semibold">{adminCount}</span>
        </Card>

        <Card className="flex flex-col gap-1 p-3.5">
          <span className="text-muted-foreground text-xs font-medium">Communication</span>
          <span className="font-heading text-2xl font-semibold">{commCount}</span>
        </Card>

        <Card className="flex flex-col gap-1 p-3.5">
          <span className="text-muted-foreground text-xs font-medium">Gestion conflits</span>
          <span className="font-heading text-2xl font-semibold">{conflictCount}</span>
        </Card>

        <Card className="flex flex-col gap-1 p-3.5">
          <span className="text-muted-foreground text-xs font-medium">Suivi RP</span>
          <span className="font-heading text-2xl font-semibold">{rpTrackingCount}</span>
        </Card>

        <Card className="flex flex-col gap-1 p-3.5">
          <span className="text-muted-foreground text-xs font-medium">Développeurs</span>
          <span className="font-heading text-2xl font-semibold">{devCount}</span>
        </Card>
      </div>

      {/* Tableau des membres du staff */}
      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Membre du staff</TableHead>
              <TableHead>Pôle actuel</TableHead>
              <TableHead>Changer de rôle</TableHead>
              <TableHead className="pr-6 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staffMembers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground py-10 text-center text-sm">
                  {hasActiveFilters
                    ? "Aucun membre du staff ne correspond à ces filtres."
                    : "Aucun membre dans l'équipe staff."}
                </TableCell>
              </TableRow>
            ) : (
              staffMembers.map((member) => {
                const displayName =
                  member.minecraftUsername ?? member.discordDisplayName ?? member.discordUsername;
                const isCurrentAdminUser = currentAdmin.id === member.id;

                return (
                  <TableRow key={member.id} className="group">
                    <TableCell className="pl-6">
                      <div className="flex max-w-[240px] items-center gap-3">
                        {member.minecraftUsername ? (
                          <SkinHead
                            size="sm"
                            username={member.minecraftUsername}
                            className="shrink-0"
                          />
                        ) : (
                          <Avatar size="sm" className="shrink-0">
                            <AvatarImage
                              src={member.discordAvatarUrl ?? undefined}
                              alt={member.discordUsername}
                            />
                            <AvatarFallback>
                              {member.discordUsername.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className="flex min-w-0 flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-medium" title={displayName}>
                              {displayName}
                            </span>
                            {isCurrentAdminUser && (
                              <Badge
                                variant="outline"
                                className="border-primary/30 text-primary h-4 shrink-0 px-1 py-0 text-[10px]"
                              >
                                Vous
                              </Badge>
                            )}
                          </div>
                          <span className="text-muted-foreground truncate text-xs">
                            {member.discordUsername}
                            {member.minecraftUsername &&
                              member.minecraftUsername !== member.discordUsername &&
                              ` • MC: ${member.minecraftUsername}`}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <StaffRoleBadge role={member.role} />
                    </TableCell>

                    <TableCell>
                      <RoleAssignmentCell
                        userId={member.id}
                        userName={displayName}
                        currentRole={member.role}
                        isCurrentAdmin={isCurrentAdminUser}
                      />
                    </TableCell>

                    <TableCell className="pr-6 text-right">
                      <div className="flex justify-end">
                        <RemoveStaffMemberButton
                          userId={member.id}
                          userName={displayName}
                          isCurrentAdmin={isCurrentAdminUser}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <TablePagination
            currentPage={page}
            totalPages={totalPages}
            totalCount={filteredStaffCount}
            pageSize={PAGE_SIZE}
            paramName="page"
          />
        )}
      </Card>
    </div>
  );
}
