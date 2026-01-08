import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getPlaylistById } from "@/lib/playlists";
import { getCurrentUserIdFromRequest } from "@/lib/auth-helpers";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const playlistId = parseInt(params.id);
    const { videoIds } = await request.json();

    if (!Array.isArray(videoIds)) {
      return NextResponse.json(
        { error: "videoIds deve ser um array" },
        { status: 400 }
      );
    }

    const userId = await getCurrentUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    // Verificar se a playlist pertence ao usuário
    const playlist = await getPlaylistById(playlistId, userId);
    if (!playlist) {
      return NextResponse.json(
        { error: "Playlist não encontrada" },
        { status: 404 }
      );
    }

    // Atualizar posições dos vídeos
    // videoIds é um array de playlist_videos.id na nova ordem
    for (let i = 0; i < videoIds.length; i++) {
      const playlistVideoId = parseInt(videoIds[i]);
      await pool.query(
        `UPDATE playlist_videos 
         SET position = $1 
         WHERE id = $2 AND playlist_id = $3`,
        [i + 1, playlistVideoId, playlistId]
      );
    }

    // Atualizar updated_at da playlist
    await pool.query(
      `UPDATE playlists SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [playlistId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao reordenar vídeos:", error);
    return NextResponse.json(
      { error: "Erro ao reordenar vídeos" },
      { status: 500 }
    );
  }
}

