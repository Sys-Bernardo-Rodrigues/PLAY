import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PLAY - Sistema de Vídeos",
  description: "Sistema de gerenciamento de vídeos e playlists",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-[#0f0f0f] text-white">{children}</body>
    </html>
  );
}

