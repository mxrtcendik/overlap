"use client";

import type { ReactNode } from "react";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Toggle } from "@base-ui/react/toggle";
import { cn } from "./styles";

type Option<Value extends string> = { value: Value; label: ReactNode; title?: string };

export function Segmented<Value extends string>({
  value,
  options,
  onChange,
  size = "md",
  fill = false,
  className,
  ...aria
}: {
  value: Value | null;
  options: Option<Value>[];
  onChange: (value: Value) => void;
  size?: "sm" | "md";
  fill?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}) {
  return (
    <ToggleGroup
      value={value ? [value] : []}
      onValueChange={(next) => {
        const picked = next[0] as Value | undefined;
        if (picked && picked !== value) onChange(picked);
      }}
      className={cn("inline-flex max-w-full gap-px border border-line bg-line", fill && "w-full sm:w-fit", className)}
      {...aria}
    >
      {options.map((option) => (
        <Toggle
          key={option.value}
          value={option.value}
          title={option.title}
          className={cn(
            "inline-flex items-center justify-center gap-2 bg-background whitespace-nowrap text-muted",
            "hover:text-foreground",
            "data-pressed:bg-foreground data-pressed:text-background",
            size === "sm" ? "h-6 px-2 text-xs" : "h-8 px-3 text-sm",
            fill && "min-w-0 flex-1 px-2 sm:flex-none sm:px-3",
          )}
        >
          {option.label}
        </Toggle>
      ))}
    </ToggleGroup>
  );
}
