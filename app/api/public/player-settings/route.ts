import { NextRequest, NextResponse } from "next/server";
import { getOrCreatePlayerSettings } from "@/lib/player-settings";
import { getUserByEmail } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // Buscar usuário admin padrão
    const adminEmail = process.env.ADMIN_EMAIL || "admin@test.com";
    
    const user = await getUserByEmail(adminEmail);
    if (!user) {
      return NextResponse.json(
        { error: "Configuração não encontrada" },
        { status: 404 }
      );
    }

    // Buscar configurações do player
    const settings = await getOrCreatePlayerSettings(user.id);

    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error("Erro ao buscar configurações públicas:", error);
    return NextResponse.json(
      {
        error: "Erro ao buscar configurações",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

