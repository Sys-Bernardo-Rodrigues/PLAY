import { NextRequest, NextResponse } from "next/server";
import { getVideosByUserId, getAllVideos } from "@/lib/videos";
import { getUserByEmail } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get("email");

    let videos;

    if (email) {
      const user = await getUserByEmail(email);
      if (!user) {
        return NextResponse.json(
          { error: "Usuário não encontrado" },
          { status: 401 }
        );
      }
      videos = await getVideosByUserId(user.id);
    } else {
      videos = await getAllVideos();
    }

    return NextResponse.json({ videos });
  } catch (error) {
    console.error("Erro ao buscar vídeos:", error);
    return NextResponse.json(
      { error: "Erro ao buscar vídeos" },
      { status: 500 }
    );
  }
}

