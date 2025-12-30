# Build XPI file for Firefox extension
$files = @('manifest.json', 'background.js', 'SlackRedirect_48x48.png', 'SlackRedirect_96x96.png', 'LICENSE')

# Remove old XPI if it exists
if (Test-Path 'SlackRedirect.xpi') {
    Remove-Item 'SlackRedirect.xpi'
}

# Create ZIP first, then rename to XPI
Compress-Archive -Path $files -DestinationPath 'SlackRedirect.zip' -Force

# Rename to XPI
Rename-Item -Path 'SlackRedirect.zip' -NewName 'SlackRedirect.xpi' -Force

Write-Host "Created SlackRedirect.xpi"

