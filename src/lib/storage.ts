// IndexedDB wrapper. Every call is wrapped so a storage failure never crashes a round.
import { createStore, del, get, set, clear, type UseStore } from 'idb-keyval'

let store: UseStore | null = null
const memory = new Map<string, unknown>()
let useMemory = false

function getStore(): UseStore | null {
  if (useMemory) return null
  if (store) return store
  try {
    if (typeof indexedDB === 'undefined') {
      useMemory = true
      return null
    }
    store = createStore('orbit-db', 'kv')
    return store
  } catch {
    useMemory = true
    return null
  }
}

export async function load<T>(key: string, fallback: T): Promise<T> {
  const s = getStore()
  if (!s) return (memory.has(key) ? (memory.get(key) as T) : fallback)
  try {
    const v = await get<T>(key, s)
    return v === undefined ? fallback : v
  } catch {
    return (memory.has(key) ? (memory.get(key) as T) : fallback)
  }
}

export async function save<T>(key: string, value: T): Promise<boolean> {
  memory.set(key, value)
  const s = getStore()
  if (!s) return false
  try {
    await set(key, value, s)
    return true
  } catch {
    return false
  }
}

export async function remove(key: string): Promise<void> {
  memory.delete(key)
  const s = getStore()
  if (!s) return
  try {
    await del(key, s)
  } catch {
    /* ignore */
  }
}

export async function wipeAll(): Promise<void> {
  memory.clear()
  const s = getStore()
  if (!s) return
  try {
    await clear(s)
  } catch {
    /* ignore */
  }
}

export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist()
  } catch {
    /* ignore */
  }
  return false
}

/** Test hook. */
export function _resetStorageForTests(): void {
  store = null
  useMemory = false
  memory.clear()
}
