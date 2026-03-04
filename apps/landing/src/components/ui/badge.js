import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "@/lib/utils";
export const Badge = ({ className, ...props }) => (_jsx("span", { className: cn("inline-flex items-center rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-300", className), ...props }));
