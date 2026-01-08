"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function VideoUploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [progress, setProgress] = useState(0);

  // Usa o email do admin configurado no .env
  const userEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@test.com";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validar tipo
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

      // Validar tamanho (100MB)
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

      // Simular progresso
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="video-file"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Selecione um vídeo
        </label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-indigo-500 transition-colors dark:border-gray-600">
          <div className="space-y-1 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="flex text-sm text-gray-600 dark:text-gray-400">
              <label
                htmlFor="video-file"
                className="relative cursor-pointer bg-white dark:bg-gray-700 rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
              >
                <span>Clique para selecionar</span>
                <input
                  id="video-file"
                  ref={fileInputRef}
                  name="video-file"
                  type="file"
                  accept="video/*"
                  className="sr-only"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
              </label>
              <p className="pl-1">ou arraste e solte</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              MP4, WebM, OGG até 100MB
            </p>
          </div>
        </div>

        {file && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
                className="text-red-600 hover:text-red-700 text-sm font-medium"
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
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div
              className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Enviando... {Math.round(progress)}%
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg">
          ✅ Vídeo enviado com sucesso! Redirecionando...
        </div>
      )}

      <button
        type="submit"
        disabled={!file || uploading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? "Enviando..." : "Enviar Vídeo"}
      </button>
    </form>
  );
}

