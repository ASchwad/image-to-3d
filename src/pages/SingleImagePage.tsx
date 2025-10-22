import { SingleImageGenerator } from "@/components/SingleImageGenerator";

interface SingleImagePageProps {
  apiKey: string;
  replicateToken?: string;
}

export function SingleImagePage({
  apiKey,
  replicateToken,
}: SingleImagePageProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-8 p-8 z-10">
      <SingleImageGenerator apiKey={apiKey} replicateToken={replicateToken} />
    </div>
  );
}
