import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:brightness-95 active:brightness-90",
        accent: "bg-accent text-accent-foreground hover:brightness-95 active:brightness-90",
        secondary: "bg-secondary text-secondary-foreground hover:brightness-95",
        outline: "border border-border bg-card text-foreground hover:bg-secondary/60",
        ghost: "text-foreground hover:bg-secondary/60",
        danger: "bg-danger text-danger-foreground hover:brightness-95",
        link: "h-auto rounded-none px-0 text-foreground underline decoration-current/30 underline-offset-4 hover:decoration-current",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-5 text-sm",
        lg: "h-13 px-7 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    carregando?: boolean;
  };

export function Button({ className, variant, size, carregando, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || carregando}
      {...props}
    >
      {carregando ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}
