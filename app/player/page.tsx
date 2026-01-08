"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface Video {
  id: number;
  playlist_id: number;
  video_id: number;
  position: number;
  added_at: string;
  video: {
    id: number;
    filename: string;
    original_filename: string;
    file_path: string;
    file_size: number;
    mime_type: string | null;
    created_at: string;
  };
}

interface Playlist {
  id: number;
  name: string;
  description: string | null;
}

interface PlayerSettings {
  loop_playlist: boolean;
}

const DAYS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export default function PlayerPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<PlayerSettings | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isKioskMode, setIsKioskMode] = useState(false);

  useEffect(() => {
    fetchPlaylistForToday();
    
    // Verificar se deve entrar em modo quiosque automaticamente
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("kiosk") === "true") {
      setTimeout(() => {
        enterKioskMode();
      }, 2000); // Aguardar um pouco mais para garantir que os vídeos estejam carregados
    }
  }, []);

  useEffect(() => {
    if (videos.length > 0 && videoRef.current && currentVideoIndex < videos.length) {
      videoRef.current.load();
      const playVideo = async () => {
        try {
          // Se estiver em modo quiosque, garantir fullscreen antes de tocar
          if (isKioskMode) {
            // Aguardar um pouco para o vídeo começar a carregar
            await new Promise(resolve => setTimeout(resolve, 100));
            
            if (!document.fullscreenElement && videoRef.current) {
              try {
                await videoRef.current.requestFullscreen();
                // Aguardar fullscreen ser aplicado
                await new Promise(resolve => setTimeout(resolve, 300));
              } catch (fsErr) {
                console.error("Erro ao entrar em fullscreen:", fsErr);
              }
            }
          }
          
          await videoRef.current!.play();
        } catch (err) {
          console.error("Erro ao reproduzir vídeo:", err);
          // Se falhar, tentar mutado (política de autoplay)
          if (videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current.play().then(() => {
              setTimeout(() => {
                if (videoRef.current) {
                  videoRef.current.muted = false;
                }
              }, 1000);
            }).catch(console.error);
          }
        }
      };
      playVideo();
    }
  }, [currentVideoIndex, videos, isKioskMode]);

  // Efeito específico para modo quiosque - garantir que o vídeo toque e mantenha fullscreen
  useEffect(() => {
    if (isKioskMode && videoRef.current && videos.length > 0) {
      const ensureFullscreenAndPlay = async () => {
        try {
          // Garantir que está em fullscreen
          if (!document.fullscreenElement && videoRef.current) {
            await videoRef.current.requestFullscreen();
          }
          
          // Aguardar um pouco para o fullscreen ser aplicado
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Garantir que o vídeo toque
          if (videoRef.current && videoRef.current.paused) {
            try {
              await videoRef.current.play();
            } catch (playErr) {
              // Se falhar, tentar mutado
              if (videoRef.current) {
                videoRef.current.muted = true;
                await videoRef.current.play();
                setTimeout(() => {
                  if (videoRef.current) {
                    videoRef.current.muted = false;
                  }
                }, 1000);
              }
            }
          }
        } catch (err) {
          console.error("Erro ao manter fullscreen:", err);
        }
      };
      
      // Aguardar um pouco para garantir que o vídeo esteja pronto
      setTimeout(ensureFullscreenAndPlay, 300);
    }
  }, [isKioskMode, currentVideoIndex, videos]);

  const fetchPlaylistForToday = async () => {
    try {
      setLoading(true);
      setError("");

      const settingsResponse = await fetch("/api/public/player");
      const settingsData = await settingsResponse.json();

      if (!settingsResponse.ok || !settingsData.playlistId) {
        let errorMsg = settingsData.error || "Nenhuma playlist configurada para hoje";
        
        if (settingsData.debug) {
          errorMsg += `\n\nHoje é ${settingsData.debug.dayName} (dia ${settingsData.debug.dayOfWeek})`;
          errorMsg += `\nHora do servidor: ${settingsData.debug.localTime}`;
          
          if (settingsData.debug.settings) {
            const dayKey = settingsData.debug.dayName.toLowerCase().split("-")[0];
            const playlistId = settingsData.debug.settings[dayKey];
            if (playlistId) {
              errorMsg += `\n\n⚠️ Há uma playlist configurada (ID: ${playlistId}), mas não está sendo detectada.`;
            } else {
              errorMsg += `\n\nNenhuma playlist está configurada para ${settingsData.debug.dayName}.`;
            }
          }
        }
        
        setError(errorMsg);
        setLoading(false);
        return;
      }

      const playlistId = settingsData.playlistId;

      const fullSettingsResponse = await fetch("/api/public/player-settings");
      const fullSettingsData = await fullSettingsResponse.json();
      if (fullSettingsResponse.ok && fullSettingsData.settings) {
        setSettings(fullSettingsData.settings);
      }

      const playlistResponse = await fetch(`/api/public/playlists/${playlistId}`);
      const playlistData = await playlistResponse.json();

      if (playlistResponse.ok) {
        setPlaylist(playlistData.playlist);
        
        if (playlistData.videos.length === 0) {
          setError("A playlist está vazia");
        } else {
          setVideos(playlistData.videos);
          setCurrentVideoIndex(0);
        }
      } else {
        setError(playlistData.error || "Erro ao carregar playlist");
      }
    } catch (err) {
      setError("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleVideoEnd = () => {
    if (currentVideoIndex < videos.length - 1) {
      // Próximo vídeo na playlist
      setCurrentVideoIndex(currentVideoIndex + 1);
    } else {
      // Se chegou ao fim da playlist
      if (settings?.loop_playlist || isKioskMode) {
        // Se loop está ativado OU está em modo quiosque, voltar para o primeiro vídeo
        // No modo quiosque, sempre fazer loop
        setCurrentVideoIndex(0);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 0);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
    }
  };

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getCurrentDay = (): string => {
    const today = new Date().getDay();
    return DAYS[today] || "Desconhecido";
  };

  const enterKioskMode = async () => {
    setIsKioskMode(true);
    // Aguardar um pouco para o estado atualizar
    setTimeout(async () => {
      if (videoRef.current) {
        try {
          // Entrar em tela cheia
          await videoRef.current.requestFullscreen();
          // Garantir que o vídeo toque
          // Tentar primeiro sem mutar
          try {
            await videoRef.current.play();
          } catch (playErr) {
            // Se falhar, mutar temporariamente
            console.log("Tentando com muted para garantir autoplay...");
            videoRef.current.muted = true;
            await videoRef.current.play();
            // Desmutar após iniciar
            setTimeout(() => {
              if (videoRef.current) {
                videoRef.current.muted = false;
              }
            }, 1000);
          }
        } catch (err) {
          console.error("Erro ao entrar em modo quiosque:", err);
        }
      }
    }, 100);
  };

  const exitKioskMode = () => {
    setIsKioskMode(false);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch((err) => {
        console.error("Erro ao sair de tela cheia:", err);
      });
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      // No modo quiosque, sempre manter fullscreen
      if (isKioskMode && !document.fullscreenElement) {
        // Tentar reentrar em fullscreen imediatamente se sair
        setTimeout(() => {
          if (videoRef.current && isKioskMode && !document.fullscreenElement) {
            videoRef.current.requestFullscreen().catch((err) => {
              console.error("Erro ao reentrar em fullscreen:", err);
            });
          }
        }, 100);
      }
    };

    // Desabilitar todas as teclas no modo quiosque
    const handleKeyPress = (e: KeyboardEvent) => {
      if (isKioskMode) {
        // Bloquear todas as teclas no modo quiosque
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("keydown", handleKeyPress, true); // Use capture phase

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("keydown", handleKeyPress, true);
    };
  }, [isKioskMode]);

  const currentVideo = videos[currentVideoIndex];

  return (
    <main className={`min-h-screen bg-[#0f0f0f] text-white ${isKioskMode ? "fixed inset-0 z-50" : ""}`}>
      {/* Header */}
      {!isKioskMode && (
        <header className="bg-[#212121] border-b border-gray-800 px-6 py-4 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-white font-bold text-xl">PLAY</span>
              </Link>
              <div className="h-6 w-px bg-gray-700"></div>
              <div>
                <h1 className="text-lg font-semibold text-white">Player Automático</h1>
                <p className="text-sm text-gray-400">
                  {getCurrentDay()} - {playlist?.name || "Carregando..."}
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={enterKioskMode}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-lg transition duration-200 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                Modo Quiosque
              </button>
              <Link
                href="/"
                className="text-gray-400 hover:text-white transition-colors text-sm px-4 py-2 rounded-lg hover:bg-gray-800"
              >
                Login
              </Link>
              <Link
                href="/dashboard"
                className="text-gray-400 hover:text-white transition-colors text-sm px-4 py-2 rounded-lg hover:bg-gray-800"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </header>
      )}

      {/* Botão de sair removido no modo quiosque - tela limpa */}

      {/* Modo Quiosque - Vídeo em Tela Cheia SEM controles */}
      {isKioskMode && videos.length > 0 && currentVideo && (
        <div className="fixed inset-0 bg-black z-40 flex items-center justify-center">
          <video
            ref={videoRef}
            key={`kiosk-${currentVideo.id}`}
            autoPlay
            playsInline
            muted={false}
            controls={false}
            className="w-full h-full object-contain"
            onEnded={handleVideoEnd}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={handlePlay}
            onPause={handlePause}
            onCanPlay={() => {
              // Garantir que o vídeo toque quando estiver pronto
              if (videoRef.current) {
                const playPromise = videoRef.current.play();
                if (playPromise !== undefined) {
                  playPromise.catch((err) => {
                    console.error("Erro ao reproduzir:", err);
                    // Se falhar, tentar mutado primeiro (política de autoplay)
                    if (videoRef.current) {
                      videoRef.current.muted = true;
                      videoRef.current.play().then(() => {
                        // Desmutar após 1 segundo
                        setTimeout(() => {
                          if (videoRef.current) {
                            videoRef.current.muted = false;
                          }
                        }, 1000);
                      }).catch(console.error);
                    }
                  });
                }
              }
            }}
          >
            <source
              src={`/api/videos/${currentVideo.video?.id || currentVideo.video_id}`}
              type={currentVideo.video?.mime_type || "video/mp4"}
            />
            Seu navegador não suporta o elemento de vídeo.
          </video>
        </div>
      )}

      <div className={`${isKioskMode ? "hidden" : "max-w-7xl mx-auto px-6 py-8"}`}>
        {loading && (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-400">Carregando playlist...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-200 px-6 py-4 rounded-lg mb-6 whitespace-pre-line">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold mb-1">Erro ao carregar playlist</h3>
                <p className="text-sm">{error}</p>
                {error.includes("Nenhuma playlist") && (
                  <Link
                    href="/settings"
                    className="text-red-300 hover:text-red-100 underline mt-2 inline-block"
                  >
                    Configure uma playlist para hoje →
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {!loading && !error && videos.length > 0 && (
          <div className="space-y-6">
            {/* Player de Vídeo */}
            <div className="bg-[#212121] rounded-xl overflow-hidden">
              <div className="aspect-video bg-black">
                {!isKioskMode && (
                  <video
                    ref={videoRef}
                    key={`normal-${currentVideo?.id}`}
                    controls
                    autoPlay
                    className="w-full h-full"
                    onEnded={handleVideoEnd}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onPlay={handlePlay}
                    onPause={handlePause}
                  >
                    <source
                      src={`/api/videos/${currentVideo?.video?.id || currentVideo?.video_id}`}
                      type={currentVideo?.video?.mime_type || "video/mp4"}
                    />
                    Seu navegador não suporta o elemento de vídeo.
                  </video>
                )}
              </div>

              {/* Informações do Vídeo */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold mb-2 text-white">
                      {currentVideo?.video?.original_filename || "Carregando..."}
                    </h2>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span>
                        {currentVideoIndex + 1} de {videos.length}
                      </span>
                      {settings?.loop_playlist && (
                        <span className="bg-purple-600 text-white px-2 py-1 rounded text-xs">
                          🔁 Loop Ativado
                        </span>
                      )}
                      {duration > 0 && (
                        <span>
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Barra de Progresso */}
                {duration > 0 && (
                  <div className="w-full bg-gray-700 rounded-full h-1.5 mb-4">
                    <div
                      className="bg-purple-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${(currentTime / duration) * 100}%` }}
                    ></div>
                  </div>
                )}

                {/* Informações da Playlist */}
                {playlist && (
                  <div className="border-t border-gray-800 pt-4 mt-4">
                    <p className="text-sm text-gray-400">
                      <span className="font-semibold text-gray-300">Playlist:</span>{" "}
                      {playlist.name}
                    </p>
                    {playlist.description && (
                      <p className="text-sm text-gray-500 mt-1">{playlist.description}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Lista de Vídeos */}
            <div className="bg-[#212121] rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 text-white">
                Próximos Vídeos ({videos.length - currentVideoIndex - 1} restantes)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 max-h-64 overflow-y-auto scrollbar-hide">
                {videos.slice(currentVideoIndex + 1).map((video) => (
                  <div
                    key={video.id}
                    className="bg-[#0f0f0f] rounded-lg overflow-hidden hover:bg-[#181818] transition-colors cursor-pointer"
                    onClick={() => {
                      const index = videos.findIndex((v) => v.id === video.id);
                      if (index !== -1) setCurrentVideoIndex(index);
                    }}
                  >
                    <div className="aspect-video bg-gray-800 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="p-2">
                      <p className="text-xs text-gray-300 truncate" title={video.video?.original_filename}>
                        {video.video?.original_filename || "Sem nome"}
                      </p>
                    </div>
                  </div>
                ))}
                {videos.length - currentVideoIndex - 1 === 0 && settings?.loop_playlist && (
                  <div className="col-span-full text-center text-gray-400 text-sm py-4">
                    🔁 A playlist será repetida automaticamente
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
