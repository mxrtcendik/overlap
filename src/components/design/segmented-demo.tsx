"use client";

import { useState } from "react";
import { Segmented } from "@/components/ui/segmented";

export function SegmentedDemo() {
  const [kind, setKind] = useState<"dates" | "weekly" | "options">("dates");
  const [brush, setBrush] = useState<"yes" | "maybe">("yes");
  const [clock, setClock] = useState<"h12" | "h23">("h12");
  return (
    <div className="flex flex-col items-start gap-4">
      <Segmented
        aria-label="Example: ask about"
        value={kind}
        onChange={setKind}
        options={[
          { value: "dates", label: "Specific dates" },
          { value: "weekly", label: "Days of the week" },
          { value: "options", label: "Set times" },
        ]}
      />
      <Segmented
        aria-label="Example: mark times as"
        value={brush}
        onChange={setBrush}
        options={[
          { value: "yes", label: <><span aria-hidden="true" className="inline-block size-3 rounded-[2px] bg-current" />Can make</> },
          { value: "maybe", label: <><span aria-hidden="true" className="hatch inline-block size-3 rounded-[2px] border border-current" />If needed</> },
        ]}
      />
      <Segmented
        aria-label="Example: time format"
        size="sm"
        value={clock}
        onChange={setClock}
        options={[
          { value: "h12", label: "12h" },
          { value: "h23", label: "24h" },
        ]}
      />
    </div>
  );
}
