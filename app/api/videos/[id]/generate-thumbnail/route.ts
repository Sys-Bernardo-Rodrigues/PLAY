import { NextRequest, NextResponse } from "next/server";
import { getVideoById } from "@/lib/videos";
import { getCurrentUserIdFromRequest } from "@/lib/auth-helpers";
import pool from "@/lib/db";
import { join } from "path";
import { mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const videoId = parseInt(params.id);
    const { thumbnailData } = await request.json();

    if (!thumbnailData) {
      return NextResponse.json(
        { error: "Dados da thumbnail são obrigatórios" },
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
        { error: "Não autorizado" },
        { status: 403 }
      );
    }

    // Criar diretório de thumbnails se não existir
    const thumbnailsDir = join(process.cwd(), "uploads", "thumbnails");
    if (!existsSync(thumbnailsDir)) {
      await mkdir(thumbnailsDir, { recursive: true });
    }

    // Converter base64 para buffer
    const base64Data = thumbnailData.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Gerar nome único para o thumbnail
    const thumbnailFilename = `thumb_${videoId}_${Date.now()}.jpg`;
    const thumbnailPath = join(thumbnailsDir, thumbnailFilename);

    // Salvar thumbnail
    await writeFile(thumbnailPath, buffer);

    // Atualizar banco de dados
    await pool.query(
      `UPDATE videos SET thumbnail_path = $1 WHERE id = $2`,
      [thumbnailFilename, videoId]
    );

    return NextResponse.json({
      success: true,
      thumbnail_path: thumbnailFilename,
    });
  } catch (error) {
    console.error("Erro ao gerar thumbnail:", error);
    return NextResponse.json(
      { error: "Erro ao gerar thumbnail" },
      { status: 500 }
    );
  }
}

