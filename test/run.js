const assert = require('assert');
const fs = require('fs');
const { collect, buildFiles, makeZip } = require('../lib.js');

// Fake account: 3 solved problems, 1 attempted-only. Problem "a" has 45 submissions (tests paging).
const subs = { a: [], b: [], c: [], d: [] };
let id = 1000;
for (let i = 0; i < 44; i++) subs.a.push({ id: String(id++), statusDisplay: 'Wrong Answer', lang: 'java', timestamp: String(1700000000 + i * 60) });
subs.a.push({ id: String(id++), statusDisplay: 'Accepted', lang: 'java', timestamp: String(1700000000 + 44 * 60) });
subs.b = [
  { id: String(id++), statusDisplay: 'Time Limit Exceeded', lang: 'python3', timestamp: '1700100000' },
  { id: String(id++), statusDisplay: 'Accepted', lang: 'python3', timestamp: '1700100100' },
  { id: String(id++), statusDisplay: 'Accepted', lang: 'python3', timestamp: '1700100200' },
];
subs.c = [{ id: String(id++), statusDisplay: 'Accepted', lang: 'mysql', timestamp: '1700200000' }];
subs.d = [{ id: String(id++), statusDisplay: 'Wrong Answer', lang: 'cpp', timestamp: '1700300000' }];
subs.a.reverse(); // LeetCode returns newest first
const flaky = new Set([subs.b[0].id]); // first detail fetch of this one fails once
const calls = { detail: 0 };

async function gql(query, v) {
  if (query.includes('userProgressQuestionList')) {
    const solved = query.includes('SOLVED');
    const all = solved
      ? [{ frontendId: '1', titleSlug: 'a', title: 'A' }, { frontendId: '12', titleSlug: 'b', title: 'B' }, { frontendId: '300', titleSlug: 'c', title: 'C' }]
      : [{ frontendId: '4000', titleSlug: 'd', title: 'D' }];
    return { data: { userProgressQuestionList: { totalNum: all.length, questions: all.slice(v.skip, v.skip + v.limit) } } };
  }
  if (query.includes('questionSubmissionList')) {
    const list = subs[v.s];
    return { data: { questionSubmissionList: { hasNext: v.o + 40 < list.length, submissions: list.slice(v.o, v.o + 40) } } };
  }
  if (query.includes('submissionDetails')) {
    calls.detail++;
    if (flaky.has(String(v.id))) { flaky.delete(String(v.id)); return { data: { submissionDetails: null } }; }
    return { data: { submissionDetails: { code: `// code ${v.id}\n"quote", unicode ✓` } } };
  }
  throw new Error('unexpected query');
}
const sleep = () => Promise.resolve();

(async () => {
  const run = (mode) => collect({ gql, sleep, mode, delay: 0 });

  let r = await run('all');
  assert.equal(r.kept.length, 45 + 3 + 1 + 1, 'all: every submission incl. attempted-only problem');
  assert.equal(r.failed.length, 0, 'flaky download recovered on retry');
  let files = buildFiles(r, 'all', 'tester');
  const order = files.find((f) => f.path === 'ORDER.csv').text.trim().split('\n');
  assert.equal(order.length, 1 + 50);
  const ts = order.slice(1).map((l) => l.split('","')[6]);
  assert.deepEqual([...ts].sort(), ts, 'ORDER.csv is chronological');
  assert.ok(files.some((f) => f.path.startsWith('0001-a/01_Wrong-Answer_')));
  assert.ok(files.some((f) => f.path.startsWith('0001-a/45_Accepted_')), 'oldest->newest, accepted last');
  assert.ok(files.some((f) => f.path.startsWith('0012-b/') && f.path.endsWith('.py')));
  assert.ok(files.some((f) => f.path.startsWith('4000-d/') && f.path.endsWith('.cpp')));

  r = await run('accepted');
  assert.equal(r.kept.length, 1 + 2 + 1, 'accepted: only Accepted');
  assert.ok(r.kept.every((k) => k.s.statusDisplay === 'Accepted'));
  assert.equal(r.problems, 3, 'accepted: attempted-only problem excluded');

  r = await run('latest');
  assert.equal(r.kept.length, 3, 'latest: one per solved problem');
  assert.equal(r.kept.find((k) => k.p.titleSlug === 'b').s.id, subs.b[2].id, 'latest accepted of b');

  // cancellation
  let n = 0;
  r = await collect({ gql, sleep, mode: 'all', delay: 0, isCancelled: () => n++ > 1 });
  assert.ok(r.cancelled && r.kept.length < 50, 'cancel stops early');

  // permanently failing download is reported, not fatal
  const gql2 = async (q, v) => (q.includes('submissionDetails') && String(v.id) === subs.c[0].id ? { data: { submissionDetails: null } } : gql(q, v));
  r = await collect({ gql: gql2, sleep, mode: 'accepted', delay: 0 });
  assert.equal(r.failed.length, 1);
  assert.ok(buildFiles(r, 'accepted', 't').some((f) => f.path === 'FAILED.txt'));

  // real ZIP validity
  files = buildFiles(await run('all'), 'all', 'tester');
  fs.writeFileSync('/tmp/lcx_test.zip', Buffer.from(await makeZip(files).arrayBuffer()));
  console.log('all tests passed;', files.length, 'files in zip');
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
