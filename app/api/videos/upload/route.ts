import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { createVideo } from "@/lib/videos";
import { getUserByEmail } from "@/lib/auth";

// Desabilitar body parsing padrão, vamos usar FormData
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const email = formData.get("email") as string;

    if (!file) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado" },
        { status: 400 }
      );
    }

    // Validar tipo de arquivo (apenas vídeos)
    const allowedTypes = [
      "video/mp4",
      "video/webm",
      "video/ogg",
      "video/quicktime",
      "video/x-msvideo",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de arquivo não permitido. Apenas vídeos são aceitos." },
        { status: 400 }
      );
    }

    // Validar tamanho (máximo 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Arquivo muito grande. Tamanho máximo: 100MB" },
        { status: 400 }
      );
    }

    // Buscar usuário (por enquanto, vamos usar email temporário)
    // Em produção, você deve usar sessão/JWT
    let user;
    if (email) {
      user = await getUserByEmail(email);
    }

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 401 }
      );
    }

    // Criar diretório de uploads se não existir
    const uploadsDir = join(process.cwd(), "uploads", "videos");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const sanitizedOriginalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${timestamp}_${sanitizedOriginalName}`;
    const filePath = join(uploadsDir, filename);

    // Salvar arquivo
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Salvar informações no banco de dados
    const video = await createVideo(
      user.id,
      filename,
      file.name,
      `/uploads/videos/${filename}`,
      file.size,
      file.type
    );

    return NextResponse.json({
      success: true,
      video: {
        id: video.id,
        filename: video.filename,
        original_filename: video.original_filename,
        file_size: video.file_size,
        created_at: video.created_at,
      },
    });
  } catch (error) {
    console.error("Erro no upload:", error);
    return NextResponse.json(
      { error: "Erro ao fazer upload do vídeo" },
      { status: 500 }
    );
  }
}

