/**
 * Slack Redirect Extension
 * 
 * Intercepts Slack archive URLs and redirects them to open in the browser.
 * 
 * URL patterns:
 * - Input:  https://{workspace}.slack.com/archives/{CHANNEL_ID}/p{timestamp}
 * - Output (Strategy 1): https://app.slack.com/client/{TEAM_ID}/{CHANNEL_ID} (direct, skips all redirects)
 * - Output (Strategy 2): https://{workspace}.slack.com/messages/{CHANNEL_ID}/p{timestamp}
 *                        (which redirects to app.slack.com/client/{TEAM_ID}/{CHANNEL_ID})
 * 
 * Strategy 1 is used when we've detected the team ID for a workspace.
 * Strategy 2 is the fallback that skips the interstitial page.
 */

// Cache for team IDs to avoid async storage access in blocking listener
// This is populated when we detect team IDs from app.slack.com visits
const teamIdCache = {};

/**
 * Detects and stores team ID from app.slack.com URLs
 * This helps us skip redirects in the future
 * 
 * When a user visits app.slack.com/client/{TEAM_ID}/..., we extract
 * the team ID and try to map it to the workspace domain from the referrer.
 */
function detectTeamId(details) {
  try {
    const urlObj = new URL(details.url);
    
    // Check if this is an app.slack.com/client URL
    if (urlObj.hostname === 'app.slack.com' && urlObj.pathname.startsWith('/client/')) {
      const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
      
      if (pathParts.length >= 2 && pathParts[0] === 'client') {
        const teamId = pathParts[1];
        
        // Try to get workspace from referrer
        if (details.originUrl) {
          try {
            const referrerUrl = new URL(details.originUrl);
            if (referrerUrl.hostname.endsWith('.slack.com')) {
              const workspace = referrerUrl.hostname.replace('.slack.com', '');
              
              // Update cache immediately for synchronous access
              teamIdCache[workspace] = teamId;
              
              // Also persist to storage
              const storageKey = `teamId_${workspace}`;
              browser.storage.local.set({ [storageKey]: teamId });
              console.log(`Detected team ID ${teamId} for workspace ${workspace}`);
            }
          } catch (e) {
            // Referrer parsing failed, continue
          }
        }
      }
    }
  } catch (error) {
    // Silently fail - this is just optimization
  }
}

// Load team ID cache from storage on startup
browser.storage.local.get(null, (items) => {
  for (const key in items) {
    if (key.startsWith('teamId_')) {
      const workspace = key.replace('teamId_', '');
      teamIdCache[workspace] = items[key];
    }
  }
  console.log('Loaded team ID cache:', teamIdCache);
});

// Listen for navigation requests to Slack archive URLs
browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    // Skip non-navigation requests (like images, scripts, etc.)
    if (details.type !== 'main_frame' && details.type !== 'sub_frame') {
      return {};
    }
    
    const originalUrl = details.url;
    
    try {
      const urlObj = new URL(originalUrl);
      
      // Check if this is an archive URL
      if (!urlObj.pathname.startsWith('/archives/')) {
        return {};
      }
      
      // Extract path components: /archives/{CHANNEL_ID}/p{timestamp}
      const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
      
      if (pathParts.length < 2 || pathParts[0] !== 'archives') {
        return {};
      }
      
      const channelId = pathParts[1];
      const workspace = urlObj.hostname.replace('.slack.com', '');
      
      // Strategy 1: Try direct URL if we have team ID cached
      const cachedTeamId = teamIdCache[workspace];
      if (cachedTeamId) {
        const directUrl = `https://app.slack.com/client/${cachedTeamId}/${channelId}`;
        console.log(`Slack Redirect (direct): ${originalUrl} -> ${directUrl}`);
        return { redirectUrl: directUrl };
      }
      
      // Strategy 2: Fall back to /messages redirect (skips interstitial page)
      // This works for all workspaces and is the reliable fallback
      let newPath = `/messages/${channelId}`;
      if (pathParts.length > 2) {
        newPath += `/${pathParts[2]}`;
      }
      
      const messagesUrl = `${urlObj.origin}${newPath}${urlObj.search}${urlObj.hash}`;
      console.log(`Slack Redirect (/messages): ${originalUrl} -> ${messagesUrl}`);
      return { redirectUrl: messagesUrl };
      
    } catch (error) {
      console.error('Error in Slack redirect:', error);
      return {};
    }
  },
  {
    urls: ["*://*.slack.com/archives/*"],
    types: ["main_frame", "sub_frame"]
  },
  ["blocking"]
);

// Listen for app.slack.com URLs to detect team IDs
browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.type === 'main_frame') {
      detectTeamId(details);
    }
    return {};
  },
  {
    urls: ["*://app.slack.com/client/*"]
  },
  ["blocking"]
);

console.log('Slack Redirect extension loaded');

