"use client";

import { useEffect, useRef, useState } from "react";
import { SkinViewer, WalkingAnimation } from "skinview3d";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WarningCircle } from "@phosphor-icons/react";

interface CharacterSkinPreviewProps {
  username?: string | null;
}

export function CharacterSkinPreview({ username }: CharacterSkinPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewerRef = useRef<SkinViewer | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const cleanUsername = username?.trim() || "MHF_Steve";
  const skinUrl = `https://mc-heads.net/skin/${encodeURIComponent(cleanUsername)}`;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let isDisposed = false;
    let viewer: SkinViewer | null = null;
    let resizeObserver: ResizeObserver | null = null;

    try {
      const rect = container.getBoundingClientRect();
      const initialWidth = rect.width > 0 ? rect.width : 280;
      const initialHeight = rect.height > 0 ? rect.height : 360;

      viewer = new SkinViewer({
        canvas,
        width: initialWidth,
        height: initialHeight,
        zoom: 0.95,
      });

      viewerRef.current = viewer;

      // Walking animation at calm, natural pace
      const walking = new WalkingAnimation();
      walking.speed = 0.6;
      walking.headBobbing = true;
      viewer.animation = walking;

      // No auto-rotation
      viewer.autoRotate = false;

      // Slight angle (isometric 3/4) turned towards the left
      viewer.playerWrapper.rotation.y = -0.5;

      // Observe container resize to keep canvas proportional on any display
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0 && viewer && !isDisposed) {
            viewer.setSize(width, height);
          }
        }
      });
      resizeObserver.observe(container);

      viewer
        .loadSkin(skinUrl)
        .then(() => {
          if (!isDisposed) {
            setIsLoading(false);
          }
        })
        .catch(() => {
          if (!isDisposed) {
            setHasError(true);
            setIsLoading(false);
          }
        });
    } catch {
      queueMicrotask(() => {
        if (!isDisposed) {
          setHasError(true);
          setIsLoading(false);
        }
      });
    }

    return () => {
      isDisposed = true;
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (viewer) {
        viewer.dispose();
        viewerRef.current = null;
      }
    };
  }, [skinUrl]);

  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Aperçu du skin</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div
          ref={containerRef}
          className="border-border/50 bg-muted/20 relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-lg border"
        >
          {hasError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`https://mc-heads.net/body/${encodeURIComponent(cleanUsername)}/left`}
              alt={`Skin de ${cleanUsername}`}
              className="h-full object-contain [image-rendering:pixelated]"
            />
          ) : (
            <canvas ref={canvasRef} className="h-full w-full cursor-grab active:cursor-grabbing" />
          )}

          {isLoading && (
            <div className="text-muted-foreground absolute inset-0 flex items-center justify-center text-xs">
              Chargement du modèle 3D...
            </div>
          )}
        </div>

        <div className="border-border bg-muted/40 text-muted-foreground flex items-start gap-2.5 rounded-md border p-3">
          <WarningCircle className="text-muted-foreground mt-0.5 size-4 shrink-0" />
          <p className="text-xs leading-relaxed">
            Ton skin doit respecter l&apos;univers et le lore du serveur. Les anachronismes
            (vêtements modernes, accessoires contemporains) ainsi que les apparences fantaisistes ou
            surnaturelles sont refusés.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
