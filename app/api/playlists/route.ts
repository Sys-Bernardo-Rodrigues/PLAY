import { NextRequest, NextResponse } from "next/server";
import {
  createPlaylist,
  getPlaylistsByUserId,
} from "@/lib/playlists";
import { getUserByEmail } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
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

    const playlists = await getPlaylistsByUserId(user.id);

    return NextResponse.json({ playlists });
  } catch (error: any) {
    console.error("Erro ao buscar playlists:", error);
    return NextResponse.json(
      { 
        error: "Erro ao buscar playlists",
        details: process.env.NODE_ENV === "development" ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, name, description } = await request.json();

    if (!email || !name) {
      return NextResponse.json(
        { error: "Email e nome são obrigatórios" },
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

    const playlist = await createPlaylist(user.id, name, description);

    return NextResponse.json({ success: true, playlist });
  } catch (error: any) {
    console.error("Erro ao criar playlist:", error);
    return NextResponse.json(
      { 
        error: "Erro ao criar playlist",
        details: process.env.NODE_ENV === "development" ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

