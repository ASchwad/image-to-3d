import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EtheralShadow } from "@/components/ui/shadcn-io/etheral-shadow";
import { Toaster } from "@/components/ui/sonner";
import { AppLayout } from "@/components/AppLayout";
import { HomePage } from "@/pages/HomePage";
import { GenerateImageAnd3DPage } from "@/pages/GenerateImageAnd3DPage";
import { SingleImagePage } from "@/pages/SingleImagePage";
import { Generate3DAssetPage } from "@/pages/Generate3DAssetPage";
import { Key } from "lucide-react";

function App() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const replicateToken = import.meta.env.VITE_REPLICATE_API_TOKEN;

  if (!apiKey) {
    return (
      <>
        <Toaster />
        <AppLayout>
          <EtheralShadow
            color="rgba(255, 140, 60, 0.7)"
            animation={{ scale: 100, speed: 85 }}
            noise={{ opacity: 0.6, scale: 1 }}
            className="min-h-screen"
          >
            <div className="max-w-4xl mx-auto space-y-8 p-8 z-10">
              <header className="text-center space-y-4">
                <h1 className="text-4xl font-bold text-foreground drop-shadow-lg">
                  Image to 3D Generator
                </h1>
                <p className="text-foreground/90 text-lg drop-shadow-md">
                  Generate stunning images from text prompts using Google Gemini
                  AI
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
          </EtheralShadow>
        </AppLayout>
      </>
    );
  }

  return (
    <>
      <Toaster />
      <BrowserRouter>
        <AppLayout>
          <EtheralShadow
            color="rgba(255, 140, 60, 0.7)"
            animation={{ scale: 100, speed: 85 }}
            noise={{ opacity: 0.6, scale: 1 }}
            className="min-h-screen"
          >
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route
                path="/generate-image-and-3d"
                element={
                  <GenerateImageAnd3DPage
                    apiKey={apiKey}
                    replicateToken={replicateToken}
                  />
                }
              />
              <Route
                path="/single-image"
                element={
                  <SingleImagePage
                    apiKey={apiKey}
                    replicateToken={replicateToken}
                  />
                }
              />
              <Route
                path="/generate-3d-asset"
                element={<Generate3DAssetPage replicateToken={replicateToken} />}
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </EtheralShadow>
        </AppLayout>
      </BrowserRouter>
    </>
  );
}

export default App;
