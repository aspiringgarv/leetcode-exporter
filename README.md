<div align="center">

# ⬇ Submission Exporter for LeetCode

**Back up everything you've ever solved. One click. Nothing leaves your browser.**

[![License: MIT](https://img.shields.io/badge/license-MIT-ffa116.svg)](LICENSE)
![Manifest V3](https://img.shields.io/badge/manifest-v3-2cbb5d)
![Chrome · Edge · Firefox](https://img.shields.io/badge/works%20on-Chrome%20%C2%B7%20Edge%20%C2%B7%20Firefox-444)
![No tracking](https://img.shields.io/badge/data%20collected-none-2cbb5d)

[**Project page**](https://aspiringgarv.github.io/leetcode-exporter/) ·
[**Download**](https://github.com/aspiringgarv/leetcode-exporter/releases/latest) ·
[**Privacy**](PRIVACY.md)

</div>

---

## The story

You start with Two Sum. A few hundred problems later you've got late-night wrong answers, and the one run that
finally went green. Years on, you're at 1,200 problems. That's years of your thinking, and it all lives on a website
with **no export button**.

Then one day you want it: you're switching accounts, building a portfolio, or you just want a backup. And you find out
there's no "download my submissions" anywhere.

The tools that exist ask you to copy your session cookie out of the dev tools and paste it into a command line. That's
your login, handed to a script. So this is the version we wanted: **one click, inside the page you're already logged
in to.**

## What you get

| Mode | What's in the ZIP |
|---|---|
| **All submissions** | Every attempt, wrong ones too, oldest to newest. You can see how you got there. |
| **Accepted only** | Every accepted submission. |
| **Latest accepted per problem** | One clean file per problem you've solved. |

```
leetcode-yourname-all.zip
├── ORDER.csv                       ← every submission, in the order you made it
├── README.txt                      ← account, mode, counts, date
├── 0001-two-sum/
│   ├── 01_Wrong-Answer_20230411-220906.java
│   ├── 02_Time-Limit-Exceeded_20230411-221504.java
│   └── 03_Accepted_20230411-222941.java
├── 0169-majority-element/
│   └── …
└── FAILED.txt                      ← only if something couldn't be downloaded
```

Files are numbered per problem, oldest to newest, with the accepted one last. `ORDER.csv` lists the same files across
**all** problems, so you can replay your history in the order it happened.

## Install

### Firefox
Install from **Firefox Add-ons** (link on the [project page](https://aspiringgarv.github.io/leetcode-exporter/)).

### Chrome / Edge / Brave
1. Download `leetcode-exporter-chrome-v*.zip` from the [latest release](https://github.com/aspiringgarv/leetcode-exporter/releases/latest) and unzip it.
2. Open `chrome://extensions` (or `edge://extensions`).
3. Turn on **Developer mode**, click **Load unpacked**, and choose the unzipped folder.

## Use it

1. Open **leetcode.com** and log in.
2. Click **⬇ Export submissions** in the bottom-right corner.
3. Pick a mode and press **Start export**.
4. Keep the tab open until it finishes. The ZIP downloads on its own.

> **How long does it take?** The extension asks LeetCode for things one at a time, with short pauses and retries. A full
> export of about 1,200 problems takes a while. That's on purpose, so it stays friendly to LeetCode's servers.
> A progress bar shows where it is. You can press **Cancel** and still get everything collected so far.

## Private by design

- **No server, no account, no analytics, no tracking.** The extension has nowhere to send your data.
- It runs only on `https://leetcode.com/*`, inside **your own** logged-in session.
- It never reads, stores or transmits your password or session cookie.
- The ZIP is built on your device and saved by your browser.
- Everything is open source. Read it: it's two small files, [`lib.js`](lib.js) and [`content.js`](content.js).

Full text: [PRIVACY.md](PRIVACY.md).

## How it works

```
 leetcode.com tab (you, logged in)
        │
        ▼
  content.js ── the floating panel, progress bar, download
        │
        ▼
  lib.js ───── for each problem:
                 1. list your submissions (paged, 40 at a time)
                 2. pick the ones your mode wants
                 3. fetch each one's code, with retries
                 4. build the ZIP + ORDER.csv
```

It calls the same GraphQL endpoint the website itself uses. Requests are sequential, paced, and retried with
backoff. Anything that still fails is listed in `FAILED.txt` instead of silently disappearing.

## Develop

No dependencies, no build step for development.

```bash
node test/run.js   # tests the core logic against a fake LeetCode API
node build.js      # builds dist/chrome.zip and dist/firefox.zip
```

The tests cover all three modes, problems with more than 40 submissions, a download that fails once and recovers,
cancelling, a download that never works, and a ZIP that opens cleanly.

| File | What it does |
|---|---|
| `lib.js` | The core: fetching, filtering, ZIP writer, CSV. The network layer is injected, so it runs in Node tests. |
| `content.js` | The in-page panel and download button. |
| `manifest.json` | Manifest V3, with Firefox settings. Permission: `leetcode.com` only. |
| `build.js` | Makes the Chrome and Firefox packages. |
| `docs/` | The project page and privacy page (GitHub Pages). |

## Good to know

- **Unofficial.** LeetCode can change its internal API at any time. If an export stops working, please
  [open an issue](https://github.com/aspiringgarv/leetcode-exporter/issues).
- **Your account only.** Use it to back up your own work, and follow LeetCode's terms of service.
- **Early release.** The core logic has automated tests, but the in-page panel is new and hasn't had wide real-world
  use yet. Please report anything odd.

## Contributing

Issues and pull requests are welcome. Good first ideas: `leetcode.cn` support, export to a Git repo layout,
resume after closing the tab.

## License

[MIT](LICENSE). Free for everyone, forever.

---

<sub>Not affiliated with or endorsed by LeetCode.</sub>
