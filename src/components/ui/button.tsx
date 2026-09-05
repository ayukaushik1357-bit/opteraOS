import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium cursor-pointer transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008080] focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#008080] text-white shadow-xs hover:bg-[#006666] active:bg-[#004d4d]",
        destructive:
          "bg-red-600 text-white shadow-xs hover:bg-red-700 active:bg-red-800",
        outline:
          "border border-[rgba(0,128,128,0.22)] bg-white text-[#0F2423] font-medium shadow-xs hover:bg-[#EDF4F3] hover:text-[#008080] hover:border-[#008080] active:bg-[#E2ECEB]",
        secondary:
          "bg-[#E8F1F0] text-[#0F2423] font-medium hover:bg-[#DEE9E8] hover:text-[#006666] active:bg-[#D1E0DE]",
        ghost:
          "text-[#0F2423] hover:bg-[rgba(0,128,128,0.08)] hover:text-[#008080] active:bg-[rgba(0,128,128,0.14)]",
        link:
          "text-[#008080] underline-offset-4 hover:underline hover:text-[#006666]",
        brand:
          "bg-gradient-to-r from-[#008080] via-[#0D9488] to-[#14B8A6] text-white font-semibold shadow-xs hover:opacity-95 active:opacity-90",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-lg px-6 text-sm font-semibold",
        xl: "h-12 rounded-lg px-8 text-base font-semibold",
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
