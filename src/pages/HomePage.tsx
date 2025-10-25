import { Link } from "react-router-dom";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Box, Image, Move3D, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

export function HomePage() {
  const container = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.4,
        delayChildren: 0.4,
      },
    },
  };

  const item = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        duration: 1,
      },
    },
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-8">
      <div className="max-w-2xl w-full space-y-8 z-10">
        <motion.header
          className="text-center space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <h1 className="text-4xl font-bold text-foreground drop-shadow-lg">
            What are working on today?
          </h1>
        </motion.header>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-1 gap-6"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={item}>
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
          </motion.div>

          <motion.div variants={item}>
            <Link to="/single-image">
              <Card className="h-full cursor-pointer transition-transform duration-300 ease-out hover:scale-101">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="w-5 h-5" />
                    Create and edit images
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
          </motion.div>

          <motion.div variants={item}>
            <Link to="/veloce">
              <Card className="h-full cursor-pointer transition-transform duration-300 ease-out hover:scale-101">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Move3D className="w-5 h-5" />
                    Veloce - Motion Graphics
                  </CardTitle>
                  <CardDescription>
                    Generate motion graphics from text prompts quickly and
                    easily
                  </CardDescription>
                  <div className="flex gap-2 mt-3">
                    <Badge variant="secondary">GPT-5</Badge>
                    <Badge variant="secondary">Remotion</Badge>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          </motion.div>

          <motion.div variants={item}>
            <Link to="/sora">
              <Card className="h-full cursor-pointer transition-transform duration-300 ease-out hover:scale-101">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="w-5 h-5" />
                    Sora Video Generator
                  </CardTitle>
                  <CardDescription>
                    Generate AI videos from text prompts using OpenAI's Sora-2
                    model
                  </CardDescription>
                  <div className="flex gap-2 mt-3">
                    <Badge variant="secondary">Sora-2</Badge>
                    <Badge variant="secondary">OpenAI</Badge>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
