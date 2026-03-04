import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const Card = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "rounded-2xl border border-cyan-500/20 bg-slate-900/60 p-6 shadow-[0_0_40px_rgba(34,211,238,0.12)] backdrop-blur",
      className
    )}
    {...props}
  />
);
