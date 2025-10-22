import { ManualMeshGenerator } from "@/components/ManualMeshGenerator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Key } from "lucide-react";

interface Generate3DAssetPageProps {
  replicateToken?: string;
}

export function Generate3DAssetPage({
  replicateToken,
}: Generate3DAssetPageProps) {
  if (!replicateToken) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 p-8 z-10">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Replicate Token Required
            </CardTitle>
            <CardDescription>
              Direct 3D mesh generation requires a Replicate API token
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-muted rounded text-sm">
              <p>
                Add this line to your <code>.env</code> file:
              </p>
              <code className="block mt-2 p-2 bg-background rounded">
                VITE_REPLICATE_API_TOKEN=your_token_here
              </code>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>
                Get your Replicate token from{" "}
                <a
                  href="https://replicate.com/account/api-tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  Replicate
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-8 z-10">
      <ManualMeshGenerator replicateToken={replicateToken} />
    </div>
  );
}
