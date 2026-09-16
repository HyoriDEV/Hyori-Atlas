import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Lore des joueurs",
};

export default function WritingStaffListPage() {
  redirect("/staff/atlas");
}
