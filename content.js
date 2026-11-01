/* In-page UI. Everything runs inside the user's own logged-in leetcode.com tab. */
(function () {
  'use strict';
  if (window.__lcxLoaded) return;
  window.__lcxLoaded = true;

  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <style>
      *{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
      .fab{background:#ffa116;color:#1a1a1a;border:0;border-radius:999px;padding:10px 16px;font-weight:600;font-size:13px;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.3)}
      .card{display:none;width:320px;background:#262626;color:#eee;border-radius:12px;padding:16px;box-shadow:0 6px 24px rgba(0,0,0,.45);font-size:13px}
      .card.open{display:block} h3{margin:0 0 4px;font-size:15px} p{margin:0 0 10px;color:#aaa;line-height:1.4}
      label{display:block;margin:6px 0;cursor:pointer} .hint{color:#888;font-size:11px;margin-left:22px}
      .row{display:flex;gap:8px;margin-top:12px} button.b{flex:1;border:0;border-radius:8px;padding:9px;font-weight:600;cursor:pointer}
      .go{background:#ffa116;color:#1a1a1a} .stop{background:#444;color:#eee} button:disabled{opacity:.5;cursor:default}
      .bar{height:8px;background:#444;border-radius:4px;overflow:hidden;margin-top:12px;display:none} .bar i{display:block;height:100%;width:0;background:#2cbb5d;transition:width .3s}
      .msg{margin-top:8px;color:#bbb;min-height:16px;word-break:break-word} .x{float:right;background:none;border:0;color:#aaa;font-size:16px;cursor:pointer}
    </style>
    <button class="fab">⬇ Export submissions</button>
    <div class="card">
      <button class="x" title="Close">×</button>
      <h3>Export my submissions</h3>
      <p>Downloads a ZIP of your own code. Nothing leaves your browser.</p>
      <label><input type="radio" name="mode" value="all"> All submissions<div class="hint">Wrong attempts too, oldest to newest</div></label>
      <label><input type="radio" name="mode" value="accepted" checked> Accepted only<div class="hint">Every accepted submission</div></label>
      <label><input type="radio" name="mode" value="latest"> Latest accepted per problem<div class="hint">One file per solved problem</div></label>
      <div class="row"><button class="b go">Start export</button><button class="b stop" disabled>Cancel</button></div>
      <div class="bar"><i></i></div>
      <div class="msg"></div>
    </div>`;
  document.documentElement.appendChild(host);

  const $ = (s) => root.querySelector(s);
  const fab = $('.fab'), card = $('.card'), go = $('.go'), stop = $('.stop'), bar = $('.bar'), fill = $('.bar i'), msg = $('.msg');
  let cancelled = false, running = false;

  fab.onclick = () => { card.classList.add('open'); fab.style.display = 'none'; };
  $('.x').onclick = () => { if (running) return; card.classList.remove('open'); fab.style.display = ''; };
  stop.onclick = () => { cancelled = true; msg.textContent = 'Cancelling… your partial export will still download.'; };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function gql(query, variables) {
    for (let t = 0; t < 4; t++) {
      try {
        const c = new AbortController();
        const to = setTimeout(() => c.abort(), 25000);
        const r = await fetch('/graphql', { method: 'POST', signal: c.signal, credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
        clearTimeout(to);
        if (r.status === 429) { await sleep(5000 * (t + 1)); continue; }
        const j = await r.json();
        if (j.errors && !j.data) throw new Error(j.errors[0].message);
        return j;
      } catch (e) {
        if (t === 3) throw e;
        await sleep(1500 * (t + 1));
      }
    }
  }

  go.onclick = async () => {
    const mode = root.querySelector('input[name=mode]:checked').value;
    running = true; cancelled = false;
    go.disabled = true; stop.disabled = false; bar.style.display = 'block'; fill.style.width = '0%';
    try {
      const me = (await gql('query{userStatus{isSignedIn username}}')).data.userStatus;
      if (!me.isSignedIn) throw new Error('Please log in to leetcode.com first.');
      msg.textContent = 'Listing your problems…';
      const result = await LCX.collect({
        gql, sleep, mode,
        isCancelled: () => cancelled,
        onProgress: (p) => {
          fill.style.width = Math.round((p.done / p.total) * 100) + '%';
          msg.textContent = `${p.done}/${p.total} problems · ${p.saved} submissions · keep this tab open`;
        },
      });
      msg.textContent = 'Building ZIP…';
      const blob = LCX.makeZip(LCX.buildFiles(result, mode, me.username));
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `leetcode-${me.username}-${mode}.zip`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 60000);
      fill.style.width = '100%';
      msg.textContent = `Done: ${result.kept.length} submissions saved` + (result.failed.length ? `, ${result.failed.length} could not be downloaded (see FAILED.txt).` : '.');
    } catch (e) {
      msg.textContent = 'Error: ' + (e && e.message ? e.message : e);
    } finally {
      running = false; go.disabled = false; stop.disabled = true;
    }
  };
})();
