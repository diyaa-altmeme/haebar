import * as React from "react";

import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-[120px] w-full rounded-2xl border border-slate/15 bg-white px-4 py-3 text-sm text-ink shadow-sm outline-none transition placeholder:text-slate/60 focus:border-olive/40 focus:ring-2 focus:ring-olive/10",
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";
