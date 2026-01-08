"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";

interface PlayerSettings {
  id: number;
  user_id: number;
  loop_playlist: boolean;
  monday_playlist_id: number | null;
  tuesday_playlist_id: number | null;
  wednesday_playlist_id: number | null;
  thursday_playlist_id: number | null;
  friday_playlist_id: number | null;
  saturday_playlist_id: number | null;
  sunday_playlist_id: number | null;
}

interface Playlist {
  id: number;
  name: string;
  video_count: number;
}

const DAYS = [
  { key: "monday", label: "Segunda-feira", field: "monday_playlist_id" },
  { key: "tuesday", label: "Terça-feira", field: "tuesday_playlist_id" },
  { key: "wednesday", label: "Quarta-feira", field: "wednesday_playlist_id" },
  { key: "thursday", label: "Quinta-feira", field: "thursday_playlist_id" },
  { key: "friday", label: "Sexta-feira", field: "friday_playlist_id" },
  { key: "saturday", label: "Sábado", field: "saturday_playlist_id" },
  { key: "sunday", label: "Domingo", field: "sunday_playlist_id" },
] as const;

export default function SettingsPage() {
  const [settings, setSettings] = useState<PlayerSettings | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const userEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@test.com";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [settingsRes, playlistsRes] = await Promise.all([
        fetch(`/api/player-settings?email=${userEmail}`),
        fetch(`/api/playlists?email=${userEmail}`),
      ]);

      const settingsData = await settingsRes.json();
      const playlistsData = await playlistsRes.json();

      if (settingsRes.ok) {
        setSettings(settingsData.settings);
      } else {
        setError(settingsData.error || "Erro ao carregar configurações");
      }

      if (playlistsRes.ok) {
        setPlaylists(playlistsData.playlists);
      }
    } catch (err) {
      setError("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      setError("");
      setSuccess(false);

      const response = await fetch("/api/player-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userEmail,
          loop_playlist: settings.loop_playlist,
          monday_playlist_id: settings.monday_playlist_id,
          tuesday_playlist_id: settings.tuesday_playlist_id,
          wednesday_playlist_id: settings.wednesday_playlist_id,
          thursday_playlist_id: settings.thursday_playlist_id,
          friday_playlist_id: settings.friday_playlist_id,
          saturday_playlist_id: settings.saturday_playlist_id,
          sunday_playlist_id: settings.sunday_playlist_id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(data.error || "Erro ao salvar configurações");
      }
    } catch (err) {
      setError("Erro ao conectar com o servidor");
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (field: keyof PlayerSettings, value: any) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [field]: value,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f]">
        <Header />
        <Sidebar />
        <main className="ml-64 pt-14 p-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-400">Carregando...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-[#0f0f0f]">
        <Header />
        <Sidebar />
        <main className="ml-64 pt-14 p-8">
          <div className="bg-red-900/50 border border-red-800 text-red-200 px-4 py-3 rounded-lg">
            Erro ao carregar configurações
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <Header />
      <Sidebar />
      
      <main className="ml-64 pt-14 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">Configurações do Player</h1>

          {error && (
            <div className="bg-red-900/50 border border-red-800 text-red-200 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-900/50 border border-green-800 text-green-200 px-4 py-3 rounded-lg mb-6">
              ✅ Configurações salvas com sucesso!
            </div>
          )}

          <div className="space-y-6">
            {/* Informações de Debug */}
            <div className="bg-purple-900/20 border border-purple-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-purple-200 mb-2">
                ℹ️ Informações do Sistema
              </h3>
              <div className="text-sm text-purple-100 space-y-1">
                <p>
                  <strong>Dia atual detectado:</strong> {(() => {
                    const today = new Date().getDay();
                    const dayNames = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
                    return dayNames[today];
                  })()}
                </p>
                <p>
                  <strong>Data/Hora do servidor:</strong> {new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                </p>
                <p className="text-xs text-purple-300 mt-2">
                  O player usará a playlist configurada para o dia detectado acima.
                </p>
              </div>
            </div>

            {/* Configuração de Loop */}
            <div className="bg-[#212121] rounded-xl p-6 border border-gray-800">
              <h2 className="text-xl font-semibold text-white mb-4">Reprodução</h2>
              <div className="flex items-center space-x-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.loop_playlist}
                    onChange={(e) => updateSetting("loop_playlist", e.target.checked)}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500 bg-[#0f0f0f] border-gray-700"
                  />
                  <span className="ml-3 text-gray-300">Repetir playlist em loop</span>
                </label>
                <span className="text-sm text-gray-500">
                  Quando ativado, a playlist será repetida automaticamente ao terminar
                </span>
              </div>
            </div>

            {/* Configuração por Dia da Semana */}
            <div className="bg-[#212121] rounded-xl p-6 border border-gray-800">
              <h2 className="text-xl font-semibold text-white mb-4">
                Playlists por Dia da Semana
              </h2>
              <p className="text-sm text-gray-400 mb-6">
                Configure qual playlist será reproduzida em cada dia da semana. O sistema detecta automaticamente o dia atual.
              </p>

              <div className="space-y-3">
                {DAYS.map((day) => {
                  const field = day.field as keyof PlayerSettings;
                  const currentPlaylistId = settings[field] as number | null;
                  
                  const today = new Date().getDay();
                  const dayMap: { [key: string]: number } = {
                    monday: 1,
                    tuesday: 2,
                    wednesday: 3,
                    thursday: 4,
                    friday: 5,
                    saturday: 6,
                    sunday: 0,
                  };
                  const isToday = dayMap[day.key] === today;

                  return (
                    <div
                      key={day.key}
                      className={`p-4 rounded-lg ${
                        isToday
                          ? "bg-purple-600/20 border-2 border-purple-600"
                          : "bg-[#0f0f0f] border border-gray-800"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                            {day.label}
                            {isToday && (
                              <span className="bg-purple-600 text-white text-xs font-semibold px-2 py-1 rounded">
                                Hoje
                              </span>
                            )}
                          </label>
                          <select
                            value={currentPlaylistId || ""}
                            onChange={(e) =>
                              updateSetting(
                                field,
                                e.target.value ? parseInt(e.target.value) : null
                              )
                            }
                            className="w-full px-4 py-2 bg-[#212121] border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-white"
                          >
                            <option value="">Nenhuma playlist</option>
                            {playlists.map((playlist) => (
                              <option key={playlist.id} value={playlist.id}>
                                {playlist.name} ({playlist.video_count} vídeos)
                              </option>
                            ))}
                          </select>
                        </div>
                        {currentPlaylistId && (
                          <Link
                            href={`/playlists/${currentPlaylistId}`}
                            className="ml-4 text-purple-400 hover:text-purple-300 text-sm font-medium"
                          >
                            Ver →
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Botão Salvar */}
            <div className="flex justify-end pt-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-8 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Salvando..." : "Salvar Configurações"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
