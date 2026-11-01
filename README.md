# Submission Exporter for LeetCode

Export **your own** LeetCode submissions as a ZIP, in your browser, with no cookie copying and no server.

- **All submissions**: wrong attempts too, oldest to newest
- **Accepted only**: every accepted submission
- **Latest accepted per problem**: one file per solved problem

The ZIP has one folder per problem (`0001-two-sum/01_Wrong-Answer_20240312-101500.java`, ...) and an `ORDER.csv`
listing every submission in the order you made it.

## How it works
It runs inside your already logged-in leetcode.com tab and calls the same GraphQL endpoint the website uses,
one request at a time with short pauses and retries. Everything stays in your browser. See [PRIVACY.md](PRIVACY.md).

## Install
**Firefox:** install from Firefox Add-ons (link on the project page).

**Chrome / Edge (manual):**
1. Download `chrome.zip` from the latest GitHub Release and unzip it.
2. Open `chrome://extensions`, turn on *Developer mode*, click *Load unpacked*, pick the unzipped folder.

## Use
Open leetcode.com while logged in, click **Export submissions** (bottom right), choose a mode, **Start export**.
Keep the tab open until it finishes. A full export of ~1,200 problems can take a while because requests are paced
to stay friendly to LeetCode.

## Develop
```bash
node test/run.js   # core logic tests against a fake API
node build.js      # builds dist/chrome.zip and dist/firefox.zip
```

*Not affiliated with or endorsed by LeetCode. Use it only on your own account and respect LeetCode's terms.*
