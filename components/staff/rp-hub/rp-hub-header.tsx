import Link from "next/link";
import { ChatCircle, PenNib } from "@phosphor-icons/react/dist/ssr";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface RpHubHeaderProps {
  activeTab: "messaging" | "writing";
  pendingMessagesCount?: number;
  totalStoriesCount?: number;
}

export function RpHubHeader({
  activeTab,
  pendingMessagesCount = 0,
  totalStoriesCount,
}: RpHubHeaderProps) {
  const isMessaging = activeTab === "messaging";
  const isWriting = activeTab === "writing";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Suivi & Narration RP</h1>
          <p className="text-muted-foreground text-sm">
            Animation des salons de discussion RP et bibliothèque des trames rédigées par les joueurs.
          </p>
        </div>
      </div>

      <nav
        aria-label="Sous-onglets Suivi RP"
        className="border-border flex items-center gap-2 border-b pb-px"
      >
        <Link
          href="/staff/rp-tracking"
          className={cn(
            "inline-flex items-center gap-2 border-b-2 px-3.5 py-2 text-sm font-medium transition-colors",
            isMessaging
              ? "border-primary text-foreground font-semibold"
              : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
          )}
        >
          <ChatCircle className="size-4" />
          <span>Messagerie RP</span>
          {pendingMessagesCount > 0 && (
            <Badge variant="default" className="h-5 px-1.5 text-[11px]">
              {pendingMessagesCount}
            </Badge>
          )}
        </Link>

        <Link
          href="/staff/writing"
          className={cn(
            "inline-flex items-center gap-2 border-b-2 px-3.5 py-2 text-sm font-medium transition-colors",
            isWriting
              ? "border-primary text-foreground font-semibold"
              : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
          )}
        >
          <PenNib className="size-4" />
          <span>Trames écrites</span>
          {typeof totalStoriesCount === "number" && totalStoriesCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[11px]">
              {totalStoriesCount}
            </Badge>
          )}
        </Link>
      </nav>
    </div>
  );
}
