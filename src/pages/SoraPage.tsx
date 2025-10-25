import { SoraVideoGenerator } from "@/components/SoraVideoGenerator";

export function SoraPage() {
  return (
    <div className="flex items-center justify-center min-h-screen p-8">
      <div className="max-w-4xl w-full z-10">
        <SoraVideoGenerator />
      </div>
    </div>
  );
}
