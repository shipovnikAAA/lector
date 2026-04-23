import type { Metadata } from "next";
import { IBM_Plex_Mono, Rubik } from "next/font/google";

import "./globals.css";

const rubik = Rubik({
  subsets: ["latin", "cyrillic"],
  variable: "--font-display"
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-mono",
  weight: ["400", "500", "600"]
});

export const metadata: Metadata = {
  title: "ФизБот",
  description:
    "ИИ-помощник по физике: решение задач, пошаговые объяснения и личный кабинет ученика"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${rubik.variable} ${ibmPlexMono.variable}`}>{children}</body>
    </html>
  );
}
