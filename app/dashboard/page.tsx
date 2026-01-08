"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [rebooting, setRebooting] = useState(false);
  const [rebootError, setRebootError] = useState("");
  const [showRebootConfirm, setShowRebootConfirm] = useState(false);

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <Header onMenuToggle={() => setIsMenuOpen(!isMenuOpen)} isMenuOpen={isMenuOpen} />
      <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      
      <main className="lg:ml-64 pt-14 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-6 sm:mb-8">Dashboard</h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
            <Link
              href="/player"
              className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl p-4 sm:p-6 hover:from-purple-700 hover:to-purple-900 transition-all transform hover:scale-105"
            >
              <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 sm:w-7 sm:h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white">Player Automático</h3>
              </div>
              <p className="text-sm sm:text-base text-purple-100">Reproduza suas playlists automaticamente</p>
            </Link>

            <Link
              href="/upload"
              className="bg-[#212121] border border-gray-800 rounded-xl p-4 sm:p-6 hover:bg-[#2a2a2a] transition-all"
            >
              <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 sm:w-7 sm:h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white">Upload de Vídeo</h3>
              </div>
              <p className="text-sm sm:text-base text-gray-400">Envie novos vídeos para o sistema</p>
            </Link>

            <Link
              href="/videos"
              className="bg-[#212121] border border-gray-800 rounded-xl p-4 sm:p-6 hover:bg-[#2a2a2a] transition-all"
            >
              <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 sm:w-7 sm:h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white">Meus Vídeos</h3>
              </div>
              <p className="text-sm sm:text-base text-gray-400">Gerencie todos os seus vídeos</p>
            </Link>

            <Link
              href="/playlists"
              className="bg-[#212121] border border-gray-800 rounded-xl p-4 sm:p-6 hover:bg-[#2a2a2a] transition-all"
            >
              <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 sm:w-7 sm:h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white">Playlists</h3>
              </div>
              <p className="text-sm sm:text-base text-gray-400">Organize seus vídeos em playlists</p>
            </Link>

            <Link
              href="/settings"
              className="bg-[#212121] border border-gray-800 rounded-xl p-4 sm:p-6 hover:bg-[#2a2a2a] transition-all"
            >
              <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 sm:w-7 sm:h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white">Configurações</h3>
              </div>
              <p className="text-sm sm:text-base text-gray-400">Configure o player e playlists</p>
            </Link>

            {/* Card de Reinicialização */}
            <button
              onClick={() => setShowRebootConfirm(true)}
              disabled={rebooting}
              className="bg-[#212121] border border-red-800/50 rounded-xl p-4 sm:p-6 hover:bg-[#2a2a2a] hover:border-red-700 transition-all text-left w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 sm:w-7 sm:h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white">Reiniciar Sistema</h3>
              </div>
              <p className="text-sm sm:text-base text-gray-400">
                {rebooting ? "Reiniciando..." : "Reinicie o Raspberry Pi"}
              </p>
            </button>
          </div>
        </div>
      </main>

      {/* Modal de Confirmação de Reinicialização */}
      {showRebootConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#212121] rounded-xl p-4 sm:p-6 w-full max-w-md border border-gray-800">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">Confirmar Reinicialização</h2>
            <p className="text-sm text-gray-300 mb-6">
              Tem certeza que deseja reiniciar o Raspberry Pi? O sistema será desconectado e reiniciado. 
              Isso pode levar alguns minutos.
            </p>
            
            {rebootError && (
              <div className="bg-red-900/50 border border-red-800 text-red-200 px-4 py-3 rounded-lg mb-4 text-sm">
                {rebootError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={async () => {
                  setRebootError("");
                  setRebooting(true);
                  
                  try {
                    const response = await fetch("/api/system/reboot", {
                      method: "POST",
                      credentials: "include",
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                      // Mostrar mensagem de sucesso
                      setTimeout(() => {
                        alert("Sistema será reiniciado em breve. A página será desconectada.");
                      }, 1000);
                    } else {
                      setRebootError(data.error || "Erro ao reiniciar o sistema");
                      setRebooting(false);
                    }
                  } catch (err) {
                    setRebootError("Erro ao conectar com o servidor");
                    setRebooting(false);
                  }
                }}
                disabled={rebooting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rebooting ? "Reiniciando..." : "Sim, Reiniciar"}
              </button>
              <button
                onClick={() => {
                  setShowRebootConfirm(false);
                  setRebootError("");
                }}
                disabled={rebooting}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
