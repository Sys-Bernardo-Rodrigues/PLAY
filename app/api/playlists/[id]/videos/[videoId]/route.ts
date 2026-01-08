import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getPlaylistById } from "@/lib/playlists";
import { getUserByEmail } from "@/lib/auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; videoId: string } }
) {
  try {
    const playlistId = parseInt(params.id);
    const playlistVideoId = parseInt(params.videoId);
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email é obrigatório" },
        { status: 400 }
      );
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 401 }
      );
    }

    // Verificar se a playlist pertence ao usuário
    const playlist = await getPlaylistById(playlistId, user.id);
    if (!playlist) {
      return NextResponse.json(
        { error: "Playlist não encontrada" },
        { status: 404 }
      );
    }

    // Deletar a entrada específica da playlist
    const result = await pool.query(
      `DELETE FROM playlist_videos 
       WHERE id = $1 AND playlist_id = $2
       RETURNING id`,
      [playlistVideoId, playlistId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Vídeo não encontrado na playlist" },
        { status: 404 }
      );
    }

    // Reordenar posições
    await pool.query(
      `UPDATE playlist_videos pv
       SET position = sub.new_position
       FROM (
         SELECT id, ROW_NUMBER() OVER (ORDER BY position) as new_position
         FROM playlist_videos
         WHERE playlist_id = $1
       ) sub
       WHERE pv.id = sub.id AND pv.playlist_id = $1`,
      [playlistId]
    );

    // Atualizar updated_at da playlist
    await pool.query(
      `UPDATE playlists SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [playlistId]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro ao remover vídeo da playlist:", error);
    return NextResponse.json(
      {
        error: "Erro ao remover vídeo da playlist",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

