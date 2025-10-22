import { PerspectiveGenerator } from "@/components/PerspectiveGenerator";

interface GenerateImageAnd3DPageProps {
  apiKey: string;
  replicateToken?: string;
}

export function GenerateImageAnd3DPage({
  apiKey,
  replicateToken,
}: GenerateImageAnd3DPageProps) {
  return <PerspectiveGenerator apiKey={apiKey} replicateToken={replicateToken} />;
}
