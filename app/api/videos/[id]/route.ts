import { NextRequest, NextResponse } from "next/server";
import { readFile, unlink } from "fs/promises";
import { join } from "path";
import { getVideoById, deleteVideo } from "@/lib/videos";
import pool from "@/lib/db";
import { getCurrentUserIdFromRequest } from "@/lib/auth-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const videoId = parseInt(params.id);
    const video = await getVideoById(videoId);

    if (!video) {
      return NextResponse.json(
        { error: "Vídeo não encontrado" },
        { status: 404 }
      );
    }

    // Construir caminho do arquivo
    const filePath = join(process.cwd(), "uploads", "videos", video.filename);

    try {
      const fileBuffer = await readFile(filePath);
      
      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": video.mime_type || "video/mp4",
          "Content-Length": video.file_size.toString(),
          "Content-Disposition": `inline; filename="${video.original_filename}"`,
        },
      });
    } catch (fileError) {
      return NextResponse.json(
        { error: "Arquivo não encontrado no servidor" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Erro ao servir vídeo:", error);
    return NextResponse.json(
      { error: "Erro ao servir vídeo" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const videoId = parseInt(params.id);
    const video = await getVideoById(videoId);

    if (!video) {
      return NextResponse.json(
        { error: "Vídeo não encontrado" },
        { status: 404 }
      );
    }

    // Verificar se o vídeo pertence ao usuário
    if (video.user_id !== userId) {
      return NextResponse.json(
        { error: "Não autorizado a deletar este vídeo" },
        { status: 403 }
      );
    }

    // Verificar se o vídeo está em alguma playlist
    const playlistCheck = await pool.query(
      `SELECT COUNT(*) as count FROM playlist_videos WHERE video_id = $1`,
      [videoId]
    );

    if (parseInt(playlistCheck.rows[0].count) > 0) {
      return NextResponse.json(
        { error: "Não é possível deletar vídeo que está em uma playlist. Remova-o das playlists primeiro." },
        { status: 400 }
      );
    }

    // Deletar arquivo físico
    const filePath = join(process.cwd(), "uploads", "videos", video.filename);
    try {
      await unlink(filePath);
    } catch (fileError: any) {
      // Se o arquivo não existir, continuar com a deleção do banco
      if (fileError.code !== "ENOENT") {
        console.error("Erro ao deletar arquivo:", fileError);
      }
    }

    // Deletar do banco de dados
    const deleted = await deleteVideo(videoId, userId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Erro ao deletar vídeo" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao deletar vídeo:", error);
    return NextResponse.json(
      { error: "Erro ao deletar vídeo" },
      { status: 500 }
    );
  }
}

