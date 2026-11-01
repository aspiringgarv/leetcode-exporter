# Firefox Add-ons (AMO) listing: copy and paste

**Upload file:** `dist/leetcode-exporter-firefox-v0.1.0.zip` (also on the GitHub Release)

**Name:** Submission Exporter for LeetCode

**Add-on URL slug:** leetcode-submission-exporter

**Summary (under 250 characters):**
Your LeetCode history is yours. Export every solution you've written, all submissions or just the accepted ones, as a tidy ZIP in one click. Runs in your browser and sends nothing anywhere.

**Description:**
Ever thought about backing up your LeetCode?

You start with Two Sum. A few hundred problems later you've got late-night wrong answers, and the one run that finally went green. Years on, that's 1,200 problems of your thinking, and it all lives on a site with no export button.

This extension adds one: open leetcode.com while logged in, click "Export submissions", pick what you want, and get a ZIP.

What you get
- All submissions: every attempt, wrong ones too, oldest to newest
- Accepted only: just the solutions that passed
- Latest accepted per problem: one clean file per solved problem
- One folder per problem, files named by attempt, status and date, plus an ORDER.csv listing everything in the order you wrote it

Private by design
Your code never leaves your computer. No server, no account, no analytics, no tracking. The extension never reads your password or cookie. It reads the same history you see on the website and builds the ZIP on your device.

Kind to LeetCode
Requests are made one at a time with short pauses and retries, so a full export of about 1,200 problems takes a while. That's on purpose.

Open source (MIT): https://github.com/aspiringgarv/leetcode-exporter
Not affiliated with or endorsed by LeetCode. For your own account only.

**Categories:** Other (or Developer Tools)
**Support site:** https://github.com/aspiringgarv/leetcode-exporter/issues
**Homepage:** https://aspiringgarv.github.io/leetcode-exporter/
**License:** MIT License
**Privacy policy URL:** https://aspiringgarv.github.io/leetcode-exporter/privacy.html

**Does it need source-code submission?** No. The code is plain JavaScript, not minified or bundled.

**Notes to reviewer:**
Content script runs only on https://leetcode.com/*. It calls the site's own same-origin GraphQL endpoint using the user's existing session to list and fetch the user's own submissions, builds a ZIP in memory, and triggers a download. No remote code, no external requests, no data collection. Test: log in to leetcode.com, click the orange "Export submissions" button (bottom right), choose a mode, Start.
