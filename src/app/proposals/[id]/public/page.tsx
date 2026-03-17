import { PublicProposalView } from "@/components/proposals/public-proposal-view";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PublicProposalPage({ params }: Props) {
  const { id } = await params;
  return <PublicProposalView id={id} />;
}
