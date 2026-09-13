"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CaretLeft } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { canGoBack } from "@/components/navigation-tracker";

export function AtlasBackButton({ href = "/staff/atlas" }: { href?: string }) {
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
    <Button
      render={
        <Link
          href={href}
          aria-label="Retour"
          onClick={handleClick}
        />
      }
      variant="outline"
      size="icon"
    >
      <CaretLeft />
    </Button>
  );
}
