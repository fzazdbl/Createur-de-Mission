import { computed, reactive } from 'vue';
import type { NoteRecord } from '../types/mission';
import { loadNotes, saveNotes } from '../services/storage';
import { flushPrivateVaultSnapshot, setPrivateVaultSnapshot } from '../services/privateVaultSync';

function normalizeNote(note: NoteRecord): NoteRecord {
  return {
    themeKey: 'general',
    themeLabel: 'Général',
    entities: [],
    relatedNotes: [],
    summary: '',
    ...note,
  };
}

const state = reactive({
  notes: loadNotes<NoteRecord[]>([]).map(normalizeNote),
});

function persist(): void {
  saveNotes(state.notes);
  setPrivateVaultSnapshot({ notes: state.notes });
  void flushPrivateVaultSnapshot();
}

export function useNotesStore() {
  const notes = computed(() => state.notes);

  function addNote(note: NoteRecord) {
    state.notes.unshift(note);
    persist();
  }

  function notesByMission(missionId: string) {
    return computed(() => state.notes.filter((note) => note.missionId === missionId));
  }

  function replaceNotes(notes: NoteRecord[]) {
    state.notes = notes.map(normalizeNote);
    persist();
  }

  return { notes, addNote, notesByMission, replaceNotes };
}
