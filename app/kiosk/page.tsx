"use client";

import { useState, useEffect, useRef } from "react";

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

export default function KioskPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userExitedFullscreen, setUserExitedFullscreen] = useState(false);

  useEffect(() => {
    fetchPlaylistForToday();
  }, []);

  // Entrar em fullscreen automaticamente quando a página carregar
  useEffect(() => {
    const enterFullscreen = async () => {
      if (containerRef.current) {
        try {
          await containerRef.current.requestFullscreen();
        } catch (err) {
          console.error("Erro ao entrar em fullscreen:", err);
        }
      }
    };

    // Aguardar um pouco antes de entrar em fullscreen
    const timer = setTimeout(enterFullscreen, 500);
    return () => clearTimeout(timer);
  }, []);

  // Permitir sair do fullscreen ao pressionar qualquer tecla
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Se estiver em fullscreen, sair ao pressionar qualquer tecla
      if (document.fullscreenElement) {
        setUserExitedFullscreen(true);
        document.exitFullscreen().catch(() => {
          // Ignorar erro se não conseguir
        });
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, []);

  // Manter fullscreen quando sair acidentalmente (desabilitado quando usuário pressiona tecla)
  useEffect(() => {
    const handleFullscreenChange = () => {
      // Se saiu do fullscreen e não foi por tecla do usuário, reentrar
      if (!document.fullscreenElement && containerRef.current && !userExitedFullscreen) {
        setTimeout(() => {
          if (containerRef.current && !document.fullscreenElement && !userExitedFullscreen) {
            containerRef.current.requestFullscreen().catch(() => {
              // Ignorar erro se não conseguir
            });
          }
        }, 100);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [userExitedFullscreen]);

  // Carregar e tocar vídeo quando mudar
  useEffect(() => {
    if (videos.length > 0 && videoRef.current && currentVideoIndex < videos.length) {
      const playVideo = async () => {
        if (!videoRef.current || !currentVideo) return;
        
        try {
          // Garantir fullscreen antes de tocar
          if (!document.fullscreenElement && containerRef.current) {
            try {
              await containerRef.current.requestFullscreen();
              await new Promise(resolve => setTimeout(resolve, 500));
            } catch (fsErr) {
              console.warn("Erro ao entrar em fullscreen:", fsErr);
            }
          }

          // Recarregar o vídeo
          videoRef.current.load();
          
          // Aguardar o vídeo estar pronto
          await new Promise((resolve) => {
            const onCanPlay = () => {
              videoRef.current?.removeEventListener("canplay", onCanPlay);
              resolve(true);
            };
            videoRef.current?.addEventListener("canplay", onCanPlay);
            // Timeout de segurança
            setTimeout(() => {
              videoRef.current?.removeEventListener("canplay", onCanPlay);
              resolve(false);
            }, 10000);
          });
          
          // Tentar tocar sem mutar primeiro
          if (videoRef.current) {
            try {
              const playPromise = videoRef.current.play();
              if (playPromise !== undefined) {
                await playPromise;
                console.log("Vídeo reproduzindo sem mutar");
              }
            } catch (playErr: any) {
              console.warn("Erro ao reproduzir sem mutar, tentando mutado:", playErr);
              // Se falhar, tentar mutado (política de autoplay)
              if (videoRef.current) {
                videoRef.current.muted = true;
                const playMutedPromise = videoRef.current.play();
                if (playMutedPromise !== undefined) {
                  await playMutedPromise;
                  console.log("Vídeo reproduzindo mutado");
                  setTimeout(() => {
                    if (videoRef.current) {
                      videoRef.current.muted = false;
                      console.log("Som restaurado");
                    }
                  }, 2000);
                }
              }
            }
          }
        } catch (err) {
          console.error("Erro ao reproduzir vídeo:", err);
        }
      };

      // Aguardar um pouco para garantir que o elemento está renderizado
      setTimeout(() => {
        playVideo();
      }, 100);
    }
  }, [currentVideoIndex, videos]);

  const fetchPlaylistForToday = async (retryCount = 0) => {
    const MAX_RETRIES = 10;
    
    try {
      setLoading(true);
      setError("");

      // Aguardar um pouco se for retry (servidor pode ainda estar iniciando)
      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      const settingsResponse = await fetch("/api/public/player", {
        cache: "no-store",
      });
      
      if (!settingsResponse.ok) {
        throw new Error(`Erro HTTP: ${settingsResponse.status}`);
      }
      
      const settingsData = await settingsResponse.json();

      if (!settingsData.playlistId) {
        const errorMsg = settingsData.error || "Nenhuma playlist configurada para hoje";
        if (retryCount < MAX_RETRIES) {
          console.log(`Tentativa ${retryCount + 1}/${MAX_RETRIES} - ${errorMsg}, tentando novamente...`);
          setTimeout(() => fetchPlaylistForToday(retryCount + 1), 3000);
          return;
        }
        setError(errorMsg + (settingsData.debug ? ` (Debug: ${settingsData.debug.dayName})` : ""));
        setLoading(false);
        return;
      }

      const playlistId = settingsData.playlistId;

      const fullSettingsResponse = await fetch("/api/public/player-settings", {
        cache: "no-store",
      });
      const fullSettingsData = await fullSettingsResponse.json();
      const settings = fullSettingsData.settings || { loop_playlist: true };

      const playlistResponse = await fetch(`/api/public/playlists/${playlistId}`, {
        cache: "no-store",
      });
      
      if (!playlistResponse.ok) {
        throw new Error(`Erro ao carregar playlist: ${playlistResponse.status}`);
      }
      
      const playlistData = await playlistResponse.json();

      if (playlistData.videos && playlistData.videos.length === 0) {
        setError("A playlist está vazia");
        setLoading(false);
        return;
      }

      if (!playlistData.videos || playlistData.videos.length === 0) {
        if (retryCount < MAX_RETRIES) {
          console.log(`Tentativa ${retryCount + 1}/${MAX_RETRIES} - Playlist vazia ou não carregada, tentando novamente...`);
          setTimeout(() => fetchPlaylistForToday(retryCount + 1), 3000);
          return;
        }
        setError("A playlist está vazia ou não foi carregada");
        setLoading(false);
        return;
      }

      setPlaylist(playlistData.playlist);
      setVideos(playlistData.videos);
      setCurrentVideoIndex(0);
      setLoading(false);
    } catch (err: any) {
      console.error("Erro ao carregar playlist:", err);
      if (retryCount < MAX_RETRIES) {
        console.log(`Tentativa ${retryCount + 1}/${MAX_RETRIES} - Erro ao conectar, tentando novamente...`);
        setTimeout(() => fetchPlaylistForToday(retryCount + 1), 3000);
      } else {
        setError(`Erro ao conectar com o servidor: ${err.message || "Servidor não está respondendo"}`);
        setLoading(false);
      }
    }
  };

  const handleVideoEnd = () => {
    if (currentVideoIndex < videos.length - 1) {
      // Próximo vídeo na playlist
      setCurrentVideoIndex(currentVideoIndex + 1);
    } else {
      // Se chegou ao fim, sempre fazer loop no modo quiosque
      setCurrentVideoIndex(0);
    }
  };

  // Auto-reload em caso de erro após um tempo
  useEffect(() => {
    if (error && !loading) {
      const timer = setTimeout(() => {
        setLoading(true);
        setError("");
        fetchPlaylistForToday(0);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [error, loading]);

  const currentVideo = videos[currentVideoIndex];

  // Tela de loading
  if (loading) {
    return (
      <div ref={containerRef} className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-white text-lg">Carregando playlist...</p>
          <p className="text-gray-400 text-sm mt-2">Aguarde enquanto o servidor inicia</p>
        </div>
      </div>
    );
  }

  // Tela de erro
  if (error) {
    return (
      <div ref={containerRef} className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center text-white max-w-2xl px-8">
          <h1 className="text-3xl font-bold mb-4 text-red-400">Erro</h1>
          <p className="text-xl mb-4">{error}</p>
          <p className="text-sm text-gray-400 mb-8">
            A página irá tentar recarregar automaticamente em 10 segundos...
          </p>
          <button
            onClick={() => {
              setLoading(true);
              setError("");
              fetchPlaylistForToday();
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-8 rounded-lg transition duration-200"
          >
            Tentar Novamente Agora
          </button>
        </div>
      </div>
    );
  }

  // Player em fullscreen
  return (
    <div ref={containerRef} className="fixed inset-0 bg-black">
      {currentVideo && (
        <video
          ref={videoRef}
          key={`kiosk-${currentVideo.id}-${currentVideoIndex}`}
          autoPlay
          playsInline
          muted={false}
          controls={false}
          className="w-full h-full object-contain"
          onEnded={handleVideoEnd}
          onError={(e) => {
            console.error("Erro no vídeo:", e);
            // Se houver erro, tentar próximo vídeo
            if (currentVideoIndex < videos.length - 1) {
              setTimeout(() => setCurrentVideoIndex(currentVideoIndex + 1), 1000);
            } else {
              setTimeout(() => setCurrentVideoIndex(0), 1000);
            }
          }}
          onCanPlay={() => {
            // Garantir que o vídeo toque quando estiver pronto
            if (videoRef.current && videoRef.current.paused) {
              videoRef.current.play().catch((err) => {
                console.error("Erro ao reproduzir:", err);
                // Tentar mutado se falhar
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
              });
            }
          }}
        >
          <source
            src={`/api/videos/${currentVideo.video?.id || currentVideo.video_id}`}
            type={currentVideo.video?.mime_type || "video/mp4"}
          />
          Seu navegador não suporta o elemento de vídeo.
        </video>
      )}
    </div>
  );
}

