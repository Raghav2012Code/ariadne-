import type { Metadata } from "next";
import "./globals.css";
import { Inter, JetBrains_Mono } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Ariadne — Dark Minimalist Maze & Search Engine",
  description: "Pitch-black maze generation and pathfinding visualizer",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable} dark`}>
      <body className="bg-black text-zinc-50 font-sans antialiased overflow-hidden h-[100dvh] w-screen">
        {children}
      </body>
    </html>
  );
}
