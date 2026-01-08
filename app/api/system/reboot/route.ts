import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { getCurrentUserIdFromRequest } from "@/lib/auth-helpers";

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const userId = await getCurrentUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    // Verificar se está em ambiente Linux (Raspberry Pi)
    if (process.platform !== "linux") {
      return NextResponse.json(
        { error: "Reinicialização disponível apenas no Raspberry Pi" },
        { status: 400 }
      );
    }

    // Executar comando de reinicialização
    // Nota: O processo Next.js precisa ter permissões sudo ou o usuário precisa estar no grupo sudo
    try {
      // Tentar reiniciar (requer permissões adequadas)
      await execAsync("sudo reboot");
      
      // Se chegou aqui, o comando foi executado com sucesso
      // O sistema será reiniciado, então não retornaremos resposta
      return NextResponse.json({
        success: true,
        message: "Sistema será reiniciado em breve...",
      });
    } catch (execError: any) {
      console.error("Erro ao executar reboot:", execError);
      
      // Se falhar por falta de permissões, tentar sem sudo (pode funcionar se o processo já tiver permissões)
      if (execError.message?.includes("sudo") || execError.message?.includes("permission")) {
        try {
          await execAsync("reboot");
          return NextResponse.json({
            success: true,
            message: "Sistema será reiniciado em breve...",
          });
        } catch (rebootError) {
          return NextResponse.json(
            {
              error: "Não foi possível reiniciar o sistema. Verifique as permissões do usuário.",
              details: execError.message,
            },
            { status: 500 }
          );
        }
      }
      
      return NextResponse.json(
        {
          error: "Erro ao reiniciar o sistema",
          details: execError.message,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Erro na API de reboot:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

