// Thin WebSocket wrapper with a send queue and a keep-alive ping.
export const backend = () => {
  if (typeof window !== 'undefined') {
    if (window.SIDECHICK_BACKEND) return window.SIDECHICK_BACKEND.replace(/\/+$/, '');
    try {
      const q = new URLSearchParams(window.location.search).get('backend');
      if (q) return q.replace(/\/+$/, '');
      const s = localStorage.getItem('sidechick.backend');
      if (s) return s.replace(/\/+$/, '');
    } catch {}
  }
  return (typeof location !== 'undefined' && location.origin ? location.origin : 'http://127.0.0.1:8787');
};

export class Conn {
  constructor(path, handlers = {}) {
    this.h = handlers; this.queue = []; this.dead = false;
    this.ws = new WebSocket(backend().replace(/^http/, 'ws') + path);
    this.ws.onopen = () => {
      this.ping = setInterval(() => this.send({ t: 'ping' }), 5000);
      this.h.open?.();
      for (const o of this.queue.splice(0)) this.send(o);
    };
    this.ws.onmessage = e => {
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m.t !== 'pong') this.h.msg?.(m);
    };
    this.ws.onclose = () => { clearInterval(this.ping); if (!this.dead) { this.dead = true; this.h.close?.(); } };
    this.ws.onerror = () => {};
  }
  send(o) {
    if (this.ws.readyState === 1) this.ws.send(JSON.stringify(o));
    else if (this.ws.readyState === 0) this.queue.push(o);
  }
  close() {
    this.dead = true;
    clearInterval(this.ping);
    try {
      if (this.ws.readyState === 1) this.ws.send(JSON.stringify({ t: 'cancel' }));
      this.ws.close();
    } catch {}
  }
}

export async function waitingCount() {
  try {
    const r = await fetch(backend() + '/api/stats', { cache: 'no-store' });
    if (!r.ok) return 0;
    const d = await r.json();
    return typeof d.waiting === 'number' ? d.waiting : 0;
  } catch { return 0; }
}

export async function fetchQotd(day) {
  try {
    const r = await fetch(`${backend()}/api/qotd?day=${day}`, { cache: 'no-store' });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

export async function voteQotd(day, choice, cid) {
  try {
    const r = await fetch(`${backend()}/api/qotd`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ day, choice, cid })
    });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}
