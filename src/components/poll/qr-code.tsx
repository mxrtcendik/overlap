"use client";

import { useEffect, useState } from "react";

const QUIET = 4;

export function QrCode({ value, size = 176 }: { value: string; size?: number }) {
  const [matrix, setMatrix] = useState<boolean[][] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import("uqr").then(({ encode }) => {
      if (!cancelled) setMatrix(encode(value, { ecc: "M" }).data);
    });
    return () => {
      cancelled = true;
    };
  }, [value]);

  if (!matrix) return <div style={{ width: size, height: size, background: "#fffcf7" }} aria-hidden="true" />;

  const count = matrix.length + QUIET * 2;
  let path = "";
  matrix.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark) path += `M${x + QUIET} ${y + QUIET}h1v1h-1z`;
    }),
  );

  return (
    <svg
      role="img"
      aria-label={`QR code for ${value}`}
      viewBox={`0 0 ${count} ${count}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
    >
      <rect width={count} height={count} fill="#fffcf7" />
      <path d={path} fill="#221f1b" />
    </svg>
  );
}
