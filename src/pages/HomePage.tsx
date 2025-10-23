import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Box, Image, Move3D } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function HomePage() {
  return (
    <div className="flex items-center justify-center min-h-screen p-8">
      <div className="max-w-2xl w-full space-y-8 z-10">
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground drop-shadow-lg">
            What do you want to work on today?
          </h1>
        </header>

            <Link to="/generate-3d-assets">
            <Card className="h-full cursor-pointer transition-transform duration-300 ease-out hover:scale-101">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Box className="w-5 h-5" />
                  Generate 3D assets from images
                </CardTitle>
                <CardDescription>
                  Generate 4 clean and coherent perspectives from an input
                  image. Correct the perspective details and then generate 3D
                  Assets. Ready for further tuning in Blender or for
                  3D-printing.
                </CardDescription>
                <div className="flex gap-2 mt-3">
                  <Badge variant="secondary">Nano Banana</Badge>
                  <Badge variant="secondary">Flux</Badge>
                  <Badge variant="secondary">Trellis</Badge>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/single-image">
            <Card className="h-full cursor-pointer transition-transform duration-300 ease-out hover:scale-101">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5" />
                  Create and Edit single images
                </CardTitle>
                <CardDescription>
                  Create, edit, and enhance single images with AI
                </CardDescription>
                <div className="flex gap-2 mt-3">
                  <Badge variant="secondary">Nano Banana</Badge>
                  <Badge variant="secondary">Flux</Badge>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/veloce">
            <Card className="h-full cursor-pointer transition-transform duration-300 ease-out hover:scale-101">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Move3D className="w-5 h-5" />
                  Veloce
                </CardTitle>
                <CardDescription>
                  Generate motion graphics from text prompts quickly and easily
                </CardDescription>
                <div className="flex gap-2 mt-3">
                  <Badge variant="secondary">GPT-5</Badge>
                  <Badge variant="secondary">Remotion</Badge>
                </div>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
