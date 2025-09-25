import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ImageGenerator } from "@/components/ImageGenerator"
import { Key } from "lucide-react"

function App() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY

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
                <p>Add this line to your <code>.env</code> file:</p>
                <code className="block mt-2 p-2 bg-background rounded">
                  VITE_GEMINI_API_KEY=your_api_key_here
                </code>
              </div>
              <p className="text-xs text-muted-foreground">
                Get your API key from{' '}
                <a
                  href="https://ai.google.dev/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  Google AI Studio
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">
            Image to 3D Generator
          </h1>
          <p className="text-muted-foreground text-lg">
            Generate stunning 4-perspective views for 3D modeling using Google Gemini AI
          </p>
        </header>

        <ImageGenerator apiKey={apiKey} />

        <Card>
          <CardHeader>
            <CardTitle>About This App</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <li>🎨 AI-powered 3D perspective generation</li>
              <li>🚀 Google Gemini 2.5 Flash Image Preview</li>
              <li>🔄 4-view orthographic perspectives</li>
              <li>💾 Batch download all perspectives</li>
              <li>⚡ Real-time streaming generation</li>
              <li>🎯 Standardized lighting & white backgrounds</li>
              <li>🔍 Smart image analysis & prompting</li>
              <li>📱 Professional 3D modeling workflow</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default App
