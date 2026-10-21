// File des événements `combat` et `spawn` de la scène (la pause, elle, s'applique immédiatement) : pure, sans DOM, pilotée par l'horloge de la scène (figée en pause).
// Les événements sont rejoués dans l'ordre ; avant `ready()` rien n'est livré, et après un coup fatal
// ni nouveau coup ni apparition ne passent avant la fin de la chute.
export const FALL_MS = 1010; // 360 ms avant la chute + 650 ms d'animation de mort
export const MAX_PENDING = 2; // au-delà (onglet masqué : l'horloge de la scène est figée), on ne garde que l'état courant

// Ne garde que le dernier coup et la dernière apparition, dans leur ordre d'arrivée.
function compact(pending) {
  const lastCombat = pending.findLastIndex(e => e.type === 'combat');
  const lastSpawn = pending.findLastIndex(e => e.type === 'spawn');
  const kept = pending.filter((e, i) => i === lastCombat || i === lastSpawn);
  pending.splice(0, pending.length, ...kept);
}

export function createSceneQueue(deliver, fallMs = FALL_MS) {
  const pending = [];
  let loaded = false, blockedUntil = -Infinity;
  function flush(time) {
    if (!loaded) return;
    while (pending.length) {
      const { type, detail } = pending[0];
      if (time < blockedUntil) return;
      pending.shift();
      if (type === 'combat' && detail.defeated) blockedUntil = time + fallMs;
      deliver(type, detail, time);
    }
  }
  return {
    push(type, detail, time) {
      pending.push({ type, detail });
      if (loaded && pending.length > MAX_PENDING) compact(pending);
      flush(time);
    },
    ready(time) { loaded = true; flush(time); },
    flush,
    get size() { return pending.length; }
  };
}
