import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { DesignNav } from "@/components/DesignNav";

export const metadata: Metadata = {
  title: "ImageForge",
  description:
    "Resize any image to an exact file size. Compress or upscale — powered by Rust/WASM, 100% in your browser.",
  keywords: [
    "image resizer",
    "image compressor",
    "upscale image",
    "reduce image size",
    "wasm image processor",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Fahkwang:wght@300;400;500;600;700&family=Inter+Tight:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Manrope:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500&family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&family=Syne:wght@400;500;600;700;800&family=Work+Sans:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        {children}
        <Analytics />
        <DesignNav />
        <Toaster richColors position="bottom-center" />
      </body>
    </html>
  );
}
