import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ImageGenerator } from "@/components/ImageGenerator"
import { Key } from "lucide-react"

function App() {
  const [apiKey, setApiKey] = useState('')

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

        {!apiKey ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                API Key Required
              </CardTitle>
              <CardDescription>
                Enter your Google Gemini API key to start generating images
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">Google Gemini API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Enter your API key..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
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
        ) : (
          <ImageGenerator apiKey={apiKey} />
        )}

        <Card>
          <CardHeader>
            <CardTitle>About This App</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <li>🎨 AI-powered image generation</li>
              <li>🚀 Google Gemini 2.5 Flash</li>
              <li>💾 Download generated images</li>
              <li>🎯 Text-to-image conversion</li>
              <li>⚡ Real-time streaming</li>
              <li>📱 Responsive design</li>
              <li>🔒 Secure API key handling</li>
              <li>✨ Modern UI with shadcn/ui</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default App
