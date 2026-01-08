"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableVideoItem } from "@/components/SortableVideoItem";

interface Playlist {
  id: number;
  name: string;
  description: string | null;
  video_count: number;
}

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

export default function PlaylistDetailPage() {
  const params = useParams();
  const playlistId = params.id as string;
  const videoRef = useRef<HTMLVideoElement>(null);

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddVideoModal, setShowAddVideoModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [availableVideos, setAvailableVideos] = useState<any[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [loopPlaylist, setLoopPlaylist] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const userEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@test.com";

  // Configurar sensores para drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (playlistId) {
      fetchPlaylist();
      fetchPlaylistVideos();
      fetchPlayerSettings();
    }
  }, [playlistId]);

  const fetchPlayerSettings = async () => {
    try {
      const response = await fetch(`/api/player-settings?email=${userEmail}`);
      const data = await response.json();
      if (response.ok && data.settings) {
        setLoopPlaylist(data.settings.loop_playlist || false);
      }
    } catch (err) {
      console.error("Erro ao buscar configurações:", err);
    }
  };

  useEffect(() => {
    if (videos.length > 0 && videoRef.current && currentVideoIndex < videos.length) {
      videoRef.current.load();
    }
  }, [currentVideoIndex, videos]);

  const fetchPlaylist = async () => {
    try {
      const response = await fetch(
        `/api/playlists/${playlistId}?email=${userEmail}`
      );
      const data = await response.json();

      if (response.ok) {
        setPlaylist(data.playlist);
        setEditName(data.playlist.name);
        setEditDescription(data.playlist.description || "");
      } else {
        setError(data.error || "Erro ao carregar playlist");
      }
    } catch (err) {
      setError("Erro ao conectar com o servidor");
    }
  };

  const handleEditPlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      setError("Nome da playlist é obrigatório");
      return;
    }

    try {
      const response = await fetch(`/api/playlists/${playlistId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userEmail,
          name: editName,
          description: editDescription || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowEditModal(false);
        setError("");
        fetchPlaylist();
      } else {
        setError(data.error || "Erro ao atualizar playlist");
      }
    } catch (err) {
      setError("Erro ao conectar com o servidor");
    }
  };

  const fetchPlaylistVideos = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/playlists/${playlistId}/videos?email=${userEmail}`
      );
      const data = await response.json();

      if (response.ok) {
        setVideos(data.videos);
        if (data.videos.length > 0) {
          setCurrentVideoIndex(0);
        }
      } else {
        setError(data.error || "Erro ao carregar vídeos");
      }
    } catch (err) {
      setError("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableVideos = async () => {
    try {
      setLoadingVideos(true);
      const response = await fetch(`/api/videos?email=${userEmail}`);
      const data = await response.json();

      if (response.ok) {
        setAvailableVideos(data.videos);
      }
    } catch (err) {
      console.error("Erro ao buscar vídeos disponíveis:", err);
    } finally {
      setLoadingVideos(false);
    }
  };

  const handleAddVideo = async (videoId: number) => {
    try {
      const response = await fetch(`/api/playlists/${playlistId}/videos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userEmail,
          videoId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowAddVideoModal(false);
        fetchPlaylistVideos();
        fetchPlaylist();
      } else {
        setError(data.error || "Erro ao adicionar vídeo");
      }
    } catch (err) {
      setError("Erro ao conectar com o servidor");
    }
  };

  const handleRemoveVideo = async (playlistVideoId: number) => {
    if (!confirm("Deseja remover este vídeo da playlist?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/playlists/${playlistId}/videos/${playlistVideoId}?email=${userEmail}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (response.ok) {
        fetchPlaylistVideos();
        fetchPlaylist();
        if (currentVideoIndex >= videos.length - 1) {
          setCurrentVideoIndex(Math.max(0, videos.length - 2));
        }
      } else {
        setError(data.error || "Erro ao remover vídeo");
      }
    } catch (err) {
      setError("Erro ao conectar com o servidor");
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = videos.findIndex((v) => v.id === active.id);
    const newIndex = videos.findIndex((v) => v.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Atualizar ordem localmente (otimistic update)
    const newVideos = arrayMove(videos, oldIndex, newIndex);
    setVideos(newVideos);
    setIsReordering(true);

    // Se o vídeo atual foi movido, atualizar o índice
    if (currentVideoIndex === oldIndex) {
      setCurrentVideoIndex(newIndex);
    } else if (
      currentVideoIndex > oldIndex &&
      currentVideoIndex <= newIndex
    ) {
      setCurrentVideoIndex(currentVideoIndex - 1);
    } else if (
      currentVideoIndex < oldIndex &&
      currentVideoIndex >= newIndex
    ) {
      setCurrentVideoIndex(currentVideoIndex + 1);
    }

    // Enviar nova ordem para o servidor
    try {
      const videoIds = newVideos.map((v) => v.id.toString());
      const response = await fetch(
        `/api/playlists/${playlistId}/videos/reorder`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ videoIds }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // Reverter se falhar
        setVideos(videos);
        setError(data.error || "Erro ao reordenar vídeos");
      }
    } catch (err) {
      // Reverter se falhar
      setVideos(videos);
      setError("Erro ao conectar com o servidor");
    } finally {
      setIsReordering(false);
    }
  };

  const handleVideoEnd = () => {
    if (currentVideoIndex < videos.length - 1) {
      setCurrentVideoIndex(currentVideoIndex + 1);
    } else if (loopPlaylist && videos.length > 0) {
      setCurrentVideoIndex(0);
    }
  };

  const handlePreviousVideo = () => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex(currentVideoIndex - 1);
    }
  };

  const handleNextVideo = () => {
    if (currentVideoIndex < videos.length - 1) {
      setCurrentVideoIndex(currentVideoIndex + 1);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const currentVideo = videos[currentVideoIndex];

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <Header onMenuToggle={() => setIsMenuOpen(!isMenuOpen)} isMenuOpen={isMenuOpen} />
      <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      
      <main className="lg:ml-64 pt-14 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
            <div>
              <Link
                href="/playlists"
                className="text-purple-400 hover:text-purple-300 text-sm font-medium mb-2 inline-block"
              >
                ← Voltar para Playlists
              </Link>
              {playlist && (
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-white">{playlist.name}</h1>
                  {loopPlaylist && (
                    <span className="bg-purple-600 text-white text-xs font-semibold px-2 py-1 rounded flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Loop Ativado
                    </span>
                  )}
                </div>
              )}
              {playlist?.description && (
                <p className="text-gray-400 mt-2">{playlist.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowEditModal(true)}
                className="bg-[#212121] hover:bg-[#2a2a2a] text-white font-semibold py-2 px-4 rounded-lg transition duration-200 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Editar
              </button>
              <button
                onClick={() => {
                  setShowAddVideoModal(true);
                  fetchAvailableVideos();
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
              >
                + Adicionar Vídeo
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-800 text-red-200 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-400">Carregando playlist...</p>
            </div>
          )}

          {!loading && videos.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">Esta playlist está vazia.</p>
              <button
                onClick={() => {
                  setShowAddVideoModal(true);
                  fetchAvailableVideos();
                }}
                className="text-purple-400 hover:text-purple-300 font-semibold"
              >
                Adicionar primeiro vídeo →
              </button>
            </div>
          )}

          {!loading && videos.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Player de Vídeo */}
              <div className="lg:col-span-2">
                <div className="bg-[#212121] rounded-xl overflow-hidden mb-4">
                  <div className="aspect-video bg-black">
                    <video
                      ref={videoRef}
                      key={currentVideo?.id}
                      controls
                      className="w-full h-full"
                      onEnded={handleVideoEnd}
                    >
                      <source
                        src={`/api/videos/${currentVideo?.video?.id || currentVideo?.video_id}`}
                        type={currentVideo?.video?.mime_type || "video/mp4"}
                      />
                      Seu navegador não suporta o elemento de vídeo.
                    </video>
                  </div>
                </div>

                <div className="flex justify-between items-center mb-4">
                  <button
                    onClick={handlePreviousVideo}
                    disabled={currentVideoIndex === 0}
                    className="bg-[#212121] hover:bg-[#2a2a2a] text-white font-semibold py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Anterior
                  </button>
                  <span className="text-sm text-gray-400">
                    {currentVideoIndex + 1} de {videos.length}
                  </span>
                  <button
                    onClick={handleNextVideo}
                    disabled={currentVideoIndex === videos.length - 1}
                    className="bg-[#212121] hover:bg-[#2a2a2a] text-white font-semibold py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Próximo →
                  </button>
                </div>

                <div className="bg-[#212121] rounded-xl p-4">
                  <h3 className="font-semibold text-white mb-2">
                    {currentVideo?.video?.original_filename || currentVideo?.original_filename || "Sem nome"}
                  </h3>
                  <p className="text-sm text-gray-400">
                    Tamanho: {currentVideo && formatFileSize(currentVideo.video?.file_size || currentVideo.file_size || 0)}
                  </p>
                </div>
              </div>

              {/* Lista de Vídeos com Drag & Drop */}
              <div className="lg:col-span-1 order-1 lg:order-2">
                <div className="bg-[#212121] rounded-xl p-3 sm:p-4 sticky top-20 max-h-[calc(100vh-8rem)] overflow-y-auto scrollbar-hide">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Vídeos ({videos.length})
                  </h3>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={videos.map((v) => v.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {videos.map((video, index) => (
                          <SortableVideoItem
                            key={video.id}
                            video={video}
                            index={index}
                            isActive={index === currentVideoIndex}
                            onSelect={() => setCurrentVideoIndex(index)}
                            onRemove={(e) => {
                              e.stopPropagation();
                              handleRemoveVideo(video.id);
                            }}
                            formatFileSize={formatFileSize}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                  {isReordering && (
                    <div className="mt-2 text-xs text-gray-400 text-center">
                      Reordenando...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {showAddVideoModal && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
              <div className="bg-[#212121] rounded-xl p-4 sm:p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-800">
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">Adicionar Vídeo à Playlist</h2>
                {loadingVideos ? (
                  <p className="text-gray-400">Carregando vídeos...</p>
                ) : availableVideos.length === 0 ? (
                  <p className="text-gray-400">Nenhum vídeo disponível para adicionar.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                    {availableVideos.map((video) => (
                      <div
                        key={video.id}
                        className="bg-[#0f0f0f] rounded-lg p-4 hover:bg-[#181818] transition-colors cursor-pointer border border-gray-800"
                        onClick={() => handleAddVideo(video.id)}
                      >
                        <div className="aspect-video bg-gray-800 rounded mb-2 flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <h3 className="font-semibold text-white text-sm mb-1 truncate">
                          {video.original_filename}
                        </h3>
                        <p className="text-xs text-gray-400">
                          {formatFileSize(video.file_size)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-6">
                  <button
                    onClick={() => setShowAddVideoModal(false)}
                    className="w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          )}

          {showEditModal && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
              <div className="bg-[#212121] rounded-xl p-4 sm:p-6 w-full max-w-md border border-gray-800 max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">Editar Playlist</h2>
                <form onSubmit={handleEditPlaylist} className="space-y-4">
                  <div>
                    <label htmlFor="editName" className="block text-sm font-medium text-gray-300 mb-2">
                      Nome *
                    </label>
                    <input
                      id="editName"
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-white"
                      placeholder="Nome da playlist"
                    />
                  </div>
                  <div>
                    <label htmlFor="editDescription" className="block text-sm font-medium text-gray-300 mb-2">
                      Descrição
                    </label>
                    <textarea
                      id="editDescription"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-white"
                      placeholder="Descrição da playlist (opcional)"
                    />
                  </div>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setError("");
                      }}
                      className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
                    >
                      Salvar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
