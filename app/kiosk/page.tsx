"use client";

import { useState, useEffect, useRef, useCallback } from "react";

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

export default function KioskPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userExitedFullscreen, setUserExitedFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Refs para evitar loops e controlar timers
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const videoLoadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fullscreenRetryRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingRef = useRef(false);

  // Função para buscar playlist - usando useCallback para evitar recriações
  const fetchPlaylistForToday = useCallback(async (retryCount = 0) => {
    // Prevenir múltiplas chamadas simultâneas
    if (isFetchingRef.current && retryCount === 0) {
      return;
    }

    const MAX_RETRIES = 10;
    
    try {
      isFetchingRef.current = true;
      setLoading(true);
      setError("");

      // Limpar timeout anterior se existir
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      // Aguardar um pouco se for retry
      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Criar AbortController para timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const settingsResponse = await fetch("/api/public/player", {
        cache: "no-store",
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!settingsResponse.ok) {
        throw new Error(`Erro HTTP: ${settingsResponse.status}`);
      }
      
      const settingsData = await settingsResponse.json();

      if (!settingsData.playlistId) {
        const errorMsg = settingsData.error || "Nenhuma playlist configurada para hoje";
        if (retryCount < MAX_RETRIES) {
          console.log(`Tentativa ${retryCount + 1}/${MAX_RETRIES} - ${errorMsg}`);
          retryTimeoutRef.current = setTimeout(() => {
            fetchPlaylistForToday(retryCount + 1);
          }, 3000);
          return;
        }
        setError(errorMsg + (settingsData.debug ? ` (${settingsData.debug.dayName})` : ""));
        setLoading(false);
        isFetchingRef.current = false;
        return;
      }

      const playlistId = settingsData.playlistId;

      // Buscar settings e playlist em paralelo
      const controller1 = new AbortController();
      const controller2 = new AbortController();
      const timeoutId1 = setTimeout(() => controller1.abort(), 10000);
      const timeoutId2 = setTimeout(() => controller2.abort(), 10000);
      
      const [fullSettingsResponse, playlistResponse] = await Promise.all([
        fetch("/api/public/player-settings", {
          cache: "no-store",
          signal: controller1.signal,
        }),
        fetch(`/api/public/playlists/${playlistId}`, {
          cache: "no-store",
          signal: controller2.signal,
        }),
      ]);
      
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      
      if (!playlistResponse.ok) {
        throw new Error(`Erro ao carregar playlist: ${playlistResponse.status}`);
      }
      
      const playlistData = await playlistResponse.json();

      if (!playlistData.videos || playlistData.videos.length === 0) {
        if (retryCount < MAX_RETRIES) {
          console.log(`Tentativa ${retryCount + 1}/${MAX_RETRIES} - Playlist vazia`);
          retryTimeoutRef.current = setTimeout(() => {
            fetchPlaylistForToday(retryCount + 1);
          }, 3000);
          return;
        }
        setError("A playlist está vazia");
        setLoading(false);
        isFetchingRef.current = false;
        return;
      }

      setPlaylist(playlistData.playlist);
      setVideos(playlistData.videos);
      setCurrentVideoIndex(0);
      setLoading(false);
      isFetchingRef.current = false;
    } catch (err: any) {
      console.error("Erro ao carregar playlist:", err);
      if (err.name === 'AbortError') {
        console.log("Timeout na requisição");
      }
      
      if (retryCount < MAX_RETRIES && !err.name?.includes('Abort')) {
        console.log(`Tentativa ${retryCount + 1}/${MAX_RETRIES} - Tentando novamente...`);
        retryTimeoutRef.current = setTimeout(() => {
          fetchPlaylistForToday(retryCount + 1);
        }, 3000);
      } else {
        setError(`Erro ao conectar: ${err.message || "Servidor não está respondendo"}`);
        setLoading(false);
        isFetchingRef.current = false;
      }
    }
  }, []);

  // Carregar playlist na montagem
  useEffect(() => {
    fetchPlaylistForToday();

    // Cleanup
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      isFetchingRef.current = false;
    };
  }, [fetchPlaylistForToday]);

  // Entrar em fullscreen automaticamente
  useEffect(() => {
    if (userExitedFullscreen) return;

    const enterFullscreen = async () => {
      if (containerRef.current && !document.fullscreenElement) {
        try {
          await containerRef.current.requestFullscreen();
        } catch (err) {
          console.warn("Erro ao entrar em fullscreen:", err);
        }
      }
    };

    const timer = setTimeout(enterFullscreen, 1000);
    return () => clearTimeout(timer);
  }, [userExitedFullscreen]);

  // Listener de teclado para sair do fullscreen
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (document.fullscreenElement) {
        setUserExitedFullscreen(true);
        document.exitFullscreen().catch(() => {});
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, []);

  // Manter fullscreen (apenas se usuário não saiu intencionalmente)
  useEffect(() => {
    if (userExitedFullscreen) return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && containerRef.current && !userExitedFullscreen) {
        // Limpar timeout anterior
        if (fullscreenRetryRef.current) {
          clearTimeout(fullscreenRetryRef.current);
        }
        
        fullscreenRetryRef.current = setTimeout(() => {
          if (containerRef.current && !document.fullscreenElement && !userExitedFullscreen) {
            containerRef.current.requestFullscreen().catch(() => {});
          }
        }, 500);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (fullscreenRetryRef.current) {
        clearTimeout(fullscreenRetryRef.current);
      }
    };
  }, [userExitedFullscreen]);

  // Handler para fim do vídeo
  const handleVideoEnd = useCallback(() => {
    if (videos.length === 0) return;
    
    if (currentVideoIndex < videos.length - 1) {
      setCurrentVideoIndex(prev => prev + 1);
    } else {
      setCurrentVideoIndex(0); // Loop
    }
  }, [currentVideoIndex, videos.length]);

  // Carregar e reproduzir vídeo quando mudar
  useEffect(() => {
    if (!videos.length || !videoRef.current || currentVideoIndex >= videos.length) {
      return;
    }

    const currentVideo = videos[currentVideoIndex];
    if (!currentVideo) return;

    // Limpar timeout anterior
    if (videoLoadTimeoutRef.current) {
      clearTimeout(videoLoadTimeoutRef.current);
    }

    const playVideo = async () => {
      if (!videoRef.current || !currentVideo) return;

      try {
        // Garantir fullscreen se usuário não saiu
        if (!document.fullscreenElement && containerRef.current && !userExitedFullscreen) {
          try {
            await containerRef.current.requestFullscreen();
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (fsErr) {
            console.warn("Erro ao entrar em fullscreen:", fsErr);
          }
        }

        // Limpar evento anterior se existir
        const video = videoRef.current;
        video.load();

        // Aguardar vídeo estar pronto com timeout
        const playWhenReady = () => {
          if (!video) return;

          const tryPlay = async () => {
            try {
              video.muted = false;
              await video.play();
              setIsPlaying(true);
              console.log("Vídeo reproduzindo");
            } catch (playErr: any) {
              // Tentar mutado se falhar
              try {
                video.muted = true;
                await video.play();
                setIsPlaying(true);
                console.log("Vídeo reproduzindo (mutado)");
                
                setTimeout(() => {
                  if (video) {
                    video.muted = false;
                  }
                }, 2000);
              } catch (mutedErr) {
                console.error("Erro ao reproduzir vídeo:", mutedErr);
                setIsPlaying(false);
              }
            }
          };

          tryPlay();
        };

        const onCanPlay = () => {
          video.removeEventListener("canplay", onCanPlay);
          playWhenReady();
        };

        video.addEventListener("canplay", onCanPlay, { once: true });

        // Timeout de segurança
        const timeout = setTimeout(() => {
          video.removeEventListener("canplay", onCanPlay);
          playWhenReady(); // Tentar mesmo assim
        }, 15000);

        // Limpar timeout quando vídeo carregar
        video.addEventListener("canplay", () => clearTimeout(timeout), { once: true });

      } catch (err) {
        console.error("Erro ao reproduzir vídeo:", err);
        setIsPlaying(false);
      }
    };

    videoLoadTimeoutRef.current = setTimeout(() => {
      playVideo();
    }, 200);

    // Cleanup
    return () => {
      if (videoLoadTimeoutRef.current) {
        clearTimeout(videoLoadTimeoutRef.current);
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.load(); // Reset
      }
    };
  }, [currentVideoIndex, videos, userExitedFullscreen]);

  // Auto-reload em caso de erro (com debounce)
  useEffect(() => {
    if (!error || loading) return;

    const timer = setTimeout(() => {
      if (error && !loading && !isFetchingRef.current) {
        setLoading(true);
        setError("");
        fetchPlaylistForToday(0);
      }
    }, 15000); // 15 segundos ao invés de 10

    return () => clearTimeout(timer);
  }, [error, loading, fetchPlaylistForToday]);

  // Cleanup geral ao desmontar
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      if (videoLoadTimeoutRef.current) clearTimeout(videoLoadTimeoutRef.current);
      if (fullscreenRetryRef.current) clearTimeout(fullscreenRetryRef.current);
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = "";
      }
    };
  }, []);

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
            A página irá tentar recarregar automaticamente em alguns segundos...
          </p>
          <button
            onClick={() => {
              setLoading(true);
              setError("");
              fetchPlaylistForToday(0);
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
  if (!currentVideo) {
    return (
      <div ref={containerRef} className="fixed inset-0 bg-black flex items-center justify-center">
        <p className="text-white text-xl">Nenhum vídeo disponível</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="fixed inset-0 bg-black">
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
          setIsPlaying(false);
          // Tentar próximo vídeo após 1 segundo
          setTimeout(() => {
            if (currentVideoIndex < videos.length - 1) {
              setCurrentVideoIndex(prev => prev + 1);
            } else {
              setCurrentVideoIndex(0);
            }
          }, 1000);
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      >
        <source
          src={`/api/videos/${currentVideo.video?.id || currentVideo.video_id}`}
          type={currentVideo.video?.mime_type || "video/mp4"}
        />
        Seu navegador não suporta o elemento de vídeo.
      </video>
      
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white text-lg">Carregando vídeo...</p>
          </div>
        </div>
      )}
    </div>
  );
}
