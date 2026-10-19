// Thin WebSocket wrapper with a send queue and a keep-alive ping.
export const backend = () => window.SIDECHICK_BACKEND || location.origin;

export class Conn {
  constructor(path, handlers = {}) {
    this.h = handlers; this.queue = []; this.dead = false;
    this.ws = new WebSocket(backend().replace(/^http/, 'ws') + path);
    this.ws.onopen = () => {
      this.ping = setInterval(() => this.send({ t: 'ping' }), 20000);
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
  close() { this.dead = true; clearInterval(this.ping); try { this.ws.close(); } catch {} }
}

export async function waitingCount() {
  try { const r = await fetch(backend() + '/api/stats'); return (await r.json()).waiting; } catch { return null; }
}
