"use client";

import * as React from "react";
import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";

import { cn } from "@/lib/utils";

function getMinecraftSkinHeadUrl(username: string): string {
  if (!username) return "";
  return `https://mc-heads.net/avatar/${encodeURIComponent(username)}`;
}

type SkinHeadSize = "default" | "sm" | "lg" | "xl" | "2xl" | "3xl" | "4xl";

interface SkinHeadProps extends AvatarPrimitive.Root.Props {
  size?: SkinHeadSize;
  username?: string;
  fallback?: React.ReactNode;
}

function SkinHead({
  className,
  size = "default",
  username,
  fallback,
  children,
  ...props
}: SkinHeadProps) {
  return (
    <AvatarPrimitive.Root
      data-slot="skin-head"
      data-size={size}
      className={cn(
        "group/skin-head after:border-border relative flex size-8 shrink-0 rounded-lg select-none after:absolute after:inset-0 after:rounded-lg after:border after:mix-blend-darken data-[size=2xl]:size-16 data-[size=3xl]:size-20 data-[size=4xl]:size-24 data-[size=lg]:size-10 data-[size=sm]:size-6 data-[size=xl]:size-12 dark:after:mix-blend-lighten",
        className
      )}
      {...props}
    >
      {children ?? (
        <>
          <SkinHeadImage username={username} alt={username ?? "Skin head"} />
          <SkinHeadFallback>
            {fallback ?? (username ? username.charAt(0).toUpperCase() : "?")}
          </SkinHeadFallback>
        </>
      )}
    </AvatarPrimitive.Root>
  );
}

interface SkinHeadImageProps extends AvatarPrimitive.Image.Props {
  username?: string;
}

function SkinHeadImage({ className, username, src, alt, ...props }: SkinHeadImageProps) {
  const resolvedSrc = src ?? (username ? getMinecraftSkinHeadUrl(username) : undefined);

  return (
    <AvatarPrimitive.Image
      data-slot="skin-head-image"
      src={resolvedSrc}
      alt={alt}
      className={cn(
        "aspect-square size-full rounded-lg object-cover [image-rendering:pixelated]",
        className
      )}
      {...props}
    />
  );
}

function SkinHeadFallback({ className, ...props }: AvatarPrimitive.Fallback.Props) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="skin-head-fallback"
      className={cn(
        "bg-muted text-muted-foreground flex size-full items-center justify-center rounded-lg text-sm group-data-[size=2xl]/skin-head:text-xl group-data-[size=3xl]/skin-head:text-2xl group-data-[size=4xl]/skin-head:text-3xl group-data-[size=sm]/skin-head:text-xs group-data-[size=xl]/skin-head:text-base",
        className
      )}
      {...props}
    />
  );
}

export { SkinHead, SkinHeadImage, SkinHeadFallback, getMinecraftSkinHeadUrl };
