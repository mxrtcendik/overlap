// The slice of Bun's built-in SQLite that the tests use, so the project doesn't need Bun's global types.
declare module "bun:sqlite" {
  export class Database {
    constructor(filename?: string);
    exec(sql: string): void;
    close(): void;
  }
}
