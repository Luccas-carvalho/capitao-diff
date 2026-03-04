import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "@/lib/utils";
export const Card = ({ className, ...props }) => (_jsx("div", { className: cn("rounded-xl border border-slate-200 bg-white p-5 shadow-sm", className), ...props }));
