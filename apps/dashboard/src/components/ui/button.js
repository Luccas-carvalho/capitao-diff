import { jsx as _jsx } from "react/jsx-runtime";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
const buttonVariants = cva("inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50", {
    variants: {
        variant: {
            default: "bg-sky-600 text-white hover:bg-sky-500",
            secondary: "bg-slate-200 text-slate-900 hover:bg-slate-300",
            ghost: "hover:bg-slate-100"
        },
        size: {
            default: "h-10 px-4",
            sm: "h-9 px-3",
            lg: "h-11 px-8"
        }
    },
    defaultVariants: {
        variant: "default",
        size: "default"
    }
});
export const Button = ({ className, variant, size, ...props }) => (_jsx("button", { className: cn(buttonVariants({ variant, size, className })), ...props }));
