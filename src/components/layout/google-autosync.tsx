"use client";

import { useEffect } from "react";
import { triggerGoogleSync } from "@/lib/hooks/use-events";

// Empurra pro Google Calendar os eventos pendentes do usuário logado, uma vez
// por carregamento do app.
//
// Por que aqui e não no fluxo de tarefas: o push filtra por events.created_by,
// e o evento espelho de uma tarefa nasce com o RESPONSÁVEL como created_by.
// Ou seja, quem delega não consegue empurrar o compromisso pra agenda de quem
// executa — só a sessão da própria pessoa faz isso. Disparando ao abrir o CRM,
// cada um recebe o que é seu.
//
// Quem não conectou o Google recebe 404 na rota e o erro é ignorado.
export function GoogleAutoSync() {
  useEffect(() => {
    triggerGoogleSync();
  }, []);
  return null;
}
