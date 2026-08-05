"use client";

import { useState, useTransition } from "react";
import { PaperPlaneTilt } from "@phosphor-icons/react";

import { sendTicketMessage } from "@/lib/actions/ticket-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function TicketMessageForm({ ticketId }: { ticketId: string }) {
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!body.trim()) return;
    startTransition(async () => {
      await sendTicketMessage(ticketId, body);
      setBody("");
    });
  }

  return (
    <div className="flex items-end gap-2">
      <Textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Écrire un message"
        rows={2}
        className="flex-1"
      />
      <Button type="button" size="icon" onClick={handleSubmit} disabled={isPending || !body.trim()}>
        <PaperPlaneTilt />
      </Button>
    </div>
  );
}
