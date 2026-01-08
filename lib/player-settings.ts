import pool from "./db";

export interface PlayerSettings {
  id: number;
  user_id: number;
  loop_playlist: boolean;
  monday_playlist_id: number | null;
  tuesday_playlist_id: number | null;
  wednesday_playlist_id: number | null;
  thursday_playlist_id: number | null;
  friday_playlist_id: number | null;
  saturday_playlist_id: number | null;
  sunday_playlist_id: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface PlayerSettingsInput {
  loop_playlist?: boolean;
  monday_playlist_id?: number | null;
  tuesday_playlist_id?: number | null;
  wednesday_playlist_id?: number | null;
  thursday_playlist_id?: number | null;
  friday_playlist_id?: number | null;
  saturday_playlist_id?: number | null;
  sunday_playlist_id?: number | null;
}

export async function getPlayerSettings(
  userId: number
): Promise<PlayerSettings | null> {
  try {
    const result = await pool.query(
      `SELECT * FROM player_settings WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      console.log(`[getPlayerSettings] Nenhuma configuração encontrada para user_id: ${userId}`);
      return null;
    }

    console.log(`[getPlayerSettings] Configuração encontrada para user_id: ${userId}`);
    return result.rows[0];
  } catch (error: any) {
    console.error(`[getPlayerSettings] Erro ao buscar configurações:`, error);
    throw error;
  }
}

export async function getOrCreatePlayerSettings(
  userId: number
): Promise<PlayerSettings> {
  let settings = await getPlayerSettings(userId);

  if (!settings) {
    // Criar configurações padrão
    const result = await pool.query(
      `INSERT INTO player_settings (user_id, loop_playlist)
       VALUES ($1, false)
       RETURNING *`,
      [userId]
    );
    settings = result.rows[0] as PlayerSettings;
  }

  return settings as PlayerSettings;
}

export async function updatePlayerSettings(
  userId: number,
  settings: PlayerSettingsInput
): Promise<PlayerSettings> {
  const updates: string[] = [];
  const params: any[] = [];
  let paramCount = 1;

  if (settings.loop_playlist !== undefined) {
    updates.push(`loop_playlist = $${paramCount++}`);
    params.push(settings.loop_playlist);
  }

  const days = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  days.forEach((day) => {
    const key = `${day}_playlist_id` as keyof PlayerSettingsInput;
    if (settings[key] !== undefined) {
      updates.push(`${key} = $${paramCount++}`);
      params.push(settings[key]);
    }
  });

  if (updates.length === 0) {
    return await getOrCreatePlayerSettings(userId);
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  params.push(userId);

  const result = await pool.query(
    `UPDATE player_settings 
     SET ${updates.join(", ")}
     WHERE user_id = $${paramCount++}
     RETURNING *`,
    params
  );

  if (result.rows.length === 0) {
    // Se não existe, criar
    return await getOrCreatePlayerSettings(userId);
  }

  return result.rows[0];
}

export async function getPlaylistForToday(userId: number): Promise<number | null> {
  const settings = await getPlayerSettings(userId);
  
  if (!settings) {
    return null;
  }

  // Usar timezone do Brasil (America/Sao_Paulo) ou UTC
  // Criar data no timezone local do servidor
  const now = new Date();
  
  // Obter dia da semana (0 = Domingo, 1 = Segunda, etc.)
  // Usar toLocaleString para garantir timezone correto
  const dayOfWeek = now.getDay();
  
  // Mapear dia da semana para campo da configuração
  const dayMap: { [key: number]: keyof PlayerSettings } = {
    0: "sunday_playlist_id",      // Domingo
    1: "monday_playlist_id",      // Segunda-feira
    2: "tuesday_playlist_id",     // Terça-feira
    3: "wednesday_playlist_id",   // Quarta-feira
    4: "thursday_playlist_id",    // Quinta-feira
    5: "friday_playlist_id",      // Sexta-feira
    6: "saturday_playlist_id",    // Sábado
  };

  const dayKey = dayMap[dayOfWeek];
  
  if (!dayKey) {
    console.error(`Dia da semana inválido: ${dayOfWeek}`);
    return null;
  }

  const playlistId = settings[dayKey] as number | null;
  
  // Log para debug
  const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  console.log(`[getPlaylistForToday] Dia: ${dayNames[dayOfWeek]} (${dayOfWeek}), Campo: ${dayKey}, Playlist ID: ${playlistId}`);
  
  return playlistId;
}

