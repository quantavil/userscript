// The chosen download folder is a File System Access handle, which only IndexedDB can persist.
const dbName = 'better-gmail';
const store = 'folder';
const key = 'download';

type Permission = { mode: 'readwrite' };
export type Folder = FileSystemDirectoryHandle & {
  queryPermission(options: Permission): Promise<PermissionState>;
  requestPermission(options: Permission): Promise<PermissionState>;
};
type Picker = (options: { id: string; mode: 'readwrite' }) => Promise<Folder>;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(mode: IDBTransactionMode, act: (s: IDBObjectStore) => IDBRequest<T>) {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = act(db.transaction(store, mode).objectStore(store));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function resetFolder(): Promise<void> {
  await run('readwrite', (s) => s.delete(key));
}

// Returns the saved folder, or asks for one on first use. Undefined means "use normal downloads"
// (no picker support, cancelled, or permission refused). Call it from a click handler.
export async function getFolder(): Promise<Folder | undefined> {
  try {
    let folder = await run<Folder | undefined>('readonly', (s) => s.get(key));
    if (!folder) {
      const pick = (window as unknown as { showDirectoryPicker?: Picker }).showDirectoryPicker;
      if (!pick) return undefined;
      folder = await pick.call(window, { id: 'better-gmail', mode: 'readwrite' });
      await run('readwrite', (s) => s.put(folder, key));
    }
    const mode = { mode: 'readwrite' } as const;
    if ((await folder.queryPermission(mode)) === 'granted') return folder;
    return (await folder.requestPermission(mode)) === 'granted' ? folder : undefined;
  } catch {
    return undefined;
  }
}

async function freeName(folder: Folder, filename: string): Promise<string> {
  const dot = filename.lastIndexOf('.');
  const [stem, ext] = dot > 0 ? [filename.slice(0, dot), filename.slice(dot)] : [filename, ''];
  for (let n = 0; ; n++) {
    const name = n ? `${stem} (${n})${ext}` : filename;
    try {
      await folder.getFileHandle(name);
    } catch {
      return name;
    }
  }
}

export async function writeFile(folder: Folder, filename: string, data: Blob): Promise<void> {
  const safe = filename.replace(/[\\/]/g, '_') || 'attachment';
  const handle = await folder.getFileHandle(await freeName(folder, safe), { create: true });
  const writable = await handle.createWritable();
  await writable.write(data);
  await writable.close();
}
