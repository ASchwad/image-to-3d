import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Rocket } from "lucide-react";

export function VelocePage() {
  return (
    <div className="flex items-center justify-center min-h-screen p-8">
      <div className="max-w-2xl w-full z-10">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="w-6 h-6" />
              Veloce
            </CardTitle>
            <CardDescription>
              Fast 3D generation coming soon
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-6 bg-muted rounded-lg text-center">
              <p className="text-muted-foreground">
                This feature is currently under development.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
