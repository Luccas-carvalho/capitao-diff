import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "@/lib/utils";
export const Card = ({ className, ...props }) => (_jsx("div", { className: cn("rounded-2xl border border-cyan-500/20 bg-slate-900/60 p-6 shadow-[0_0_40px_rgba(34,211,238,0.12)] backdrop-blur", className), ...props }));
