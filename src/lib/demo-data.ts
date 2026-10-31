export const DEMO_START = 9 * 60;
export const DEMO_END = 13 * 60;
export const DEMO_DAYS = 4;
export const DEMO_ROWS = (DEMO_END - DEMO_START) / 30;

export const DEMO_PEOPLE: { name: string; free: [day: number, from: number, to: number][] }[] = [
  { name: "Mina", free: [[0, 0, 4], [1, 2, 8], [2, 0, 6]] },
  { name: "Jonas", free: [[1, 3, 6], [2, 2, 8], [3, 0, 3]] },
  { name: "Priya", free: [[0, 2, 5], [2, 3, 7], [3, 4, 8]] },
  { name: "Theo", free: [[0, 0, 2], [1, 4, 8], [2, 4, 6]] },
];

export function demoCounts(): number[][] {
  return Array.from({ length: DEMO_DAYS }, (_, day) =>
    Array.from({ length: DEMO_ROWS }, (_, row) =>
      DEMO_PEOPLE.filter((person) => person.free.some(([d, from, to]) => d === day && row >= from && row < to)).length,
    ),
  );
}
