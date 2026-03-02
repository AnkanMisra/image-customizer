import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { DesignNav } from "@/components/DesignNav";
import { Manrope, Space_Grotesk, JetBrains_Mono, DM_Sans, Playfair_Display, Inter_Tight } from 'next/font/google';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-body', weight: ['300', '400', '500', '600', '700'] });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-display', weight: ['400', '500', '600', '700'] });
const jetBrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', weight: ['400', '500'] });
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm', weight: ['400', '500', '600'] });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair', weight: ['400', '500', '600', '700'] });
const interTight = Inter_Tight({ subsets: ['latin'], variable: '--font-intertight', weight: ['400', '500', '600', '700'] });

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
      <body className={`${manrope.variable} ${spaceGrotesk.variable} ${jetBrainsMono.variable} ${dmSans.variable} ${playfair.variable} ${interTight.variable} font-body antialiased`}>
        {children}
        <Analytics />
        <DesignNav />
        <Toaster richColors position="bottom-center" />
      </body>
    </html>
  );
}
