// Everything here lives only on the user's device (localStorage). The server never sees it.
// Only the nickname and avatar are sent, and only inside a room, and only while you're in it.
const KEY = 'sidechick.v2';
const fresh = () => ({ name: '', av: 'a0', adult: false, cid: (crypto.randomUUID?.() || String(Math.random())).slice(0, 18),
  streak: 0, lastDay: '', games: 0, chats: 0, badges: {}, interests: [], qotd: null, prefs: { bg: true, haptics: true, brandTheme: 'twilight' } });

let data;
try { data = { ...fresh(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { data = fresh(); }
if (!/^a\d{1,2}$/.test(data.av || '')) data.av = 'a0';        // older saves used emoji avatars
delete data.emoji;
data.prefs = { bg: true, haptics: true, brandTheme: 'twilight', ...(data.prefs || {}) };
export const store = data;
export const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {} };

export const BADGES = {
  first_chat: { icon: 'message-circle', t: 'Icebreaker', d: 'Chat with a stranger' },
  first_game: { icon: 'gamepad-2', t: 'Player one', d: 'Finish a game' },
  perfect:    { icon: 'trophy', t: 'Mind meld', d: 'Score 100% in a game' },
  streak3:    { icon: 'flame', t: 'On fire', d: 'Play 3 days in a row' },
  night:      { icon: 'moon-star', t: 'Night owl', d: 'Play after midnight' },
  inviter:    { icon: 'share-2', t: 'Connector', d: 'Invite someone' },
};

const dayKey = d => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const yesterday = () => { const y = new Date(); y.setDate(y.getDate() - 1); return dayKey(y); };

/** Streak counts days you actually played or chatted, not days you just opened the app. */
export function currentStreak() { return data.lastDay === dayKey(new Date()) || data.lastDay === yesterday() ? data.streak : 0; }
export const doneToday = () => data.lastDay === dayKey(new Date());
export function recordActivity() {
  const today = dayKey(new Date());
  if (data.lastDay === today) return false;
  data.streak = data.lastDay === yesterday() ? data.streak + 1 : 1;
  data.lastDay = today; save(); return true;
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
