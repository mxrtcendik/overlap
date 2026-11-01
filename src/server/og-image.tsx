import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

const BACKGROUND = "#f4f3ef";
const PAPER = [0xff, 0xfc, 0xf7];
const INK = "#221f1b";
const MUTED = "#6d675f";
const LINE = "#ddd8cf";
const LINE_STRONG = "#c4bdb1";
const ACCENT = [0x3f, 0x6f, 0x52];

export type OgCell = { count: number; outlined: boolean } | null;

function heatColor(count: number, people: number): string {
  const share = count === 0 ? 0 : 0.16 + (count / Math.max(people, 1)) * 0.84;
  const mix = PAPER.map((paper, index) => Math.round(paper + (ACCENT[index] - paper) * share));
  return `rgb(${mix.join(", ")})`;
}

function Mark({ size }: { size: number }) {
  const cell = Math.round(size * 0.42);
  const square = (color: string) => <div style={{ width: cell, height: cell, borderRadius: 3, background: color }} />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: size - cell * 2 }}>
      <div style={{ display: "flex", gap: size - cell * 2 }}>
        {square(LINE_STRONG)}
        {square(LINE_STRONG)}
      </div>
      <div style={{ display: "flex", gap: size - cell * 2 }}>
        {square(LINE_STRONG)}
        {square(`rgb(${ACCENT.join(", ")})`)}
      </div>
    </div>
  );
}

export function ogImage({
  title,
  line,
  columns,
  people,
}: {
  title: string;
  line: string;
  columns: OgCell[][];
  people: number;
}) {
  const shown = title.length > 70 ? `${title.slice(0, 68).trimEnd()}…` : title;
  const rows = Math.max(1, ...columns.map((column) => column.length));
  const gap = columns.length > 7 || rows > 12 ? 4 : 6;
  const area = { width: 380, height: 450 };
  const cell = Math.floor(
    Math.min(
      52,
      (area.width - gap * (columns.length - 1)) / Math.max(columns.length, 1),
      (area.height - gap * (rows - 1)) / rows,
    ),
  );

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: BACKGROUND, padding: 72, color: INK }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, paddingRight: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 30 }}>
            <Mark size={24} />
            overlap
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: shown.length > 36 ? 58 : 72, lineHeight: 1.08, letterSpacing: "-0.025em" }}>
              {shown}
            </div>
            <div style={{ display: "flex", marginTop: 28, fontSize: 30, lineHeight: 1.35, color: MUTED }}>{line}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: area.width }}>
          <div style={{ display: "flex", gap }}>
            {columns.map((column, c) => (
              <div key={c} style={{ display: "flex", flexDirection: "column", gap }}>
                {column.map((item, r) =>
                  item ? (
                    <div
                      key={r}
                      style={{
                        width: cell,
                        height: cell,
                        borderRadius: 3,
                        background: heatColor(item.count, people),
                        border: `${item.outlined ? 3 : 1.5}px solid ${item.outlined ? INK : LINE}`,
                      }}
                    />
                  ) : (
                    <div key={r} style={{ width: cell, height: cell }} />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
