const EMPTY_STATE = () => ({ version: 1, offset: 0, users: {} });

export async function openKvStore(kv) {
  const stored = await kv.get('state', { type: 'json' });
  const state = stored && stored.version === 1 && stored.users &&
    typeof stored.users === 'object' && !Array.isArray(stored.users)
    ? stored
    : EMPTY_STATE();

  return {
    state,
    async save() {
      await kv.put('state', JSON.stringify(state));
    },
  };
}
