export async function loadKey<T>(key: string, fallback: T): Promise<T> {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
}

export async function saveKey<T>(key: string, value: T): Promise<boolean> {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
