export function ymd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function buildSlots(dates: string[], startMin: number, endMin: number): string[] {
  const slots: string[] = [];
  for (const date of [...dates].sort()) {
    const [year, month, day] = date.split("-").map(Number);
    for (let minute = startMin; minute < endMin; minute += 30) {
      const local = new Date(year, month - 1, day, Math.floor(minute / 60), minute % 60, 0, 0);
      slots.push(local.toISOString());
    }
  }
  return slots;
}

export function inferSchedule(slots: string[]): { dates: string[]; start: number; end: number } {
  const byDate = new Map<string, number[]>();
  for (const iso of slots) {
    const date = new Date(iso);
    const key = ymd(date);
    const minutes = date.getHours() * 60 + date.getMinutes();
    const list = byDate.get(key) ?? [];
    list.push(minutes);
    byDate.set(key, list);
  }
  let start = 24 * 60;
  let end = 0;
  for (const minutes of byDate.values()) {
    start = Math.min(start, ...minutes);
    end = Math.max(end, ...minutes.map((minute) => minute + 30));
  }
  start = Math.floor(start / 30) * 30;
  end = Math.ceil(end / 30) * 30;
  if (end > 24 * 60) end = 24 * 60;
  if (end - start > 12 * 60) end = start + 12 * 60;
  if (end <= start) end = Math.min(24 * 60, start + 30);
  return { dates: [...byDate.keys()].sort(), start, end };
}
