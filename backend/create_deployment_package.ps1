Write-Host "Installing dependencies..."
npm install

Write-Host "Creating deployment package (function.zip)..."
$params = @{
    Path = "index.js", "package.json", "node_modules"
    DestinationPath = "function.zip"
    Force = $true
}
Compress-Archive @params

Write-Host "Done! function.zip created successfully in $(Get-Location)"
