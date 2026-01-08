import { NextRequest, NextResponse } from "next/server";
import {
  getPlayerSettings,
  getOrCreatePlayerSettings,
  updatePlayerSettings,
  getPlaylistForToday,
} from "@/lib/player-settings";
import { getUserByEmail } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get("email");
    const today = searchParams.get("today") === "true";

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

    if (today) {
      const playlistId = await getPlaylistForToday(user.id);
      return NextResponse.json({ playlistId });
    }

    const settings = await getOrCreatePlayerSettings(user.id);

    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error("Erro ao buscar configurações:", error);
    return NextResponse.json(
      {
        error: "Erro ao buscar configurações",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { email, ...settings } = await request.json();

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

    const updatedSettings = await updatePlayerSettings(user.id, settings);

    return NextResponse.json({ success: true, settings: updatedSettings });
  } catch (error: any) {
    console.error("Erro ao atualizar configurações:", error);
    return NextResponse.json(
      {
        error: "Erro ao atualizar configurações",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

