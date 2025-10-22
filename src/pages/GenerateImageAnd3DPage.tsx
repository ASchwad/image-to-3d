import { PerspectiveGenerator } from "@/components/PerspectiveGenerator";

interface GenerateImageAnd3DPageProps {
  apiKey: string;
  replicateToken?: string;
}

export function GenerateImageAnd3DPage({
  apiKey,
  replicateToken,
}: GenerateImageAnd3DPageProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-8 p-8 z-10">
      <PerspectiveGenerator apiKey={apiKey} replicateToken={replicateToken} />
    </div>
  );
}
