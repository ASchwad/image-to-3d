import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
}

export function AppLayout({ children, sidebar }: AppLayoutProps) {
  const [sidebarWidth, setSidebarWidth] = useState(64);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar Component */}
      <Sidebar content={sidebar} onWidthChange={setSidebarWidth} />

      {/* Main Content - dynamically adjusts to sidebar width */}
      <div
        className="flex-1 transition-all duration-300"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        {/* Page Content */}
        <div className="min-h-screen">{children}</div>
      </div>
    </div>
  );
}
