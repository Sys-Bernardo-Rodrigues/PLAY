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

  // Manter fullscreen quando sair acidentalmente
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && containerRef.current) {
        setTimeout(() => {
          if (containerRef.current && !document.fullscreenElement) {
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
  }, []);

  // Carregar e tocar vídeo quando mudar
  useEffect(() => {
    if (videos.length > 0 && videoRef.current && currentVideoIndex < videos.length) {
      const playVideo = async () => {
        try {
          // Garantir fullscreen antes de tocar
          if (!document.fullscreenElement && containerRef.current) {
            await containerRef.current.requestFullscreen();
            await new Promise(resolve => setTimeout(resolve, 300));
          }

          videoRef.current!.load();
          
          // Tentar tocar sem mutar primeiro
          try {
            await videoRef.current!.play();
          } catch (playErr) {
            // Se falhar, tentar mutado (política de autoplay)
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
        } catch (err) {
          console.error("Erro ao reproduzir vídeo:", err);
        }
      };

      playVideo();
    }
  }, [currentVideoIndex, videos]);

  const fetchPlaylistForToday = async () => {
    try {
      setLoading(true);
      setError("");

      const settingsResponse = await fetch("/api/public/player");
      const settingsData = await settingsResponse.json();

      if (!settingsResponse.ok || !settingsData.playlistId) {
        setError("Nenhuma playlist configurada para hoje");
        setLoading(false);
        return;
      }

      const playlistId = settingsData.playlistId;

      const fullSettingsResponse = await fetch("/api/public/player-settings");
      const fullSettingsData = await fullSettingsResponse.json();
      const settings = fullSettingsData.settings || { loop_playlist: true };

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
      // Se chegou ao fim, sempre fazer loop no modo quiosque
      setCurrentVideoIndex(0);
    }
  };

  const currentVideo = videos[currentVideoIndex];

  // Tela de loading
  if (loading) {
    return (
      <div ref={containerRef} className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-white text-lg">Carregando playlist...</p>
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
          <p className="text-xl mb-8">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-8 rounded-lg transition duration-200"
          >
            Tentar Novamente
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

