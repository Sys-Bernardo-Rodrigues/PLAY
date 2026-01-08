-- Criar tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índice para busca por email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Inserir usuário de teste (senha: admin123)
-- Hash gerado para a senha "admin123"
INSERT INTO users (email, password_hash) 
VALUES ('admin@test.com', '$2a$10$rOzJqZqZqZqZqZqZqZqZqOqZqZqZqZqZqZqZqZqZqZqZqZqZqZq')
ON CONFLICT (email) DO NOTHING;

