import { NextRequest, NextResponse } from "next/server";
import {
  addVideoToPlaylist,
  removeVideoFromPlaylist,
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

    const videos = await getPlaylistVideos(playlistId, user.id);

    return NextResponse.json({ videos });
  } catch (error) {
    console.error("Erro ao buscar vídeos da playlist:", error);
    return NextResponse.json(
      { error: "Erro ao buscar vídeos da playlist" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const playlistId = parseInt(params.id);
    const { email, videoId } = await request.json();

    if (!email || !videoId) {
      return NextResponse.json(
        { error: "Email e videoId são obrigatórios" },
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

    const playlistVideo = await addVideoToPlaylist(
      playlistId,
      videoId,
      user.id
    );

    if (!playlistVideo) {
      return NextResponse.json(
        { error: "Playlist não encontrada" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, playlistVideo });
  } catch (error) {
    console.error("Erro ao adicionar vídeo à playlist:", error);
    return NextResponse.json(
      { error: "Erro ao adicionar vídeo à playlist" },
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
    const videoId = searchParams.get("videoId");
    const email = searchParams.get("email");

    if (!email || !videoId) {
      return NextResponse.json(
        { error: "Email e videoId são obrigatórios" },
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

    const deleted = await removeVideoFromPlaylist(
      playlistId,
      parseInt(videoId),
      user.id
    );

    if (!deleted) {
      return NextResponse.json(
        { error: "Playlist ou vídeo não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao remover vídeo da playlist:", error);
    return NextResponse.json(
      { error: "Erro ao remover vídeo da playlist" },
      { status: 500 }
    );
  }
}

