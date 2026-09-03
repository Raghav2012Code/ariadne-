import type { Metadata } from "next";
import "./globals.css";
import { Inter, JetBrains_Mono } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Ariadne — Maze & Pathfinding Visualizer",
  description: "Design-driven maze generation and pathfinding visualizer. Compare A*, Dijkstra, BFS, DFS and more in a polished dark studio.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable} dark`}>
      <body className="text-zinc-100 font-sans antialiased overflow-hidden h-[100dvh] w-screen">
        {children}
      </body>
    </html>
  );
}
