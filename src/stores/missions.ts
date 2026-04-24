import { computed, reactive } from 'vue';
import type { MissionRecord, ScopePattern } from '../types/mission';
import { loadMissions, saveMissions } from '../services/storage';
import { flushPrivateVaultSnapshot, setPrivateVaultSnapshot } from '../services/privateVaultSync';

function normalizeMission(mission: MissionRecord): MissionRecord {
  return {
    scopeText: '',
    scopePatterns: [] as ScopePattern[],
    themeTags: [],
    dossierSummary: '',
    ...mission,
  };
}

const state = reactive({
  missions: loadMissions<MissionRecord[]>([]).map(normalizeMission),
});

function persist(): void {
  saveMissions(state.missions);
  setPrivateVaultSnapshot({ missions: state.missions });
  void flushPrivateVaultSnapshot();
}

export function useMissionStore() {
  const missions = computed(() => state.missions);

  function addMission(mission: MissionRecord) {
    state.missions.unshift(mission);
    persist();
  }

  function updateMission(updated: MissionRecord) {
    const index = state.missions.findIndex((mission) => mission.id === updated.id);
    if (index >= 0) {
      state.missions[index] = updated;
      persist();
    }
  }

  function removeMission(id: string) {
    state.missions = state.missions.filter((mission) => mission.id !== id);
    persist();
  }

  function replaceMissions(missions: MissionRecord[]) {
    state.missions = missions.map(normalizeMission);
    persist();
  }

  return { missions, addMission, updateMission, removeMission, replaceMissions };
}
