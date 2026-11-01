/* Core logic for the LeetCode Submission Exporter.
 * Pure functions: the network layer (gql) and sleep are injected, so this file runs in the
 * browser (content script) and in Node (tests). */
(function (root) {
  'use strict';

  const EXT = {
    java: 'java', cpp: 'cpp', c: 'c', csharp: 'cs', python: 'py', python3: 'py', javascript: 'js',
    typescript: 'ts', golang: 'go', rust: 'rs', kotlin: 'kt', swift: 'swift', ruby: 'rb',
    scala: 'scala', php: 'php', bash: 'sh', dart: 'dart', racket: 'rkt', erlang: 'erl',
    elixir: 'ex', mysql: 'sql', mssql: 'sql', oraclesql: 'sql', postgresql: 'sql', pythondata: 'py',
  };

  // ---------- ZIP (store only, UTF-8 names) ----------
  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeZip(files) {
    const enc = new TextEncoder();
    const parts = [];
    const central = [];
    let offset = 0;
    const d = new Date();
    const dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const dosDate = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    for (const f of files) {
      const name = enc.encode(f.path);
      const data = enc.encode(f.text);
      const crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
      lh.setUint16(8, 0, true); lh.setUint16(10, dosTime, true); lh.setUint16(12, dosDate, true);
      lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true);
      lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), name, data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true);
      ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true); ch.setUint16(12, dosTime, true);
      ch.setUint16(14, dosDate, true); ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true);
      ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true); ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), name);
      offset += 30 + name.length + data.length;
    }
    let csize = 0;
    for (const c of central) csize += c.length;
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, csize, true); end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
  }

  // ---------- helpers ----------
  const pad = (n, w) => String(n).padStart(w, '0');
  const safe = (s) => String(s).replace(/\s+/g, '-').replace(/[^A-Za-z0-9-]/g, '');
  function stamp(ts) {
    const d = new Date(+ts * 1000);
    return `${d.getFullYear()}${pad(d.getMonth() + 1, 2)}${pad(d.getDate(), 2)}-${pad(d.getHours(), 2)}${pad(d.getMinutes(), 2)}${pad(d.getSeconds(), 2)}`;
  }
  function human(ts) {
    const d = new Date(+ts * 1000);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1, 2)}-${pad(d.getDate(), 2)} ${pad(d.getHours(), 2)}:${pad(d.getMinutes(), 2)}:${pad(d.getSeconds(), 2)}`;
  }
  const csvCell = (v) => `"${String(v).replace(/"/g, '""')}"`;

  // ---------- LeetCode data ----------
  const PROGRESS_Q = (status) =>
    `query p($skip:Int!,$limit:Int!){userProgressQuestionList(filters:{questionStatus:${status},skip:$skip,limit:$limit}){totalNum questions{frontendId titleSlug title}}}`;
  const LIST_Q = 'query l($o:Int!,$s:String!){questionSubmissionList(offset:$o,limit:40,questionSlug:$s){hasNext submissions{id statusDisplay lang timestamp}}}';
  const DETAIL_Q = 'query d($id:Int!){submissionDetails(submissionId:$id){code}}';

  async function listProgress(gql, sleep, status) {
    const out = [];
    let skip = 0;
    let total = 1;
    while (out.length < total) {
      const j = await gql(PROGRESS_Q(status), { skip, limit: 100 });
      const l = j.data.userProgressQuestionList;
      total = l.totalNum;
      if (!l.questions.length) break;
      out.push(...l.questions);
      skip += 100;
      await sleep(300);
    }
    return out;
  }

  async function listProblems(gql, sleep, mode) {
    const solved = await listProgress(gql, sleep, 'SOLVED');
    if (mode !== 'all') return solved;
    // "all" also covers problems that were attempted but never solved. Best effort.
    let tried = [];
    try { tried = await listProgress(gql, sleep, 'ATTEMPTED'); } catch (e) { /* enum not available */ }
    const seen = new Set(solved.map((p) => p.titleSlug));
    return solved.concat(tried.filter((p) => !seen.has(p.titleSlug)));
  }

  async function listSubmissions(gql, sleep, slug) {
    const subs = [];
    let off = 0;
    for (;;) {
      const j = await gql(LIST_Q, { o: off, s: slug });
      const q = j.data.questionSubmissionList;
      subs.push(...(q.submissions || []));
      off += 40;
      if (!q.hasNext || !(q.submissions || []).length) break;
      await sleep(300);
    }
    return subs;
  }

  async function getCode(gql, sleep, id, tries) {
    for (let t = 0; t < tries; t++) {
      try {
        const j = await gql(DETAIL_Q, { id: +id });
        const d = j.data && j.data.submissionDetails;
        if (d && typeof d.code === 'string') return d.code;
      } catch (e) { /* retry */ }
      await sleep(1500 * (t + 1));
    }
    return null;
  }

  function choose(mode, subs) {
    if (mode === 'all') return subs;
    const acc = subs.filter((s) => s.statusDisplay === 'Accepted');
    if (mode === 'accepted') return acc;
    return acc.length ? [acc[acc.length - 1]] : []; // 'latest'
  }

  /** Walks every problem and downloads the chosen submissions. */
  async function collect(opts) {
    const { gql, sleep, mode } = opts;
    const delay = opts.delay == null ? 400 : opts.delay;
    const onProgress = opts.onProgress || (() => {});
    const cancelled = opts.isCancelled || (() => false);
    const problems = await listProblems(gql, sleep, mode);
    const kept = [];
    const pending = [];
    let done = 0;
    for (const p of problems) {
      if (cancelled()) break;
      let subs;
      try {
        subs = await listSubmissions(gql, sleep, p.titleSlug);
      } catch (e) {
        pending.push({ p, list: true });
        done++;
        continue;
      }
      subs.sort((a, b) => (+a.timestamp - +b.timestamp) || (+a.id - +b.id));
      let seq = 0;
      for (const s of choose(mode, subs)) {
        seq++;
        await sleep(delay);
        const code = await getCode(gql, sleep, s.id, 2);
        if (code === null) pending.push({ p, s, seq });
        else kept.push({ p, s, seq, code });
      }
      done++;
      onProgress({ done, total: problems.length, saved: kept.length, problem: p.titleSlug });
    }
    const failed = [];
    for (const f of pending) { // one more pass for anything that failed
      if (cancelled()) { failed.push(f); continue; }
      if (f.list) { failed.push(f); continue; }
      await sleep(delay);
      const code = await getCode(gql, sleep, f.s.id, 3);
      if (code === null) failed.push(f);
      else kept.push({ p: f.p, s: f.s, seq: f.seq, code });
    }
    return { kept, failed, problems: problems.length, cancelled: cancelled() };
  }

  function buildFiles(result, mode, who) {
    const files = [];
    const rows = [];
    for (const k of result.kept) {
      const ext = EXT[k.s.lang] || k.s.lang;
      const path = `${pad(k.p.frontendId, 4)}-${safe(k.p.titleSlug)}/${pad(k.seq, 2)}_${safe(k.s.statusDisplay)}_${stamp(k.s.timestamp)}.${ext}`;
      files.push({ path, text: k.code });
      rows.push({ ts: +k.s.timestamp, id: +k.s.id, k, path });
    }
    rows.sort((a, b) => a.ts - b.ts || a.id - b.id);
    const header = ['order', 'problem_no', 'problem', 'attempt_in_problem', 'status', 'language', 'date_time', 'file'];
    const lines = [header.join(',')];
    rows.forEach((r, i) => lines.push([i + 1, r.k.p.frontendId, r.k.p.titleSlug, r.k.seq, r.k.s.statusDisplay, r.k.s.lang, human(r.ts), r.path].map(csvCell).join(',')));
    files.push({ path: 'ORDER.csv', text: lines.join('\n') + '\n' });
    const modeText = { all: 'All submissions', accepted: 'Accepted only', latest: 'Latest accepted per problem' }[mode];
    files.push({
      path: 'README.txt',
      text: `LeetCode submissions export\nAccount: ${who}\nMode: ${modeText}\nProblems scanned: ${result.problems}\nSubmissions saved: ${result.kept.length}\nNot downloaded: ${result.failed.length}\nExported: ${new Date().toISOString()}\n\nFiles are grouped by problem. Inside each folder they are numbered oldest to newest.\nORDER.csv lists every saved submission in the order it was made.\n`,
    });
    if (result.failed.length) {
      files.push({
        path: 'FAILED.txt',
        text: result.failed.map((f) => (f.list ? `${f.p.titleSlug}: could not list submissions` : `${f.p.titleSlug}: submission ${f.s.id} (${f.s.statusDisplay}) had no downloadable code`)).join('\n') + '\n',
      });
    }
    return files;
  }

  const api = { EXT, crc32, makeZip, collect, buildFiles, stamp, human, safe };
  root.LCX = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
