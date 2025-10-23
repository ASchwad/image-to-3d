import { UnifiedMeshGenerator } from "@/components/UnifiedMeshGenerator";

interface GenerateImageAnd3DPageProps {
  apiKey: string;
  replicateToken?: string;
}

export function GenerateImageAnd3DPage({
  apiKey,
  replicateToken,
}: GenerateImageAnd3DPageProps) {
  return <UnifiedMeshGenerator apiKey={apiKey} replicateToken={replicateToken} />;
}
