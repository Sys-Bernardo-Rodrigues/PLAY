require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "play_db",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
});

async function addThumbnailColumn() {
  try {
    console.log("Conectando ao banco de dados...");
    
    // Verificar se a coluna já existe
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'videos' AND column_name = 'thumbnail_path'
    `);

    if (checkColumn.rows.length > 0) {
      console.log("✅ Coluna thumbnail_path já existe na tabela videos.");
      process.exit(0);
    }

    // Adicionar coluna thumbnail_path
    console.log("Adicionando coluna thumbnail_path à tabela videos...");
    await pool.query(`
      ALTER TABLE videos 
      ADD COLUMN thumbnail_path VARCHAR(500)
    `);

    console.log("✅ Coluna thumbnail_path adicionada com sucesso!");
    
  } catch (error) {
    console.error("❌ Erro ao adicionar coluna:", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addThumbnailColumn();

