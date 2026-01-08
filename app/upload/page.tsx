"use client";

import { useState, useRef } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [progress, setProgress] = useState(0);

  const userEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@test.com";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const allowedTypes = [
        "video/mp4",
        "video/webm",
        "video/ogg",
        "video/quicktime",
        "video/x-msvideo",
      ];

      if (!allowedTypes.includes(selectedFile.type)) {
        setError("Tipo de arquivo não permitido. Apenas vídeos são aceitos.");
        setFile(null);
        return;
      }

      const maxSize = 100 * 1024 * 1024;
      if (selectedFile.size > maxSize) {
        setError("Arquivo muito grande. Tamanho máximo: 100MB");
        setFile(null);
        return;
      }

      setFile(selectedFile);
      setError("");
      setSuccess(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setError("Por favor, selecione um arquivo");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess(false);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("email", userEmail);

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setProgress(percentComplete);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          setSuccess(true);
          setFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
          setTimeout(() => {
            router.push("/videos");
          }, 2000);
        } else {
          const response = JSON.parse(xhr.responseText);
          setError(response.error || "Erro ao fazer upload");
        }
        setUploading(false);
      });

      xhr.addEventListener("error", () => {
        setError("Erro ao conectar com o servidor");
        setUploading(false);
      });

      xhr.open("POST", "/api/videos/upload");
      xhr.send(formData);
    } catch (err) {
      setError("Erro ao fazer upload do vídeo");
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <Header />
      <Sidebar />
      
      <main className="ml-64 pt-14 p-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">Upload de Vídeo</h1>

          <div className="bg-[#212121] rounded-xl p-8 border border-gray-800">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="video-file"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Selecione um vídeo
                </label>
                <div
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  className="mt-1 flex justify-center px-6 pt-12 pb-12 border-2 border-dashed border-gray-700 rounded-lg hover:border-purple-600 transition-colors cursor-pointer bg-[#0f0f0f]"
                >
                  <div className="space-y-4 text-center">
                    <div className="mx-auto w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-300">
                        <span className="text-purple-400 font-medium">Clique para selecionar</span> ou arraste e solte
                      </p>
                      <p className="text-xs text-gray-500 mt-2">MP4, WebM, OGG até 100MB</p>
                    </div>
                    <input
                      id="video-file"
                      ref={fileInputRef}
                      name="video-file"
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={handleFileChange}
                      disabled={uploading}
                    />
                  </div>
                </div>

                {file && (
                  <div className="mt-4 p-4 bg-[#0f0f0f] rounded-lg border border-gray-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">{file.name}</p>
                        <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFile(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = "";
                          }
                        }}
                        className="text-red-400 hover:text-red-300 text-sm font-medium"
                        disabled={uploading}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {uploading && (
                <div className="space-y-2">
                  <div className="w-full bg-gray-700 rounded-full h-2.5">
                    <div
                      className="bg-purple-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-400 text-center">
                    Enviando... {Math.round(progress)}%
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-red-900/50 border border-red-800 text-red-200 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-900/50 border border-green-800 text-green-200 px-4 py-3 rounded-lg">
                  ✅ Vídeo enviado com sucesso! Redirecionando...
                </div>
              )}

              <button
                type="submit"
                disabled={!file || uploading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? "Enviando..." : "Enviar Vídeo"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
