import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/dal";
import { staffNavItems } from "@/lib/navigation";

export default async function DashboardIndexPage() {
  const user = await getCurrentUser();
  const accessible = user && staffNavItems.find((item) => item.roles.includes(user.role));
  redirect(accessible?.href ?? "/player");
}
