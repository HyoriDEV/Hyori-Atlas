import { redirect } from "next/navigation";
import { requireRole } from "@/lib/dal";
import { rpTrackingStaffRoles } from "@/lib/navigation";

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

  const params = new URLSearchParams();
  params.set("writing", "has_writing");
  if (searchParams.q) params.set("q", searchParams.q);
  if (searchParams.page) params.set("page", searchParams.page);
  if (searchParams.pageSize) params.set("pageSize", searchParams.pageSize);

  redirect(`/staff/rp-tracking?${params.toString()}`);
}
