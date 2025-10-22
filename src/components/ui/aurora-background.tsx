import { cn } from "@/lib/utils";
import React, { type ReactNode } from "react";

interface AuroraBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  showRadialGradient?: boolean;
}

export const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) => {
  return (
    <div
      className={cn(
        "relative flex min-h-screen flex-col items-center justify-center bg-zinc-50 text-slate-950 transition-bg dark:bg-zinc-900",
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div
          className={cn(
            `pointer-events-none absolute -inset-[10px] opacity-50 blur-[10px] invert filter will-change-transform dark:invert-0`,
            `[background-attachment:fixed] [background-image:var(--white-gradient),var(--aurora)] [background-position:50%_50%,50%_50%] [background-size:300%,_200%]`,
            `after:absolute after:-inset-[10px] after:mix-blend-difference after:content-[""] after:animate-aurora`,
            `after:[background-attachment:fixed] after:[background-image:var(--white-gradient),var(--aurora)] after:[background-size:200%,_100%]`,
            showRadialGradient &&
              `[mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,transparent_70%)]`
          )}
          style={
            {
              "--white-gradient":
                "repeating-linear-gradient(100deg,rgb(255,255,255) 0%,rgb(255,255,255) 7%,transparent 10%,transparent 12%,rgb(255,255,255) 16%)",
              "--aurora":
                "repeating-linear-gradient(100deg,rgb(59,130,246) 10%,rgb(165,180,252) 15%,rgb(147,197,253) 20%,rgb(221,214,254) 25%,rgb(96,165,250) 30%)",
            } as React.CSSProperties
          }
        ></div>
      </div>
      {children}
    </div>
  );
};
