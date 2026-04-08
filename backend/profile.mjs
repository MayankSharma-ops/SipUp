function createDefaultSchedule() {
  return {
    1: { hour: 17, minute: 0, isRest: true },
    2: { hour: 17, minute: 0, isRest: false },
    3: { hour: 17, minute: 0, isRest: false },
    4: { hour: 17, minute: 0, isRest: false },
    5: { hour: 17, minute: 0, isRest: false },
    6: { hour: 17, minute: 0, isRest: false },
    7: { hour: 17, minute: 0, isRest: true },
  };
}

function createTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function createDefaultProfileData() {
  return {
    history: {
      history: [],
      streak: 0,
    },
    water: {
      intake: 0,
      goal: 3000,
      lastUpdatedDate: createTodayKey(),
      lastAppOpenDate: null,
      lastDrinkTimestamp: null,
      wakeUpTime: null,
      drinkLogs: [],
      lifetimeXp: 0,
      companionState: 'neutral',
    },
    workout: {
      schedule: createDefaultSchedule(),
    },
  };
}

export function isValidProfilePayload(value) {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return (
    typeof value.history === 'object' &&
    value.history !== null &&
    typeof value.water === 'object' &&
    value.water !== null &&
    typeof value.workout === 'object' &&
    value.workout !== null
  );
}

export function normalizeProfilePayload(value) {
  return isValidProfilePayload(value) ? value : createDefaultProfileData();
}
