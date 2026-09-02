"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function BdaAttachmentsGallery({
  attachments,
}: {
  attachments: { id: string; url: string }[];
}) {
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

  if (attachments.length === 0) {
    return null;
  }

  return (
    <>
      <div className="flex flex-wrap gap-4">
        {attachments.map((attachment, index) => (
          <button
            key={attachment.id}
            type="button"
            onClick={() => setSelectedUrl(attachment.url)}
            className="group border-border bg-muted/40 hover:border-primary/50 focus-visible:ring-ring relative h-28 w-28 overflow-hidden rounded-lg border transition-all hover:shadow-md focus-visible:ring-2 focus-visible:outline-none"
            title="Agrandir la pièce jointe"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={attachment.url}
              alt={`Pièce jointe ${index + 1}`}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      <Dialog open={selectedUrl !== null} onOpenChange={(open) => !open && setSelectedUrl(null)}>
        <DialogContent className="max-w-4xl overflow-hidden p-2 sm:max-w-4xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Prévisualisation de la pièce jointe</DialogTitle>
          </DialogHeader>
          {selectedUrl && (
            <div className="flex max-h-[80vh] items-center justify-center overflow-hidden rounded-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedUrl}
                alt="Pièce jointe agrandie"
                className="max-h-[80vh] w-auto max-w-full rounded-md object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
