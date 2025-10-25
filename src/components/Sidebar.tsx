import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from "@/components/ui/menubar";
import {
  ChevronLeft,
  Home,
  Image,
  Box,
  Move3D,
  Sparkles,
  User,
  Settings,
  Video,
} from "lucide-react";

interface SidebarProps {
  content?: React.ReactNode;
  onWidthChange?: (width: number) => void;
}

interface SidebarItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isCollapsed: boolean;
  to: string;
  isActive?: boolean;
}

const SidebarItem = ({
  icon: Icon,
  label,
  isCollapsed,
  to,
  isActive = false,
}: SidebarItemProps) => {
  const navigate = useNavigate();

  return (
    <Button
      variant={isActive ? "secondary" : "ghost"}
      onClick={() => navigate(to)}
      className="w-full h-12 justify-start"
    >
      <div className="flex justify-start shrink-0">
        <Icon className="h-5 w-5" />
      </div>
      <span
        className={`text-sm font-medium transition-all duration-300 ${
          isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 ml-3"
        }`}
      >
        {label}
      </span>
    </Button>
  );
};

export function Sidebar({ content, onWidthChange }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const location = useLocation();

  const collapsedWidth = 64; // w-16 = 4rem = 64px
  const expandedWidth = 256; // w-64 = 16rem = 256px

  useEffect(() => {
    onWidthChange?.(isCollapsed ? collapsedWidth : expandedWidth);
  }, [isCollapsed, onWidthChange]);

  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed(!isCollapsed);
  }, [isCollapsed]);

  const handleCloseCollapse = useCallback(() => {
    setIsCollapsed(true);
  }, []);

  return (
    <aside
      className={`fixed top-0 left-0 h-full bg-background border-r transition-all duration-300 ease-in-out z-50 flex flex-col ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Header with logo and toggle */}
      <div className="group">
        <div className="flex items-center justify-between py-4">
          {/* Logo area - clickable to toggle */}
          <div className="w-16 flex justify-center">
            <button
              onClick={handleToggleCollapse}
              className="p-3 rounded-lg transition-all hover:bg-accent"
              aria-label="Toggle sidebar"
            >
              <Sparkles className="h-6 w-6" />
            </button>
          </div>

          {/* Title and close button */}
          <div
            className={`flex items-center justify-between flex-1 overflow-hidden transition-all duration-300 ${
              isCollapsed ? "w-0 opacity-0" : "opacity-100"
            }`}
          >
            <h2 className="font-semibold text-lg">GumoStudio</h2>
            <div
              className={`pr-4 transition-opacity duration-200 ${
                isCollapsed ? "opacity-0" : "opacity-0 group-hover:opacity-100"
              }`}
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCloseCollapse}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Section */}
      <div className="px-2 pb-4">
        <SidebarItem
          icon={Home}
          label="Home"
          isCollapsed={isCollapsed}
          to="/"
          isActive={location.pathname === "/"}
        />
        <SidebarItem
          icon={Box}
          label="Generate image + 3D"
          isCollapsed={isCollapsed}
          to="/generate-3d-assets"
          isActive={location.pathname === "/generate-3d-assets"}
        />
        <SidebarItem
          icon={Image}
          label="Single Image"
          isCollapsed={isCollapsed}
          to="/single-image"
          isActive={location.pathname === "/single-image"}
        />
        <SidebarItem
          icon={Move3D}
          label="Veloce"
          isCollapsed={isCollapsed}
          to="/veloce"
          isActive={location.pathname === "/veloce"}
        />
        <SidebarItem
          icon={Video}
          label="Sora Video"
          isCollapsed={isCollapsed}
          to="/sora"
          isActive={location.pathname === "/sora"}
        />
      </div>

      {/* Custom Content - Only show when expanded */}
      {!isCollapsed && content && (
        <div className="flex-1 overflow-y-auto px-4 pb-4">{content}</div>
      )}

      {/* Spacer when collapsed to push bottom content down */}
      {isCollapsed && <div className="flex-1" />}

      {/* Bottom Section */}
      <div className="px-2 py-4">
        {/* Profile Menu */}
        <Menubar className="border-0 bg-transparent shadow-none p-0 h-auto w-full">
          <MenubarMenu>
            <MenubarTrigger
              className={`w-full h-12 rounded-md bg-transparent hover:bg-accent focus:bg-accent data-[state=open]:bg-accent shadow-none border-none transition-all duration-300 ${
                isCollapsed ? "px-0 justify-center" : "px-3 justify-start gap-2"
              }`}
            >
              <div className="rounded-full bg-primary flex items-center justify-center shrink-0 w-8 h-8 text-primary-foreground font-medium text-sm">
                A
              </div>
              <span
                className={`text-sm text-muted-foreground truncate transition-all duration-300 ${
                  isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
                }`}
              >
                Profile
              </span>
            </MenubarTrigger>
            <MenubarContent>
              <MenubarItem>
                <User className="h-4 w-4 mr-2" />
                Account
              </MenubarItem>
              <MenubarItem>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </div>
    </aside>
  );
}
