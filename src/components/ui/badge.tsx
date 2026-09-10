import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "success" | "muted" | "destructive" | "accent";

const styles: Record<Variant, string> = {
  default: "bg-primary text-primary-foreground",
  success: "bg-success/15 text-success border border-success/30",
  muted: "bg-muted text-muted-foreground",
  destructive: "bg-destructive/15 text-destructive border border-destructive/30",
  accent: "bg-accent/15 text-accent border border-accent/30",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}
