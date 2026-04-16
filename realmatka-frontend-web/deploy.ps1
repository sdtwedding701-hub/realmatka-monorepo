param(
    [string]$msg = "Quick update"
)

Write-Host "🚀 Deploying RealMatka project with message: $msg" -ForegroundColor Green

git add .
git commit -m "$msg"
git push origin main

Write-Host "✅ Deployment pushed to GitHub (Vercel will auto-build)" -ForegroundColor Cyan
