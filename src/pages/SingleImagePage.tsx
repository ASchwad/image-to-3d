import { SingleImageGenerator } from "@/components/SingleImageGenerator";

interface SingleImagePageProps {
  apiKey: string;
  replicateToken?: string;
}

export function SingleImagePage({
  apiKey,
  replicateToken,
}: SingleImagePageProps) {
  return <SingleImageGenerator apiKey={apiKey} replicateToken={replicateToken} />;
}
