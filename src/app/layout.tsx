import type { Metadata } from "next";
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
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Manrope:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        {children}
        <DesignNav />
        <Toaster richColors position="bottom-center" />
      </body>
    </html>
  );
}
