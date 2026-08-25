"use client";

import { Suspense } from "react";
import { ProposalEditor } from "@/components/proposals/proposal-editor";

// ProposalEditor lê ?leadId= da URL (atalho "criar proposta pra esse lead"),
// e useSearchParams exige um boundary de Suspense pro Next conseguir
// pré-renderizar a rota.
export default function NewProposalPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-text-muted">Carregando...</div>}>
      <ProposalEditor />
    </Suspense>
  );
}
