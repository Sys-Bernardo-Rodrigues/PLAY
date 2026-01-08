import { NextRequest, NextResponse } from "next/server";
import { getPlaylistForToday } from "@/lib/player-settings";
import { getUserByEmail } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    console.log("[API Public Player] Iniciando busca de playlist...");
    
    // Buscar usuário admin padrão (do .env ou padrão)
    const adminEmail = process.env.ADMIN_EMAIL || "admin@test.com";
    console.log("[API Public Player] Buscando usuário:", adminEmail);
    
    const user = await getUserByEmail(adminEmail);
    if (!user) {
      console.error("[API Public Player] Usuário não encontrado:", adminEmail);
      return NextResponse.json(
        { error: "Configuração não encontrada" },
        { status: 404 }
      );
    }

    console.log("[API Public Player] Usuário encontrado, ID:", user.id);

    // Buscar configurações primeiro para debug
    const { getPlayerSettings } = await import("@/lib/player-settings");
    const settings = await getPlayerSettings(user.id);
    
    // Buscar playlist do dia atual
    const playlistId = await getPlaylistForToday(user.id);
    
    // Obter informações de debug
    const now = new Date();
    const dayOfWeek = now.getDay();
    const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    const dayName = dayNames[dayOfWeek];
    
    console.log("[API Public Player] Dia detectado:", dayName, "(" + dayOfWeek + "), Playlist ID:", playlistId);
    
    if (!playlistId) {
      console.warn("[API Public Player] Nenhuma playlist configurada para", dayName);
      // Retornar 200 com erro para facilitar debug no frontend
      return NextResponse.json(
        { 
          error: "Nenhuma playlist configurada para hoje",
          playlistId: null,
          debug: {
            dayOfWeek,
            dayName,
            timestamp: now.toISOString(),
            localTime: now.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
            userId: user.id,
            settings: settings ? {
              monday: settings.monday_playlist_id || null,
              tuesday: settings.tuesday_playlist_id || null,
              wednesday: settings.wednesday_playlist_id || null,
              thursday: settings.thursday_playlist_id || null,
              friday: settings.friday_playlist_id || null,
              saturday: settings.saturday_playlist_id || null,
              sunday: settings.sunday_playlist_id || null,
            } : null
          }
        },
        { status: 200 }
      );
    }

    console.log("[API Public Player] Retornando playlist ID:", playlistId);
    return NextResponse.json({ 
      playlistId,
      debug: {
        dayOfWeek,
        dayName,
        timestamp: now.toISOString(),
        localTime: now.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
      }
    });
  } catch (error: any) {
    console.error("[API Public Player] Erro ao buscar playlist pública:", error);
    console.error("[API Public Player] Stack:", error.stack);
    return NextResponse.json(
      {
        error: "Erro ao buscar playlist",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

