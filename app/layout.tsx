import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";

const anthropicSerif = localFont({
  src: [
    {
      path: "./fonts/anthropic-serif/AnthropicSerif-Display-Light-Static.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "./fonts/anthropic-serif/AnthropicSerif-Display-LightItalic-Static.woff2",
      weight: "300",
      style: "italic",
    },
    {
      path: "./fonts/anthropic-serif/AnthropicSerif-Display-Regular-Static.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/anthropic-serif/AnthropicSerif-Display-RegularItalic-Static.woff2",
      weight: "400",
      style: "italic",
    },
    {
      path: "./fonts/anthropic-serif/AnthropicSerif-Display-Medium-Static.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/anthropic-serif/AnthropicSerif-Display-MediumItalic-Static.woff2",
      weight: "500",
      style: "italic",
    },
    {
      path: "./fonts/anthropic-serif/AnthropicSerif-Display-Semibold-Static.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/anthropic-serif/AnthropicSerif-Display-SemiboldItalic-Static.woff2",
      weight: "600",
      style: "italic",
    },
    {
      path: "./fonts/anthropic-serif/AnthropicSerif-Display-Bold-Static.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/anthropic-serif/AnthropicSerif-Display-BoldItalic-Static.woff2",
      weight: "700",
      style: "italic",
    },
    {
      path: "./fonts/anthropic-serif/AnthropicSerif-Display-Extrabold-Static.woff2",
      weight: "800",
      style: "normal",
    },
    {
      path: "./fonts/anthropic-serif/AnthropicSerif-Display-ExtraboldItalic-Static.woff2",
      weight: "800",
      style: "italic",
    },
  ],
  variable: "--font-heading",
  display: "swap",
});

const sourceSerif = localFont({
  src: [
    {
      path: "./fonts/source-serif/SourceSerif4-ExtraLight.woff2",
      weight: "200",
      style: "normal",
    },
    {
      path: "./fonts/source-serif/SourceSerif4-ExtraLightItalic.woff2",
      weight: "200",
      style: "italic",
    },
    {
      path: "./fonts/source-serif/SourceSerif4-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "./fonts/source-serif/SourceSerif4-LightItalic.woff2",
      weight: "300",
      style: "italic",
    },
    {
      path: "./fonts/source-serif/SourceSerif4-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/source-serif/SourceSerif4-Italic.woff2",
      weight: "400",
      style: "italic",
    },
    {
      path: "./fonts/source-serif/SourceSerif4-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/source-serif/SourceSerif4-MediumItalic.woff2",
      weight: "500",
      style: "italic",
    },
    {
      path: "./fonts/source-serif/SourceSerif4-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/source-serif/SourceSerif4-SemiBoldItalic.woff2",
      weight: "600",
      style: "italic",
    },
    {
      path: "./fonts/source-serif/SourceSerif4-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/source-serif/SourceSerif4-BoldItalic.woff2",
      weight: "700",
      style: "italic",
    },
    {
      path: "./fonts/source-serif/SourceSerif4-ExtraBold.woff2",
      weight: "800",
      style: "normal",
    },
    {
      path: "./fonts/source-serif/SourceSerif4-ExtraBoldItalic.woff2",
      weight: "800",
      style: "italic",
    },
    {
      path: "./fonts/source-serif/SourceSerif4-Black.woff2",
      weight: "900",
      style: "normal",
    },
    {
      path: "./fonts/source-serif/SourceSerif4-BlackItalic.woff2",
      weight: "900",
      style: "italic",
    },
  ],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hyori Atlas",
  description: "Site officiel du projet Hyori RP.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={cn(
        "h-full",
        "antialiased",
        anthropicSerif.variable,
        sourceSerif.variable,
        "font-sans"
      )}
    >
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
