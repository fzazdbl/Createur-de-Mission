const MISSION_KEY = 'createur-mission:missions';
const NOTE_KEY = 'createur-mission:notes';

export function loadJson<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadMissions<T>(fallback: T): T {
  return loadJson(MISSION_KEY, fallback);
}

export function saveMissions<T>(value: T): void {
  saveJson(MISSION_KEY, value);
}

export function loadNotes<T>(fallback: T): T {
  return loadJson(NOTE_KEY, fallback);
}

export function saveNotes<T>(value: T): void {
  saveJson(NOTE_KEY, value);
}
