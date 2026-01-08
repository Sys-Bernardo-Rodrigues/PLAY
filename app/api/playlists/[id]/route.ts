import { NextRequest, NextResponse } from "next/server";
import {
  getPlaylistById,
  updatePlaylist,
  deletePlaylist,
  getPlaylistVideos,
} from "@/lib/playlists";
import { getUserByEmail } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const playlistId = parseInt(params.id);
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get("email");
    const includeVideos = searchParams.get("includeVideos") === "true";

    let userId: number | undefined;

    if (email) {
      const user = await getUserByEmail(email);
      if (!user) {
        return NextResponse.json(
          { error: "Usuário não encontrado" },
          { status: 401 }
        );
      }
      userId = user.id;
    }

    const playlist = await getPlaylistById(playlistId, userId);

    if (!playlist) {
      return NextResponse.json(
        { error: "Playlist não encontrada" },
        { status: 404 }
      );
    }

    if (includeVideos && userId) {
      const videos = await getPlaylistVideos(playlistId, userId);
      return NextResponse.json({ playlist, videos });
    }

    return NextResponse.json({ playlist });
  } catch (error) {
    console.error("Erro ao buscar playlist:", error);
    return NextResponse.json(
      { error: "Erro ao buscar playlist" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const playlistId = parseInt(params.id);
    const { email, name, description } = await request.json();

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

    const playlist = await updatePlaylist(playlistId, user.id, name, description);

    if (!playlist) {
      return NextResponse.json(
        { error: "Playlist não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, playlist });
  } catch (error) {
    console.error("Erro ao atualizar playlist:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar playlist" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const playlistId = parseInt(params.id);
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

    const deleted = await deletePlaylist(playlistId, user.id);

    if (!deleted) {
      return NextResponse.json(
        { error: "Playlist não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao deletar playlist:", error);
    return NextResponse.json(
      { error: "Erro ao deletar playlist" },
      { status: 500 }
    );
  }
}

