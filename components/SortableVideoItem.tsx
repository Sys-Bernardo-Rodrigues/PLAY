"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

interface SortableVideoItemProps {
  video: Video;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onRemove: (e: React.MouseEvent) => void;
  formatFileSize: (bytes: number) => string;
}

export function SortableVideoItem({
  video,
  index,
  isActive,
  onSelect,
  onRemove,
  formatFileSize,
}: SortableVideoItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: video.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 rounded-lg transition-colors ${
        isActive
          ? "bg-purple-600 text-white"
          : "bg-[#0f0f0f] hover:bg-[#181818] text-gray-300"
      } ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
      onClick={onSelect}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <div
            {...attributes}
            {...listeners}
            className="mt-1 cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            <svg
              className="w-4 h-4 text-gray-400 hover:text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8h16M4 16h16"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm font-medium truncate ${
                isActive ? "text-white" : "text-white"
              }`}
              title={
                video.video?.original_filename ||
                "Sem nome"
              }
            >
              {video.video?.original_filename ||
                "Sem nome"}
            </p>
            <p
              className={`text-xs mt-1 ${
                isActive ? "text-purple-100" : "text-gray-400"
              }`}
            >
              {formatFileSize(
                video.video?.file_size || 0
              )}
            </p>
          </div>
        </div>
        <button
          onClick={onRemove}
          className="text-red-400 hover:text-red-300 text-lg ml-2 flex-shrink-0"
          title="Remover vídeo"
        >
          ×
        </button>
      </div>
    </div>
  );
}

