"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { ProposalEditor } from "@/components/proposals/proposal-editor";
import { ProposalDetail } from "@/components/proposals/proposal-detail";
import { useProposal } from "@/lib/hooks/use-proposals";

interface Props {
  params: Promise<{ id: string }>;
}

export default function ProposalPage({ params }: Props) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const isEditing = searchParams.get("edit") === "true";

  const { data: proposal, isLoading } = useProposal(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-text-muted text-sm">Carregando proposta...</p>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-text-muted text-sm">Proposta não encontrada.</p>
      </div>
    );
  }

  if (isEditing) {
    return <ProposalEditor proposal={proposal} />;
  }

  return <ProposalDetail proposal={proposal} />;
}
