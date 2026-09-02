"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import { CheckCircle, Info, WarningCircle, XCircle, CircleNotch } from "@phosphor-icons/react";

export function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      position="bottom-right"
      richColors
      closeButton
      icons={{
        success: <CheckCircle className="size-4 text-emerald-400" weight="fill" />,
        info: <Info className="size-4 text-sky-400" weight="fill" />,
        warning: <WarningCircle className="size-4 text-amber-400" weight="fill" />,
        error: <XCircle className="size-4 text-rose-400" weight="fill" />,
        loading: <CircleNotch className="text-primary size-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl font-sans text-sm",
          description: "group-[.toast]:text-muted-foreground text-xs",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground font-medium text-xs rounded-md",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground font-medium text-xs rounded-md",
          closeButton:
            "group-[.toast]:bg-card group-[.toast]:border-border group-[.toast]:text-muted-foreground hover:group-[.toast]:text-foreground",
        },
      }}
      {...props}
    />
  );
}
