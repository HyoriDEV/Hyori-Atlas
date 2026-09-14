"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react";
import { canGoBack } from "@/components/navigation-tracker";

export function TicketBackLink({ href = "/player/tickets" }: { href?: string }) {
  const router = useRouter();

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }

    if (canGoBack()) {
      e.preventDefault();
      router.back();
    }
  }

  return (
    <Link
      href={href}
      aria-label="Retour"
      onClick={handleClick}
      className="bg-card border-border hover:bg-input/50 flex size-8 items-center justify-center rounded-md border transition-colors"
    >
      <ArrowLeft className="size-4" />
    </Link>
  );
}
