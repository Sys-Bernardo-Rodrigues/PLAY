import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { getVideoById } from "@/lib/videos";

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

    // Se não houver thumbnail, retornar imagem padrão ou 404
    if (!video.thumbnail_path) {
      return NextResponse.json(
        { error: "Thumbnail não encontrado" },
        { status: 404 }
      );
    }

    // Construir caminho do arquivo de thumbnail
    const thumbnailPath = join(process.cwd(), "uploads", "thumbnails", video.thumbnail_path);

    try {
      const fileBuffer = await readFile(thumbnailPath);
      
      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch (fileError) {
      return NextResponse.json(
        { error: "Thumbnail não encontrado no servidor" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Erro ao servir thumbnail:", error);
    return NextResponse.json(
      { error: "Erro ao servir thumbnail" },
      { status: 500 }
    );
  }
}

