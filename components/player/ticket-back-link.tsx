"use client";

import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react";

export function TicketBackLink() {
  return (
    <Link
      href="/player/tickets"
      className="bg-card border-border flex size-8 items-center justify-center rounded-md border"
    >
      <ArrowLeft className="size-4" />
    </Link>
  );
}
