# Slack Redirect

Slack produces a native Windows/macOS app but also has a nearly identicial web UI. Users of the web UI experience frustration however, as links to Slack messages created in both the native app and web app are in the form https://{WORKSPACE}.slack.com/archives/{CHANNEL_ID}/p{timestamp} which leads to a page that attempts to open the native Slack app from the browser. Avoiding this redirect saves considerable time for Slack web app users. 

Slack Redirect is a Firefox extension which intercepts links in the above format and opens instead to the `https://app.slack.com/client/{TEAM_ID}/{CHANNEL_ID}` format directly in Firefox. 

Install from https://addons.mozilla.org/firefox/addon/slack-redirect/ 

