import pool from "./db";

export interface Playlist {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
  video_count?: number;
}

export interface PlaylistVideo {
  id: number;
  playlist_id: number;
  video_id: number;
  position: number;
  added_at: Date;
  video?: {
    id: number;
    filename: string;
    original_filename: string;
    file_path: string;
    file_size: number;
    mime_type: string | null;
    created_at: Date;
  };
}

export async function createPlaylist(
  userId: number,
  name: string,
  description?: string
): Promise<Playlist> {
  const result = await pool.query(
    `INSERT INTO playlists (user_id, name, description)
     VALUES ($1, $2, $3)
     RETURNING id, user_id, name, description, created_at, updated_at`,
    [userId, name, description || null]
  );

  return result.rows[0];
}

export async function getPlaylistsByUserId(userId: number): Promise<Playlist[]> {
  try {
    const result = await pool.query(
      `SELECT 
         p.id, 
         p.user_id, 
         p.name, 
         p.description, 
         p.created_at, 
         p.updated_at,
         COUNT(pv.id) as video_count
       FROM playlists p
       LEFT JOIN playlist_videos pv ON p.id = pv.playlist_id
       WHERE p.user_id = $1
       GROUP BY p.id, p.user_id, p.name, p.description, p.created_at, p.updated_at
       ORDER BY p.updated_at DESC`,
      [userId]
    );

    return result.rows.map((row) => ({
      ...row,
      video_count: parseInt(row.video_count) || 0,
    }));
  } catch (error: any) {
    console.error("Erro na query getPlaylistsByUserId:", error);
    throw error;
  }
}

export async function getPlaylistById(
  id: number,
  userId?: number
): Promise<Playlist | null> {
  let query = `
    SELECT 
      p.id, 
      p.user_id, 
      p.name, 
      p.description, 
      p.created_at, 
      p.updated_at,
      COUNT(pv.id) as video_count
    FROM playlists p
    LEFT JOIN playlist_videos pv ON p.id = pv.playlist_id
    WHERE p.id = $1
  `;
  const params: any[] = [id];

  if (userId) {
    query += " AND p.user_id = $2";
    params.push(userId);
  }

  query += " GROUP BY p.id, p.user_id, p.name, p.description, p.created_at, p.updated_at";

  const result = await pool.query(query, params);

  if (result.rows.length === 0) {
    return null;
  }

  return {
    ...result.rows[0],
    video_count: parseInt(result.rows[0].video_count) || 0,
  };
}

export async function updatePlaylist(
  id: number,
  userId: number,
  name?: string,
  description?: string
): Promise<Playlist | null> {
  const updates: string[] = [];
  const params: any[] = [];
  let paramCount = 1;

  if (name !== undefined) {
    updates.push(`name = $${paramCount++}`);
    params.push(name);
  }

  if (description !== undefined) {
    updates.push(`description = $${paramCount++}`);
    params.push(description);
  }

  if (updates.length === 0) {
    return getPlaylistById(id, userId);
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  params.push(id, userId);

  const result = await pool.query(
    `UPDATE playlists 
     SET ${updates.join(", ")}
     WHERE id = $${paramCount++} AND user_id = $${paramCount++}
     RETURNING id, user_id, name, description, created_at, updated_at`,
    params
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

export async function deletePlaylist(
  id: number,
  userId: number
): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM playlists WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, userId]
  );

  return result.rows.length > 0;
}

export async function addVideoToPlaylist(
  playlistId: number,
  videoId: number,
  userId: number
): Promise<PlaylistVideo | null> {
  // Verificar se a playlist pertence ao usuário
  const playlist = await getPlaylistById(playlistId, userId);
  if (!playlist) {
    return null;
  }

  // Obter a próxima posição (permite vídeos duplicados)
  const positionResult = await pool.query(
    `SELECT COALESCE(MAX(position), 0) + 1 as next_position
     FROM playlist_videos WHERE playlist_id = $1`,
    [playlistId]
  );
  const position = positionResult.rows[0].next_position;

  const result = await pool.query(
    `INSERT INTO playlist_videos (playlist_id, video_id, position)
     VALUES ($1, $2, $3)
     RETURNING id, playlist_id, video_id, position, added_at`,
    [playlistId, videoId, position]
  );

  // Atualizar updated_at da playlist
  await pool.query(
    `UPDATE playlists SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [playlistId]
  );

  return result.rows[0];
}

export async function removeVideoFromPlaylist(
  playlistId: number,
  videoId: number,
  userId: number
): Promise<boolean> {
  // Verificar se a playlist pertence ao usuário
  const playlist = await getPlaylistById(playlistId, userId);
  if (!playlist) {
    return false;
  }

  const result = await pool.query(
    `DELETE FROM playlist_videos 
     WHERE playlist_id = $1 AND video_id = $2
     RETURNING id`,
    [playlistId, videoId]
  );

  if (result.rows.length > 0) {
    // Reordenar posições
    await pool.query(
      `UPDATE playlist_videos pv
       SET position = sub.new_position
       FROM (
         SELECT id, ROW_NUMBER() OVER (ORDER BY position) as new_position
         FROM playlist_videos
         WHERE playlist_id = $1
       ) sub
       WHERE pv.id = sub.id AND pv.playlist_id = $1`,
      [playlistId]
    );

    // Atualizar updated_at da playlist
    await pool.query(
      `UPDATE playlists SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [playlistId]
    );

    return true;
  }

  return false;
}

export async function getPlaylistVideos(
  playlistId: number,
  userId?: number
): Promise<PlaylistVideo[]> {
  let query = `
    SELECT 
      pv.id,
      pv.playlist_id,
      pv.video_id,
      pv.position,
      pv.added_at,
      v.id as video_id,
      v.filename,
      v.original_filename,
      v.file_path,
      v.file_size,
      v.mime_type,
      v.created_at
    FROM playlist_videos pv
    INNER JOIN videos v ON pv.video_id = v.id
    WHERE pv.playlist_id = $1
  `;
  const params: any[] = [playlistId];

  if (userId) {
    query += ` AND EXISTS (
      SELECT 1 FROM playlists p 
      WHERE p.id = pv.playlist_id AND p.user_id = $2
    )`;
    params.push(userId);
  }

  query += ` ORDER BY pv.position ASC`;

  const result = await pool.query(query, params);

  return result.rows.map((row) => ({
    id: row.id,
    playlist_id: row.playlist_id,
    video_id: row.video_id,
    position: row.position,
    added_at: row.added_at,
    video: {
      id: row.video_id,
      filename: row.filename,
      original_filename: row.original_filename,
      file_path: row.file_path,
      file_size: row.file_size,
      mime_type: row.mime_type,
      created_at: row.created_at,
    },
  }));
}

