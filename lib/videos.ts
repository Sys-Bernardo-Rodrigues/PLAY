import pool from "./db";

export interface Video {
  id: number;
  user_id: number;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  duration: number | null;
  thumbnail_path: string | null;
  created_at: Date;
}

export async function createVideo(
  userId: number,
  filename: string,
  originalFilename: string,
  filePath: string,
  fileSize: number,
  mimeType?: string,
  duration?: number
): Promise<Video> {
  const result = await pool.query(
    `INSERT INTO videos (user_id, filename, original_filename, file_path, file_size, mime_type, duration)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, user_id, filename, original_filename, file_path, file_size, mime_type, duration, created_at`,
    [userId, filename, originalFilename, filePath, fileSize, mimeType || null, duration || null]
  );

  return result.rows[0];
}

export async function getVideosByUserId(userId: number): Promise<Video[]> {
  const result = await pool.query(
    `SELECT id, user_id, filename, original_filename, file_path, file_size, mime_type, duration, thumbnail_path, created_at
     FROM videos
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return result.rows;
}

export async function getAllVideos(): Promise<Video[]> {
  const result = await pool.query(
    `SELECT id, user_id, filename, original_filename, file_path, file_size, mime_type, duration, thumbnail_path, created_at
     FROM videos
     ORDER BY created_at DESC`
  );

  return result.rows;
}

export async function getVideoById(id: number): Promise<Video | null> {
  const result = await pool.query(
    `SELECT id, user_id, filename, original_filename, file_path, file_size, mime_type, duration, thumbnail_path, created_at
     FROM videos
     WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

export async function deleteVideo(id: number, userId: number): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM videos WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, userId]
  );

  return result.rows.length > 0;
}

