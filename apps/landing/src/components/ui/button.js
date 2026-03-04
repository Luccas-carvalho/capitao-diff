import { jsx as _jsx } from "react/jsx-runtime";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
const buttonVariants = cva("inline-flex items-center justify-center rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950", {
    variants: {
        variant: {
            default: "bg-cyan-500 text-slate-950 hover:bg-cyan-400",
            secondary: "bg-slate-800 text-slate-100 hover:bg-slate-700",
            ghost: "text-slate-200 hover:bg-slate-800"
        },
        size: {
            default: "h-10 px-4 py-2",
            lg: "h-11 px-8",
            sm: "h-9 px-3"
        }
    },
    defaultVariants: {
        variant: "default",
        size: "default"
    }
});
export const Button = ({ className, variant, size, ...props }) => (_jsx("button", { className: cn(buttonVariants({ variant, size, className })), ...props }));
