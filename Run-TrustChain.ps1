<#
.SYNOPSIS
    Run-TrustChain — Launch the entire TrustChain stack with a single command.

.DESCRIPTION
    Starts (in order):
      1. Hardhat local blockchain node    (new terminal window)
      2. Smart-contract deployment        (waits for Hardhat to be ready)
      3. Go backend API                   (new terminal window)
      4. React / Vite frontend            (new terminal window)
      5. Federated Learning (optional)    (new terminal window, only with -FL flag)

.PARAMETER FL
    Pass -FL to also launch the federated learning server (python launch_fl.py).

.PARAMETER SkipDeploy
    Pass -SkipDeploy to skip contract re-deployment (useful when contracts are already deployed).

.EXAMPLE
    .\Run-TrustChain.ps1
    .\Run-TrustChain.ps1 -FL
    .\Run-TrustChain.ps1 -SkipDeploy
#>

param(
    [switch]$FL,
    [switch]$SkipDeploy
)

# ── Helpers ───────────────────────────────────────────────────────────────────
function Write-Step($n, $msg) {
    Write-Host ""
    Write-Host "  [$n] $msg" -ForegroundColor Cyan
}
function Write-Ok($msg)   { Write-Host "      OK  $msg" -ForegroundColor Green  }
function Write-Warn($msg) { Write-Host "      >>  $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "      !!  $msg" -ForegroundColor Red    }

$Root = $PSScriptRoot

# ── Banner ────────────────────────────────────────────────────────────────────
Clear-Host
Write-Host ""
Write-Host "  TrustChain -- Full Stack Launcher" -ForegroundColor Magenta
Write-Host "  --------------------------------------------------" -ForegroundColor DarkGray
Write-Host "  Frontend  ->  http://localhost:5173" -ForegroundColor White
Write-Host "  Backend   ->  http://localhost:8080" -ForegroundColor White
Write-Host "  Hardhat   ->  http://localhost:8545" -ForegroundColor White
Write-Host "  --------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""

# ── Step 1: Hardhat node ──────────────────────────────────────────────────────
Write-Step 1 "Starting Hardhat blockchain node..."

$contractDir = Join-Path $Root "contracts\trustchain-task6-s1"
if (-not (Test-Path $contractDir)) {
    Write-Err "contracts\trustchain-task6-s1 not found. Check your repo."
    exit 1
}

# Auto-install contract deps if node_modules is missing
if (-not (Test-Path (Join-Path $contractDir "node_modules"))) {
    Write-Warn "node_modules missing -- running npm install in contracts..."
    Push-Location $contractDir
    npm install | Out-Null
    Pop-Location
}

$hardhatProc = Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "Write-Host 'Hardhat Node' -ForegroundColor Magenta; Set-Location '$contractDir'; npx hardhat node --port 8545" `
    -PassThru -WindowStyle Normal

Write-Ok "Hardhat window launched (PID $($hardhatProc.Id))"

# Poll until Hardhat is accepting JSON-RPC requests
Write-Host "      Waiting for Hardhat to be ready..." -ForegroundColor DarkGray
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    try {
        $null = Invoke-RestMethod -Uri "http://127.0.0.1:8545" -Method POST `
            -Body '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' `
            -ContentType "application/json" -TimeoutSec 2
        $ready = $true
        break
    } catch { }
}

if (-not $ready) {
    Write-Err "Hardhat did not start within 30 s. Check the Hardhat window for errors."
    exit 1
}
Write-Ok "Hardhat is live on port 8545"

# ── Step 2: Deploy contracts ──────────────────────────────────────────────────
if ($SkipDeploy) {
    Write-Step 2 "Skipping contract deployment (-SkipDeploy flag passed)"
} else {
    Write-Step 2 "Deploying smart contracts..."
    Push-Location $contractDir
    $deployOut = npx hardhat run scripts/deploy.js --network localhost 2>&1
    Pop-Location

    if ($LASTEXITCODE -ne 0) {
        Write-Err "Contract deployment failed:"
        Write-Host $deployOut -ForegroundColor Red
        exit 1
    }
    Write-Ok "Contracts deployed  ->  deployments/localhost.json written"
}

# ── Step 3: Go backend ────────────────────────────────────────────────────────
Write-Step 3 "Starting Go backend (port 8080)..."

$backendDir = Join-Path $Root "backend"
if (-not (Test-Path $backendDir)) {
    Write-Err "backend\ directory not found."
    exit 1
}

$backendProc = Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "Write-Host 'Go Backend' -ForegroundColor Green; Set-Location '$backendDir'; go run ./cmd/server" `
    -PassThru -WindowStyle Normal

Write-Ok "Backend window launched (PID $($backendProc.Id))"

# Poll health endpoint (backend compiles first so give it 60 s)
Write-Host "      Waiting for backend to be ready (compiling Go)..." -ForegroundColor DarkGray
$ready = $false
for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 1
    try {
        $r = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/health" -TimeoutSec 2
        if ($r.success) { $ready = $true; break }
    } catch { }
}

if (-not $ready) {
    Write-Warn "Backend health check timed out -- it may still be compiling. Check the backend window."
} else {
    Write-Ok "Backend is healthy on port 8080"
}

# ── Step 4: Frontend ──────────────────────────────────────────────────────────
Write-Step 4 "Starting Vite / React frontend (port 5173)..."

$frontendDir = Join-Path $Root "frontend"
if (-not (Test-Path $frontendDir)) {
    Write-Err "frontend\ directory not found."
    exit 1
}

# Auto-install frontend deps if node_modules is missing
if (-not (Test-Path (Join-Path $frontendDir "node_modules"))) {
    Write-Warn "node_modules missing -- running npm install in frontend..."
    Push-Location $frontendDir
    npm install | Out-Null
    Pop-Location
}

$frontendProc = Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "Write-Host 'Vite Frontend' -ForegroundColor Blue; Set-Location '$frontendDir'; npm run dev" `
    -PassThru -WindowStyle Normal

Write-Ok "Frontend window launched (PID $($frontendProc.Id))"

# ── Step 5: Federated Learning (optional) ─────────────────────────────────────
if ($FL) {
    Write-Step 5 "Starting Federated Learning server..."
    $flDir = Join-Path $Root "federated"
    if (-not (Test-Path $flDir)) {
        Write-Warn "federated\ directory not found -- skipping FL."
    } else {
        $flProc = Start-Process powershell -ArgumentList "-NoExit", "-Command",
            "Write-Host 'Federated Learning' -ForegroundColor Yellow; Set-Location '$flDir'; python launch_fl.py" `
            -PassThru -WindowStyle Normal
        Write-Ok "FL window launched (PID $($flProc.Id))"
    }
}

# ── Done ──────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  --------------------------------------------------" -ForegroundColor DarkGray
Write-Host "  TrustChain is running!" -ForegroundColor Green
Write-Host ""
Write-Host "     Open your browser ->  http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "  To stop: just close the individual terminal windows." -ForegroundColor DarkGray
Write-Host "  --------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""
