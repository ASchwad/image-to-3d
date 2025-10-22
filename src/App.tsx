import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SingleImageGenerator } from "@/components/SingleImageGenerator";
import { PerspectiveGenerator } from "@/components/PerspectiveGenerator";
import { ManualMeshGenerator } from "@/components/ManualMeshGenerator";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { Key, Image, Box, Upload } from "lucide-react";

function App() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const replicateToken = import.meta.env.VITE_REPLICATE_API_TOKEN;

  if (!apiKey) {
    return (
      <AuroraBackground>
        <div className="max-w-4xl mx-auto space-y-8 p-8 z-10">
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
      </AuroraBackground>
    );
  }

  return (
    <AuroraBackground>
      <div className="max-w-4xl mx-auto space-y-8 p-8 z-10">
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">Maggio 🧑🏼‍🎨</h1>
          <p className="text-muted-foreground text-lg mb-0">
            Generate/edit images and bring them to the 3D world with cutting
            edge AI
          </p>
          <p className="text-muted-foreground text-sm mt-0">
            Powered by Google Nano Banana and Microsoft Trellis
          </p>
        </header>

        <Tabs defaultValue="perspective" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger
              value="perspective"
              className="flex items-center gap-2"
            >
              <Box className="w-4 h-4" />
              Generate image + 3D asset
            </TabsTrigger>
            <TabsTrigger value="single" className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              Single Image: Create and Edit
            </TabsTrigger>
            <TabsTrigger value="direct" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Generate 3D asset
            </TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="mt-6">
            <SingleImageGenerator apiKey={apiKey} replicateToken={replicateToken} />
          </TabsContent>

          <TabsContent value="perspective" className="mt-6">
            <PerspectiveGenerator
              apiKey={apiKey}
              replicateToken={replicateToken}
            />
          </TabsContent>

          <TabsContent value="direct" className="mt-6">
            {replicateToken ? (
              <ManualMeshGenerator replicateToken={replicateToken} />
            ) : (
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
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AuroraBackground>
  );
}

export default App;
