// Everything here lives only on the user's device (localStorage). Nothing is sent to the server except
// the nickname/emoji used inside a room.
const KEY = 'sidechick.v2';
const fresh = () => ({ name: '', emoji: '😎', adult: false, cid: (crypto.randomUUID?.() || String(Math.random())).slice(0, 18),
  streak: 0, lastDay: '', games: 0, chats: 0, badges: {}, interests: [] });

let data;
try { data = { ...fresh(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { data = fresh(); }
export const store = data;
export const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {} };

export const BADGES = {
  first_chat: { e: '🎭', t: 'Icebreaker', d: 'Chat with a stranger' },
  first_game: { e: '🎮', t: 'Player one', d: 'Finish a game' },
  perfect:    { e: '💯', t: 'Mind meld', d: 'Score 100% in a game' },
  streak3:    { e: '🔥', t: 'On fire', d: 'Visit 3 days in a row' },
  night:      { e: '🌙', t: 'Night owl', d: 'Play after midnight' },
  inviter:    { e: '💌', t: 'Connector', d: 'Invite someone' },
};

const dayKey = d => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
export function touchStreak() {
  const now = new Date(), today = dayKey(now);
  if (data.lastDay === today) return;
  const y = new Date(now); y.setDate(y.getDate() - 1);
  data.streak = data.lastDay === dayKey(y) ? data.streak + 1 : 1;
  data.lastDay = today; save();
}
export function bump(key) { data[key] = (data[key] || 0) + 1; save(); }
/** returns the badge object if newly unlocked, else null */
export function unlock(id) {
  if (!BADGES[id] || data.badges[id]) return null;
  data.badges[id] = Date.now(); save(); return BADGES[id];
}
export function resetAll() {
  try { localStorage.removeItem(KEY); } catch {}
  Object.keys(data).forEach(k => delete data[k]); Object.assign(data, fresh());
}
