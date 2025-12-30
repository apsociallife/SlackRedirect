# Slack Redirect

A Firefox browser extension that redirects Slack archive links to open directly in the browser instead of trying to open the Slack desktop app.

## Problem

When you click on a Slack message link, it typically looks like:
```
https://mozilla.slack.com/archives/C08K9LFB39A/p1765396205155879
```

This URL leads to an interstitial page that tries to open the link in the Slack desktop app. If you want to open it in Firefox instead, you need to manually click "Open in browser" or wait for redirects.

## Solution

This extension automatically intercepts Slack archive URLs and redirects them to open directly in Firefox. It uses two strategies:

1. **Direct redirect** (when team ID is known): Redirects directly to `https://app.slack.com/client/{TEAM_ID}/{CHANNEL_ID}`, skipping all redirects.

2. **Messages redirect** (fallback): Redirects to `https://{workspace}.slack.com/messages/{CHANNEL_ID}/p{timestamp}`, which skips the interstitial page and lets Slack handle the final redirect.

The extension automatically learns team IDs by observing when you visit `app.slack.com` URLs, so it gets smarter over time.

## Installation

### Development Installation

1. Clone this repository or download the source code.

2. Open Firefox and navigate to `about:debugging`.

3. Click "This Firefox" in the left sidebar.

4. Click "Load Temporary Add-on...".

5. Navigate to the extension directory and select `manifest.json`.

6. The extension is now loaded and active!

### Building for Distribution

To package the extension for distribution:

1. Create a ZIP file containing:
   - `manifest.json`
   - `background.js`
   - `icon.png` (optional but recommended)
   - `LICENSE`

2. The ZIP file can be submitted to Firefox Add-ons (AMO) or distributed manually.

## How It Works

### URL Transformation

The extension intercepts navigation requests to Slack archive URLs using Firefox's `webRequest` API. When it detects a URL matching the pattern:

```
https://{workspace}.slack.com/archives/{CHANNEL_ID}/p{timestamp}
```

It transforms it to either:

- **Direct**: `https://app.slack.com/client/{TEAM_ID}/{CHANNEL_ID}` (if team ID is known)
- **Fallback**: `https://{workspace}.slack.com/messages/{CHANNEL_ID}/p{timestamp}`

### Team ID Detection

The extension automatically detects team IDs by monitoring when you visit `app.slack.com/client/{TEAM_ID}/...` URLs. It maps the team ID to the workspace domain (extracted from the referrer) and stores it for future use.

This means:
- First time: Uses the `/messages` redirect (works for all workspaces)
- After detection: Uses direct redirect (skips all redirects)

## Redirect Chain

Understanding the redirect chain helps explain why this extension is useful:

1. **Original URL**: `https://mozilla.slack.com/archives/C08K9LFB39A/p1765396205155879`
   - Shows interstitial page trying to open Slack app

2. **Extension redirect (fallback)**: `https://mozilla.slack.com/messages/C08K9LFB39A/p1765396205155879`
   - Skips the interstitial page

3. **Slack redirect**: `https://app.slack.com/client/T027LFU12/C08K9LFB39A/1765396205.155879`
   - Intermediate redirect with timestamp

4. **Final URL**: `https://app.slack.com/client/E07DB2PSS3W/C08K9LFB39A`
   - Final destination (timestamp removed)

With team ID detection, the extension can go directly from step 1 to step 4, skipping steps 2 and 3.

## Permissions

This extension requires the following permissions:

- `webRequest` and `webRequestBlocking`: To intercept and redirect navigation requests
- `storage`: To persist team ID mappings across browser sessions
- `*://*.slack.com/*`: Host permission to intercept Slack URLs

## Development

### File Structure

```
SlackRedirect/
├── manifest.json      # Extension manifest
├── background.js      # Background script with redirect logic
├── icon.png          # Extension icon (optional)
├── README.md         # This file
└── LICENSE           # License file
```

### Testing

1. Load the extension in development mode (see Installation above).

2. Open the browser console (F12) to see redirect logs.

3. Try clicking a Slack archive link. You should see console messages like:
   ```
   Slack Redirect (/messages): https://... -> https://...
   ```

4. After visiting `app.slack.com` once, subsequent redirects should use the direct method:
   ```
   Slack Redirect (direct): https://... -> https://...
   ```

## License

This project is licensed under the Mozilla Public License 2.0. See the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Known Limitations

- Team ID detection relies on the referrer header, which may not always be available
- The extension only works for Slack workspaces (not Slack Enterprise Grid with custom domains)
- Direct redirects require the extension to have detected the team ID at least once

