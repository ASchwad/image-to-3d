import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ImageGenerator } from "@/components/ImageGenerator";
import { ManualMeshGenerator } from "@/components/ManualMeshGenerator";
import { Key } from "lucide-react";

function App() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const replicateToken = import.meta.env.VITE_REPLICATE_API_TOKEN;

  if (!apiKey) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <header className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-foreground">
              Image to 3D Generator
            </h1>
            <p className="text-muted-foreground text-lg">
              Generate stunning images from text prompts using Google Gemini AI
            </p>
          </header>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                API Key Required
              </CardTitle>
              <CardDescription>
                Please add your Google Gemini API key to the .env file
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-muted rounded text-sm">
                <p>
                  Add these lines to your <code>.env</code> file:
                </p>
                <code className="block mt-2 p-2 bg-background rounded">
                  VITE_GEMINI_API_KEY=your_api_key_here
                  <br />
                  VITE_REPLICATE_API_TOKEN=your_token_here (optional, for 3D
                  mesh)
                </code>
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>
                  Get your Gemini API key from{" "}
                  <a
                    href="https://ai.google.dev/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-foreground"
                  >
                    Google AI Studio
                  </a>
                </p>
                <p>
                  Get your Replicate token from{" "}
                  <a
                    href="https://replicate.com/account/api-tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-foreground"
                  >
                    Replicate
                  </a>{" "}
                  (optional, needed for 3D mesh generation)
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">
            Image to 3D Generator
          </h1>
          <p className="text-muted-foreground text-lg">
            Generate 4-perspective views and create 3D meshes using AI
          </p>
        </header>

        <ImageGenerator apiKey={apiKey} replicateToken={replicateToken} />

        {replicateToken && (
          <ManualMeshGenerator replicateToken={replicateToken} />
        )}
      </div>
    </div>
  );
}

export default App;
