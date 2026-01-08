"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";

interface Video {
  id: number;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  thumbnail_path: string | null;
  created_at: string;
}

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const userEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@test.com";

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/videos?email=${userEmail}`);
      const data = await response.json();

      if (response.ok) {
        setVideos(data.videos);
      } else {
        setError(data.error || "Erro ao carregar vídeos");
      }
    } catch (err) {
      setError("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDeleteVideo = async (videoId: number) => {
    if (!confirm("Tem certeza que deseja deletar este vídeo? Esta ação não pode ser desfeita.")) {
      return;
    }

    try {
      const response = await fetch(`/api/videos/${videoId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        // Remover vídeo da lista
        setVideos(videos.filter((v) => v.id !== videoId));
      } else {
        alert(data.error || "Erro ao deletar vídeo");
      }
    } catch (err) {
      console.error("Erro ao deletar vídeo:", err);
      alert("Erro ao conectar com o servidor");
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <Header onMenuToggle={() => setIsMenuOpen(!isMenuOpen)} isMenuOpen={isMenuOpen} />
      <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      
      <main className="lg:ml-64 pt-14 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Meus Vídeos</h1>
            <Link
              href="/upload"
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 sm:px-6 rounded-lg transition duration-200 flex items-center gap-2 text-sm sm:text-base w-full sm:w-auto justify-center"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Novo Upload
            </Link>
          </div>

          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-400">Carregando vídeos...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-900/50 border border-red-800 text-red-200 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {!loading && !error && videos.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">Nenhum vídeo encontrado.</p>
              <Link
                href="/upload"
                className="text-purple-400 hover:text-purple-300 font-semibold"
              >
                Fazer primeiro upload →
              </Link>
            </div>
          )}

          {!loading && videos.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="bg-[#212121] rounded-xl overflow-hidden hover:bg-[#2a2a2a] transition-all group"
                >
                  <a
                    href={`/api/videos/${video.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <div className="aspect-video bg-gray-800 relative overflow-hidden">
                      {video.thumbnail_path ? (
                        <img
                          src={`/api/videos/${video.id}/thumbnail`}
                          alt={video.original_filename}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Se a imagem falhar, mostrar ícone padrão
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              const icon = parent.querySelector('.fallback-icon') as HTMLElement;
                              if (icon) icon.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <div className={`fallback-icon absolute inset-0 flex items-center justify-center ${video.thumbnail_path ? 'hidden' : ''}`}>
                        <svg className="w-16 h-16 text-gray-600 group-hover:text-purple-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                        {formatFileSize(video.file_size)}
                      </div>
                    </div>
                  </a>
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-white line-clamp-2 group-hover:text-purple-400 transition-colors flex-1">
                        {video.original_filename}
                      </h3>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleDeleteVideo(video.id);
                        }}
                        className="ml-2 text-red-400 hover:text-red-300 transition-colors flex-shrink-0"
                        title="Deletar vídeo"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-xs text-gray-400">
                      Enviado em {formatDate(video.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
