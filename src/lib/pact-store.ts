import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { PactCase, Transaction } from "@/lib/mock-data";

export type PendingOrder = { id: string; captureRequestId: string; createdAt: string };
export type PactStore = { orders: PendingOrder[]; transactions: Transaction[]; cases: PactCase[] };
const file = path.join(process.cwd(), ".data", "pact.json");
const empty = (): PactStore => ({ orders: [], transactions: [], cases: [] });
let queue: Promise<unknown> = Promise.resolve();

export async function readPactStore(): Promise<PactStore> {
  try {
    const parsed = JSON.parse(await readFile(file, "utf8")) as Partial<PactStore>;
    return { orders: parsed.orders ?? [], transactions: parsed.transactions ?? [], cases: parsed.cases ?? [] };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return empty();
    throw error;
  }
}

async function writePactStore(store: PactStore) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(store, null, 2), { encoding: "utf8", mode: 0o600 });
  await rename(temporary, file);
}

// Serializes local demo writes. This file store is intended for one local Next.js process.
export function changePactStore<T>(change: (store: PactStore) => T | Promise<T>): Promise<T> {
  const operation = queue.then(async () => {
    const store = await readPactStore();
    const result = await change(store);
    await writePactStore(store);
    return result;
  });
  queue = operation.catch(() => undefined);
  return operation;
}
