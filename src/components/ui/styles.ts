import { clsx, type ClassValue } from "clsx";
import { cva, type VariantProps } from "class-variance-authority";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const press =
  "transition-[scale,background-color,border-color,color,opacity] duration-150 ease-ui active:not-disabled:scale-[0.98] motion-reduce:active:not-disabled:scale-100";

export const button = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-[2px] font-medium whitespace-nowrap select-none",
    "disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:opacity-50",
    "[&_svg]:size-4 [&_svg]:shrink-0",
    press,
  ],
  {
    variants: {
      variant: {
        primary: "bg-foreground text-background hover:not-disabled:bg-foreground/80",
        accent: "bg-accent text-on-accent hover:not-disabled:bg-accent/90",
        secondary: "border border-line bg-transparent text-foreground hover:not-disabled:border-line-strong hover:not-disabled:bg-sunken",
        ghost: "text-muted hover:not-disabled:bg-sunken hover:not-disabled:text-foreground",
        danger: "bg-danger text-white hover:not-disabled:bg-danger/90 dark:text-zinc-950",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-9 px-3.5 text-sm",
        lg: "h-11 px-5 text-[15px]",
        icon: "size-8",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonVariants = VariantProps<typeof button>;

export const field = cva(
  [
    "block w-full rounded-[2px] border border-line bg-paper text-foreground",
    "placeholder:text-muted/70 transition-[border-color] duration-150",
    "hover:border-line-strong",
    "disabled:cursor-not-allowed disabled:opacity-60",
  ],
  {
    variants: {
      size: {
        md: "h-9 px-3 text-sm",
        sm: "h-8 px-2.5 text-[13px]",
        select: "h-9 w-auto py-0 pr-8 pl-3 text-sm",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export const link = cva(
  "text-sm underline decoration-transparent underline-offset-4 transition-colors duration-150 disabled:opacity-50",
  {
    variants: {
      tone: {
        quiet: "text-muted hover:not-disabled:text-foreground hover:decoration-line-strong",
        danger: "text-muted hover:not-disabled:text-danger hover:not-disabled:decoration-current",
        accent: "font-medium text-accent hover:decoration-current",
      },
    },
    defaultVariants: { tone: "quiet" },
  },
);

export const card = "border border-line bg-paper";

export const label = "text-[13px] font-medium text-foreground";

export const hint = "text-xs text-muted";

export const selectChrome =
  "cursor-pointer appearance-none bg-[length:0.7rem] bg-[position:right_0.65rem_center] bg-no-repeat [background-image:var(--select-chevron)]";

export const appear =
  "transition-[opacity,translate] duration-[180ms] ease-ui starting:translate-y-1 starting:opacity-0 motion-reduce:transition-opacity motion-reduce:duration-[120ms] motion-reduce:starting:translate-y-0";

export const arrive =
  "transition-[opacity,translate] duration-[240ms] ease-ui starting:translate-y-1.5 starting:opacity-0 motion-reduce:transition-opacity motion-reduce:duration-150 motion-reduce:starting:translate-y-0";

export const heading = {
  page: "font-display text-[2.35rem] leading-[1.08] font-medium tracking-[-0.02em] text-balance sm:text-[2.75rem] sm:leading-[1.05]",
  section: "text-base font-medium tracking-tight",
};
