import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "@/lib/utils";
export const Badge = ({ className, ...props }) => (_jsx("span", { className: cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", className), ...props }));
