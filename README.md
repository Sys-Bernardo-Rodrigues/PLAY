# Play - Sistema Next.js com Login, PostgreSQL e Upload de Vídeos

Sistema completo desenvolvido com Next.js 14, TypeScript, Tailwind CSS, PostgreSQL em Docker e funcionalidade de upload de vídeos.

## 🚀 Como iniciar

### 1. Instalar dependências

```bash
npm install
```

### 2. Iniciar o banco de dados PostgreSQL

```bash
docker-compose up -d
```

### 3. Configurar variáveis de ambiente

Copie o arquivo `env.example` para `.env`:

```bash
cp env.example .env
```

Edite o arquivo `.env` e configure as variáveis, especialmente:
- `ADMIN_EMAIL` - Email do usuário admin (padrão: admin@test.com)
- `ADMIN_PASSWORD` - Senha do usuário admin (padrão: admin123)
- `NEXT_PUBLIC_ADMIN_EMAIL` - Email do usuário admin para uso no frontend (deve ser o mesmo de `ADMIN_EMAIL`)

### 4. Inicializar o banco de dados

```bash
node scripts/init-db.js
```

Isso criará as tabelas de usuários e vídeos, além de um usuário admin usando as credenciais definidas no arquivo `.env`.

### 5. Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) no navegador.

## 📁 Estrutura do Projeto

```
├── app/
│   ├── api/
│   │   ├── auth/login/        # API de login
│   │   ├── videos/            # APIs de vídeos (upload, listagem)
│   │   └── playlists/         # APIs de playlists
│   ├── dashboard/             # Página do dashboard
│   ├── upload/                # Página de upload de vídeos
│   ├── videos/                # Página de listagem de vídeos
│   ├── playlists/             # Páginas de playlists
│   ├── layout.tsx             # Layout principal
│   ├── page.tsx               # Página inicial (login)
│   └── globals.css            # Estilos globais
├── components/
│   ├── LoginForm.tsx          # Componente de formulário de login
│   └── VideoUploadForm.tsx    # Componente de upload de vídeos
├── lib/
│   ├── db.ts                  # Configuração do banco de dados
│   ├── auth.ts                # Funções de autenticação
│   ├── videos.ts              # Funções de gerenciamento de vídeos
│   └── playlists.ts           # Funções de gerenciamento de playlists
├── uploads/                   # Diretório de armazenamento de vídeos
├── scripts/
│   └── init-db.js             # Script de inicialização do banco
├── docker-compose.yml         # Configuração do Docker
└── package.json
```

## 🗄️ Banco de Dados

O PostgreSQL roda em um container Docker na porta 5432.

### Estrutura das tabelas:

**Tabela `users`:**
- `id` - SERIAL PRIMARY KEY
- `email` - VARCHAR(255) UNIQUE NOT NULL
- `password_hash` - VARCHAR(255) NOT NULL
- `created_at` - TIMESTAMP

**Tabela `videos`:**
- `id` - SERIAL PRIMARY KEY
- `user_id` - INTEGER (FK para users)
- `filename` - VARCHAR(255) NOT NULL
- `original_filename` - VARCHAR(255) NOT NULL
- `file_path` - VARCHAR(500) NOT NULL
- `file_size` - BIGINT NOT NULL
- `mime_type` - VARCHAR(100)
- `duration` - INTEGER
- `created_at` - TIMESTAMP

**Tabela `playlists`:**
- `id` - SERIAL PRIMARY KEY
- `user_id` - INTEGER (FK para users)
- `name` - VARCHAR(255) NOT NULL
- `description` - TEXT
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

**Tabela `playlist_videos`:**
- `id` - SERIAL PRIMARY KEY
- `playlist_id` - INTEGER (FK para playlists)
- `video_id` - INTEGER (FK para videos)
- `position` - INTEGER NOT NULL
- `added_at` - TIMESTAMP

## 🔐 Autenticação

O sistema usa bcrypt para hash de senhas. As senhas nunca são armazenadas em texto plano.

## 🎥 Upload de Vídeos

O sistema permite upload de vídeos com as seguintes funcionalidades:

- **Formatos suportados:** MP4, WebM, OGG, QuickTime, AVI
- **Tamanho máximo:** 100MB por arquivo
- **Armazenamento:** Arquivos salvos localmente na pasta `uploads/videos/`
- **Interface:** Página dedicada para upload com barra de progresso
- **Listagem:** Página para visualizar todos os vídeos enviados
- **Segurança:** Validação de tipo e tamanho de arquivo

### Como usar:

1. Faça login no sistema
2. Acesse o Dashboard
3. Clique em "Upload de Vídeo"
4. Selecione um arquivo de vídeo
5. Aguarde o upload completar
6. Visualize seus vídeos em "Meus Vídeos"

## 📋 Sistema de Playlists

O sistema inclui um gerenciador completo de playlists para organizar e reproduzir vídeos:

### Funcionalidades:

- **Criar Playlists:** Crie playlists personalizadas com nome e descrição
- **Adicionar Vídeos:** Adicione vídeos às suas playlists
- **Reprodução Sequencial:** Player de vídeo que reproduz automaticamente o próximo vídeo
- **Navegação:** Controles para avançar/retroceder entre vídeos
- **Gerenciamento:** Remova vídeos das playlists facilmente
- **Listagem:** Visualize todas as suas playlists e seus vídeos

### Como usar Playlists:

1. Acesse o Dashboard e clique em "Playlists"
2. Clique em "Nova Playlist" para criar uma playlist
3. Preencha o nome (obrigatório) e descrição (opcional)
4. Abra uma playlist para adicionar vídeos
5. Clique em "Adicionar Vídeo" e selecione os vídeos desejados
6. Os vídeos serão reproduzidos sequencialmente na ordem adicionada
7. Use os botões "Anterior" e "Próximo" para navegar entre vídeos

## 🛠️ Tecnologias

- **Next.js 14** - Framework React
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **PostgreSQL** - Banco de dados
- **Docker** - Containerização
- **bcryptjs** - Hash de senhas

## 📝 Funcionalidades Implementadas

- [x] Sistema de upload de vídeos
- [x] Sistema de playlists
- [x] Player de vídeo com reprodução sequencial
- [x] Sistema de autenticação com JWT (JSON Web Tokens)
- [x] Middleware de autenticação (protege todas as rotas exceto player)
- [x] Player público (acessível sem login)
- [x] Configurações de player (loop e playlists por dia da semana)
- [x] Design moderno estilo YouTube (roxo, branco, preto)
- [x] Header e Sidebar fixos
- [x] Permitir vídeos duplicados na playlist
- [x] Exibir nome dos vídeos corretamente
- [x] Exclusão de vídeos (com validação de playlists)
- [x] Edição de informações de playlists
- [x] Modo quiosque no player (tela cheia sem controles)
- [x] Script systemd para serviço no Raspberry Pi
- [x] Script para auto-start do player em modo quiosque
- [x] Sistema JWT completo para autenticação
- [x] Thumbnails para vídeos
- [x] Reordenação de vídeos na playlist (drag & drop)


## 🔄 Reinicialização do Sistema

O sistema inclui uma funcionalidade para reiniciar o Raspberry Pi diretamente pela interface web.

### Configuração de Permissões

Para que a reinicialização funcione, o processo Next.js precisa ter permissões para executar o comando `reboot`. Existem algumas opções:

#### Opção 1: Adicionar usuário ao grupo sudo (Recomendado)

```bash
# Adicionar o usuário que executa o Next.js ao grupo sudo
sudo usermod -aG sudo $USER

# Permitir que o grupo sudo execute reboot sem senha
echo "%sudo ALL=(ALL) NOPASSWD: /sbin/reboot" | sudo tee /etc/sudoers.d/reboot
```

#### Opção 2: Configurar sudoers para o usuário específico

```bash
# Editar sudoers
sudo visudo

# Adicionar a linha (substitua 'seu-usuario' pelo usuário que executa o Next.js):
seu-usuario ALL=(ALL) NOPASSWD: /sbin/reboot
```

#### Opção 3: Executar Next.js como root (Não recomendado para produção)

⚠️ **Atenção**: Executar como root não é recomendado por questões de segurança.

### Como Usar

1. Acesse a página de **Configurações** no sistema
2. Role até a seção **"Sistema"**
3. Clique no botão **"🔄 Reiniciar Sistema"**
4. Confirme a ação no modal de confirmação
5. O sistema será reiniciado em alguns segundos

### Notas Importantes

- ⚠️ A reinicialização desconectará todos os usuários conectados
- ⚠️ O sistema ficará offline por alguns minutos durante o reinício
- ⚠️ Certifique-se de salvar qualquer trabalho antes de reiniciar
- ✅ A funcionalidade só está disponível em sistemas Linux (Raspberry Pi)

## 🖥️ Instalação no Raspberry Pi Model B 4 (64-bit)

### Pré-requisitos

1. **Raspberry Pi OS 64-bit** instalado e atualizado
2. **Node.js 20.x** ou superior instalado
3. **Docker** e **Docker Compose** instalados
4. **PostgreSQL** rodando via Docker

### Passo 1: Preparar o ambiente

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20.x (se não estiver instalado)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs

# Verificar instalação
node --version
npm --version
```

### Passo 2: Instalar o serviço PLAY

```bash
# Navegar para o diretório do projeto
cd ~/PLAY  # ou o caminho onde você clonou o projeto

# Instalar dependências
npm install

# Fazer build do projeto
npm run build

# Instalar o serviço systemd
sudo bash scripts/install-service.sh
```

O script `install-service.sh` irá:
- ✅ Detectar automaticamente o usuário atual
- ✅ Encontrar os caminhos corretos do Node.js e npm
- ✅ Configurar o serviço systemd corretamente
- ✅ Habilitar o serviço para iniciar automaticamente

### Passo 3: Configurar modo quiosque

```bash
# Configurar autostart do kiosk
sudo bash scripts/kiosk-setup.sh
```

O script `kiosk-setup.sh` irá:
- ✅ Detectar automaticamente o usuário atual
- ✅ Detectar qual navegador Chromium está disponível
- ✅ Instalar dependências necessárias (unclutter, xdotool)
- ✅ Configurar múltiplos métodos de autostart (LXDE, XFCE, etc.)
- ✅ Criar script de inicialização otimizado

### Passo 4: Verificar e corrigir problemas

Se houver problemas, execute o script de correção:

```bash
# Corrigir problemas comuns
sudo bash scripts/fix-kiosk.sh
```

Este script irá:
- ✅ Verificar e corrigir permissões
- ✅ Verificar se o serviço PLAY está rodando
- ✅ Verificar se o servidor está respondendo
- ✅ Testar abertura do kiosk

### Comandos úteis

```bash
# Gerenciar serviço PLAY
sudo systemctl start play      # Iniciar
sudo systemctl stop play       # Parar
sudo systemctl restart play    # Reiniciar
sudo systemctl status play     # Status
sudo systemctl enable play      # Habilitar no boot
sudo systemctl disable play    # Desabilitar no boot

# Ver logs
sudo journalctl -u play -f           # Logs em tempo real
sudo journalctl -u play -n 50        # Últimas 50 linhas
sudo journalctl -u play --since today # Logs de hoje

# Testar servidor
curl http://localhost:3000

# Ver processos do Chromium
ps aux | grep chromium

# Matar processos do Chromium (se travar)
pkill -f chromium
```

### Solução de Problemas

#### Serviço não inicia

```bash
# Verificar logs de erro
sudo journalctl -u play -n 100

# Verificar se Node.js está no PATH
which node
which npm

# Verificar permissões
ls -la ~/PLAY
```

#### Kiosk não abre automaticamente

```bash
# Verificar se o script existe
ls -la ~/start-kiosk.sh

# Testar manualmente
~/.start-kiosk.sh

# Verificar autostart configurado
cat ~/.config/autostart/play-kiosk.desktop
cat /etc/xdg/lxsession/LXDE-pi/autostart
```

#### Chromium não encontrado

```bash
# Instalar Chromium manualmente
sudo apt install -y chromium-browser

# Ou
sudo apt install -y chromium

# Verificar qual está instalado
which chromium-browser
which chromium
```

#### Servidor não responde

```bash
# Verificar se a porta 3000 está em uso
sudo netstat -tlnp | grep 3000

# Verificar se o Docker está rodando
sudo systemctl status docker
docker ps

# Verificar PostgreSQL
docker-compose ps
```

## 🖥️ Instalação no Raspberry Pi (Versão Antiga)

### 1. Instalar o serviço systemd

Execute o script de instalação do serviço:

```bash
sudo bash scripts/install-service.sh
```

Isso irá:
- Criar um serviço systemd para o PLAY
- Configurar o serviço para iniciar automaticamente
- Habilitar o serviço

**Comandos úteis:**
- Iniciar serviço: `sudo systemctl start play`
- Parar serviço: `sudo systemctl stop play`
- Status do serviço: `sudo systemctl status play`
- Ver logs: `sudo journalctl -u play -f`

### 2. Configurar modo quiosque

Para configurar o Raspberry Pi para iniciar automaticamente o player em modo quiosque:

```bash
sudo bash scripts/kiosk-setup.sh
```

Isso irá:
- Instalar dependências necessárias (unclutter, xdotool, chromium-browser)
- Configurar o sistema para iniciar o navegador em modo quiosque
- Ocultar o cursor após inatividade
- Desabilitar screensaver

Após executar, reinicie o Raspberry Pi:

```bash
sudo reboot
```

O sistema irá iniciar automaticamente e abrir o player em modo quiosque.

## 📋 Funcionalidades Adicionais

### Exclusão de Vídeos
- Botão de deletar em cada vídeo na página "Meus Vídeos"
- Validação para impedir exclusão de vídeos que estão em playlists
- Exclusão do arquivo físico e do banco de dados

### Edição de Playlists
- Botão "Editar" na página de detalhes da playlist
- Permite alterar nome e descrição da playlist
- Modal de edição com validação

### Modo Quiosque
- Botão "Modo Quiosque" no player público
- Entra em tela cheia automaticamente
- Esconde controles do vídeo e interface
- Pressione ESC ou clique no botão "Sair" para sair
- Suporte para auto-start no Raspberry Pi
