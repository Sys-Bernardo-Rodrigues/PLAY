require("dotenv").config();
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "play_db",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
});

async function initDatabase() {
  try {
    console.log("Conectando ao banco de dados...");
    
    // Criar tabela de usuários
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Criar índice
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `);

    // Criar tabela de vídeos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS videos (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size BIGINT NOT NULL,
        mime_type VARCHAR(100),
        duration INTEGER,
        thumbnail_path VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Adicionar coluna thumbnail_path se não existir (para bancos existentes)
    try {
      await pool.query(`
        ALTER TABLE videos 
        ADD COLUMN IF NOT EXISTS thumbnail_path VARCHAR(500)
      `);
    } catch (err) {
      // Ignorar erro se a coluna já existir
      console.log("Coluna thumbnail_path já existe ou erro ao adicionar");
    }

    // Criar índices para vídeos
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC)
    `);

    // Criar tabela de playlists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS playlists (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Criar tabela de relacionamento entre playlists e vídeos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS playlist_videos (
        id SERIAL PRIMARY KEY,
        playlist_id INTEGER REFERENCES playlists(id) ON DELETE CASCADE,
        video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
        position INTEGER NOT NULL,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Remover constraint UNIQUE se existir (para permitir vídeos duplicados)
    try {
      await pool.query(`
        ALTER TABLE playlist_videos 
        DROP CONSTRAINT IF EXISTS playlist_videos_playlist_id_video_id_key
      `);
    } catch (err) {
      // Ignorar erro se a constraint não existir
      console.log("Constraint UNIQUE não encontrada ou já removida");
    }

    // Criar índices para playlists
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_playlist_videos_playlist_id ON playlist_videos(playlist_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_playlist_videos_video_id ON playlist_videos(video_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_playlist_videos_position ON playlist_videos(playlist_id, position)
    `);

    // Criar tabela de configurações do player
    await pool.query(`
      CREATE TABLE IF NOT EXISTS player_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        loop_playlist BOOLEAN DEFAULT false,
        monday_playlist_id INTEGER REFERENCES playlists(id) ON DELETE SET NULL,
        tuesday_playlist_id INTEGER REFERENCES playlists(id) ON DELETE SET NULL,
        wednesday_playlist_id INTEGER REFERENCES playlists(id) ON DELETE SET NULL,
        thursday_playlist_id INTEGER REFERENCES playlists(id) ON DELETE SET NULL,
        friday_playlist_id INTEGER REFERENCES playlists(id) ON DELETE SET NULL,
        saturday_playlist_id INTEGER REFERENCES playlists(id) ON DELETE SET NULL,
        sunday_playlist_id INTEGER REFERENCES playlists(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Criar índice para configurações
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_player_settings_user_id ON player_settings(user_id)
    `);

    // Obter credenciais do usuário admin do .env
    const adminEmail = process.env.ADMIN_EMAIL || "admin@test.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

    // Verificar se já existe usuário admin
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      adminEmail,
    ]);

    if (result.rows.length === 0) {
      // Criar usuário admin
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await pool.query(
        "INSERT INTO users (email, password_hash) VALUES ($1, $2)",
        [adminEmail, passwordHash]
      );
      console.log("✅ Usuário admin criado:");
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Senha: ${adminPassword}`);
    } else {
      console.log("ℹ️  Usuário admin já existe");
    }

    console.log("✅ Banco de dados inicializado com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao inicializar banco de dados:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDatabase();

