import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-lg border border-[#D1D5DB] dark:border-teal-500/30 bg-white dark:bg-[#061417] px-3 py-1.5 text-sm text-[#111827] dark:text-white shadow-xs transition-colors placeholder:text-[#9CA3AF] dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008080] dark:focus-visible:ring-teal-400 focus-visible:ring-offset-0 focus-visible:border-[#008080] dark:focus-visible:border-teal-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[#F3F4F6] dark:disabled:bg-slate-900",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
