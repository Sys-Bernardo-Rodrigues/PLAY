"use client";

import { useEffect, useRef } from "react";

interface VideoThumbnailGeneratorProps {
  videoId: number;
  videoUrl: string;
  onThumbnailGenerated?: () => void;
}

export function VideoThumbnailGenerator({
  videoId,
  videoUrl,
  onThumbnailGenerated,
}: VideoThumbnailGeneratorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hasGenerated = useRef(false);

  useEffect(() => {
    if (hasGenerated.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    const generateThumbnail = async () => {
      try {
        // Aguardar vídeo carregar
        await new Promise((resolve, reject) => {
          video.onloadedmetadata = () => {
            // Capturar frame no segundo 1 (ou 10% do vídeo, o que for menor)
            const captureTime = Math.min(1, video.duration * 0.1);
            video.currentTime = captureTime;
          };

          video.onseeked = () => {
            // Desenhar frame no canvas
            const ctx = canvas.getContext("2d");
            if (ctx) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

              // Converter para base64
              const thumbnailData = canvas.toDataURL("image/jpeg", 0.8);

              // Enviar para o servidor
              fetch(`/api/videos/${videoId}/generate-thumbnail`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ thumbnailData }),
              })
                .then((res) => res.json())
                .then((data) => {
                  if (data.success) {
                    hasGenerated.current = true;
                    if (onThumbnailGenerated) {
                      onThumbnailGenerated();
                    }
                  }
                })
                .catch((err) => {
                  console.error("Erro ao gerar thumbnail:", err);
                });
            }
            resolve(null);
          };

          video.onerror = reject;
        });
      } catch (err) {
        console.error("Erro ao gerar thumbnail:", err);
      }
    };

    generateThumbnail();
  }, [videoId, videoUrl, onThumbnailGenerated]);

  return (
    <div style={{ display: "none" }}>
      <video ref={videoRef} src={videoUrl} crossOrigin="anonymous" />
      <canvas ref={canvasRef} />
    </div>
  );
}

