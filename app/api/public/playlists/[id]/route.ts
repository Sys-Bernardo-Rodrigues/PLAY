import { NextRequest, NextResponse } from "next/server";
import { getPlaylistById } from "@/lib/playlists";
import { getPlaylistVideos } from "@/lib/playlists";
import { getUserByEmail } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const playlistId = parseInt(params.id);
    
    // Buscar usuário admin padrão
    const adminEmail = process.env.ADMIN_EMAIL || "admin@test.com";
    const user = await getUserByEmail(adminEmail);
    
    if (!user) {
      return NextResponse.json(
        { error: "Configuração não encontrada" },
        { status: 404 }
      );
    }

    // Buscar informações da playlist (sem verificar ownership para acesso público)
    const playlist = await getPlaylistById(playlistId);

    if (!playlist) {
      return NextResponse.json(
        { error: "Playlist não encontrada" },
        { status: 404 }
      );
    }

    // Buscar vídeos da playlist
    const videos = await getPlaylistVideos(playlistId);

    return NextResponse.json({ playlist, videos });
  } catch (error: any) {
    console.error("Erro ao buscar playlist pública:", error);
    return NextResponse.json(
      {
        error: "Erro ao buscar playlist",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

