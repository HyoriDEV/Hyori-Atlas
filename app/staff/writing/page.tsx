import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/dal";
import { rpTrackingStaffRoles } from "@/lib/navigation";
import {
  getStaffWritingStats,
  getStaffWritingStories,
  type StaffWritingSort,
} from "@/lib/services/staff-writing-service";
import { getRpTrackingStates } from "@/lib/services/rp-tracking-service";
import {
  getServerPagePrefs,
  checkRedirectWithSavedPrefs,
  resolvePageSize,
  DEFAULT_PAGE_SIZE_OPTIONS,
} from "@/lib/table-preferences";
import { Card } from "@/components/ui/card";
import { StatTile } from "@/components/dashboard/stat-tile";
import { TablePagination } from "@/components/dashboard/table-pagination";
import { RpHubHeader } from "@/components/staff/rp-hub/rp-hub-header";
import { WritingFilters } from "@/components/staff/writing/writing-filters";
import { WritingTable } from "@/components/staff/writing/writing-table";

export const metadata: Metadata = {
  title: "Trames écrites des joueurs",
};

const DEFAULT_PAGE_SIZE = 10;
const VALID_SORTS: StaffWritingSort[] = ["updatedAt", "words", "chapters", "player"];

export default async function WritingStaffListPage(props: {
  searchParams: Promise<{
    q?: string;
    sort?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  await requireRole(rpTrackingStaffRoles);
  const searchParams = await props.searchParams;
  const cookieStore = await cookies();
  const savedPrefs = getServerPagePrefs(cookieStore, "/staff/writing");
  const redirectUrl = checkRedirectWithSavedPrefs("/staff/writing", searchParams, savedPrefs);
  if (redirectUrl) {
    redirect(redirectUrl);
  }

  const query = searchParams.q?.trim() ?? "";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const pageSize = resolvePageSize(searchParams.pageSize, savedPrefs.pageSize, DEFAULT_PAGE_SIZE);

  const sort: StaffWritingSort = VALID_SORTS.includes(searchParams.sort as StaffWritingSort)
    ? (searchParams.sort as StaffWritingSort)
    : VALID_SORTS.includes(savedPrefs.sort as StaffWritingSort)
      ? (savedPrefs.sort as StaffWritingSort)
      : "updatedAt";

  const [stats, storiesResult, { counts }] = await Promise.all([
    getStaffWritingStats(),
    getStaffWritingStories({ query, page, pageSize, sort }),
    getRpTrackingStates(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <RpHubHeader
        activeTab="writing"
        pendingMessagesCount={counts.pending}
        totalStoriesCount={stats.totalAuthors}
      />

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatTile
          label="Chapitres rédigés"
          value={stats.totalChapters}
          hint={`sur ${stats.totalAuthors} auteur${stats.totalAuthors > 1 ? "s" : ""}`}
        />
        <StatTile
          label="Volume total"
          value={stats.totalWords.toLocaleString("fr-FR")}
          hint={stats.totalWords > 1 ? "mots rédigés" : "mot rédigé"}
        />
        <StatTile
          label="Auteurs actifs"
          value={stats.activeAuthors}
          hint="écriture sur 30 jours"
        />
        <StatTile
          label="Moyenne / chapitre"
          value={stats.avgWordsPerChapter.toLocaleString("fr-FR")}
          hint="mots par chapitre"
        />
      </div>

      <WritingFilters query={query} sort={sort} />

      <Card className="gap-0 overflow-hidden py-0">
        <WritingTable stories={storiesResult.stories} query={query} />
        <TablePagination
          currentPage={page}
          totalPages={storiesResult.totalPages}
          totalCount={storiesResult.totalCount}
          pageSize={pageSize}
          paramName="page"
          sizeParamName="pageSize"
          pageSizeOptions={DEFAULT_PAGE_SIZE_OPTIONS}
        />
      </Card>
    </div>
  );
}
