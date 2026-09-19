# =============================================================================
# deploy-hf.ps1  —  Build & push to Hugging Face Spaces (static SDK)
#
# USAGE:
#   cd C:\Users\shahs\project\modern-portfolio
#   .\scripts\deploy-hf.ps1
#
# WHY THIS SCRIPT:
#   HF Static SDK serves from the REPO ROOT, so index.html must sit at /.
#   Drag-and-drop puts files in a dist/ sub-folder → 404 on root → blank page.
#   This script pushes the dist/ CONTENTS (index.html + assets/) to the HF
#   Space repo root via a clean git worktree, avoiding that mistake every time.
# =============================================================================

$ErrorActionPreference = "Stop"

$REPO_ROOT   = Split-Path -Parent $PSScriptRoot
$DIST_DIR    = Join-Path $REPO_ROOT "dist"
$HF_REMOTE   = "hf"
$HF_BRANCH   = "main"
$WORKTREE    = Join-Path $REPO_ROOT ".hf-deploy"

Write-Host "`n=== [1/5] Building production bundle... ===" -ForegroundColor Cyan
Set-Location $REPO_ROOT
npm run build

if (-not (Test-Path $DIST_DIR)) {
    Write-Error "Build failed — dist/ directory not found."
    exit 1
}

# Remove nested .git inside dist/ if it exists (causes submodule confusion)
$distGit = Join-Path $DIST_DIR ".git"
if (Test-Path $distGit) {
    Write-Host "  Removing nested .git inside dist/ ..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $distGit
}

Write-Host "`n=== [2/5] Preparing HF deploy worktree... ===" -ForegroundColor Cyan
if (Test-Path $WORKTREE) {
    git worktree remove --force $WORKTREE 2>$null
    Remove-Item -Recurse -Force $WORKTREE -ErrorAction SilentlyContinue
}

# Fetch latest HF state quietly
git fetch $HF_REMOTE $HF_BRANCH 2>&1 | Out-Null

# Create orphan worktree mapped to HF remote branch
git worktree add --no-checkout $WORKTREE "$HF_REMOTE/$HF_BRANCH"

Write-Host "`n=== [3/5] Syncing dist/ contents to HF worktree root... ===" -ForegroundColor Cyan
Set-Location $WORKTREE

# Check out HF branch in worktree
git checkout $HF_BRANCH 2>&1 | Out-Null

# Clean out old files (keep .git)
Get-ChildItem -Force | Where-Object { $_.Name -ne ".git" } | Remove-Item -Recurse -Force

# Copy dist/ contents (NOT the dist/ folder itself) to worktree root
Copy-Item -Recurse -Force "$DIST_DIR\*" "$WORKTREE\"

Write-Host "`n=== [4/5] Committing and pushing to HF Spaces... ===" -ForegroundColor Cyan
git add -A
$TIMESTAMP = Get-Date -Format "yyyy-MM-dd HH:mm"
git commit -m "deploy: rebuild $TIMESTAMP"

git push $HF_REMOTE "${HF_BRANCH}:${HF_BRANCH}"

Write-Host "`n=== [5/5] Cleaning up worktree... ===" -ForegroundColor Cyan
Set-Location $REPO_ROOT
git worktree remove --force $WORKTREE
Remove-Item -Recurse -Force $WORKTREE -ErrorAction SilentlyContinue

Write-Host "`n✅  Deployed! Visit: https://huggingface.co/spaces/orakzai-io/testing_3D_portfolio" -ForegroundColor Green
