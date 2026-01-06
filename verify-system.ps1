# Quick System Verification Script
# Verifies all system structure in less than 5 minutes

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "System Structure Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$errors = @()
$warnings = @()
$success = @()

# 1. Check Docker Services
Write-Host "[1/6] Checking Docker Services..." -ForegroundColor Yellow
try {
    $psOutput = docker-compose -f docker-compose.separated.yml ps 2>$null
    if ($psOutput) {
        $running = ($psOutput | Select-String "Up").Count
        $total = ($psOutput | Select-String "multi-search-").Count
        if ($running -ge 4) {
            Write-Host "  ✓ All services running ($running containers)" -ForegroundColor Green
            $success += "Docker services: All running"
        } else {
            Write-Host "  ⚠ Only $running services running" -ForegroundColor Yellow
            $warnings += "Docker services: $running running"
        }
    } else {
        Write-Host "  ⚠ Cannot check Docker services (may not be running)" -ForegroundColor Yellow
        $warnings += "Docker services check unavailable"
    }
} catch {
    Write-Host "  ⚠ Docker check warning: $_" -ForegroundColor Yellow
    $warnings += "Docker check warning"
}

# 2. Check Frontend Structure
Write-Host "[2/6] Checking Frontend Structure..." -ForegroundColor Yellow
$frontendChecks = @(
    @{Path="frontend-admin/app/admin/storage/page.tsx"; Desc="Admin Storage Dashboard"},
    @{Path="frontend-admin/app/admin/layout.tsx"; Desc="Admin Layout"},
    @{Path="frontend-client/app/client/page.tsx"; Desc="Client Portal"},
    @{Path="frontend-shared/lib/api.ts"; Desc="Shared API"},
    @{Path="frontend-shared/lib/store.ts"; Desc="Shared Store"}
)

foreach ($check in $frontendChecks) {
    if (Test-Path $check.Path) {
        Write-Host "  ✓ $($check.Desc)" -ForegroundColor Green
        $success += "Frontend: $($check.Desc)"
    } else {
        Write-Host "  ✗ Missing: $($check.Desc)" -ForegroundColor Red
        $errors += "Missing: $($check.Path)"
    }
}

# 3. Check Backend Structure
Write-Host "[3/6] Checking Backend Structure..." -ForegroundColor Yellow
$backendChecks = @(
    @{Path="backend/app/main.py"; Desc="Backend Main"},
    @{Path="backend/app/routers/admin.py"; Desc="Admin Routes"},
    @{Path="backend/app/routers/tenant.py"; Desc="Tenant Routes"},
    @{Path="backend/app/services/b2_service.py"; Desc="B2 Service"},
    @{Path="backend/Dockerfile"; Desc="Backend Dockerfile"}
)

foreach ($check in $backendChecks) {
    if (Test-Path $check.Path) {
        Write-Host "  ✓ $($check.Desc)" -ForegroundColor Green
        $success += "Backend: $($check.Desc)"
    } else {
        Write-Host "  ✗ Missing: $($check.Desc)" -ForegroundColor Red
        $errors += "Missing: $($check.Path)"
    }
}

# 4. Check Docker Configuration
Write-Host "[4/6] Checking Docker Configuration..." -ForegroundColor Yellow
$dockerFiles = @(
    "docker-compose.separated.yml",
    "frontend-admin/Dockerfile",
    "frontend-client/Dockerfile",
    "backend/Dockerfile"
)

foreach ($file in $dockerFiles) {
    if (Test-Path $file) {
        Write-Host "  ✓ $file" -ForegroundColor Green
        $success += "Docker: $file"
    } else {
        Write-Host "  ✗ Missing: $file" -ForegroundColor Red
        $errors += "Missing: $file"
    }
}

# 5. Check Documentation Organization
Write-Host "[5/6] Checking Documentation..." -ForegroundColor Yellow
if (Test-Path "docs/recent") {
    $recentDocs = (Get-ChildItem -Path "docs/recent" -Filter "*.md" -ErrorAction SilentlyContinue).Count
    Write-Host "  ✓ Recent docs: $recentDocs files" -ForegroundColor Green
    $success += "Docs: $recentDocs recent files"
} else {
    Write-Host "  ⚠ docs/recent folder not found" -ForegroundColor Yellow
    $warnings += "docs/recent folder missing"
}

if (Test-Path "docs/archive") {
    $archiveDocs = (Get-ChildItem -Path "docs/archive" -Filter "*.md" -ErrorAction SilentlyContinue).Count
    Write-Host "  ✓ Archive docs: $archiveDocs files" -ForegroundColor Green
    $success += "Docs: $archiveDocs archive files"
}

$rootMdFiles = (Get-ChildItem -Path "." -Filter "*.md" -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -ne "README.md" }).Count
if ($rootMdFiles -eq 0) {
    Write-Host "  ✓ Root directory clean (only README.md)" -ForegroundColor Green
    $success += "Docs: Root directory clean"
} else {
    Write-Host "  ⚠ $rootMdFiles .md files in root (should only be README.md)" -ForegroundColor Yellow
    $warnings += "$rootMdFiles .md files in root"
}

# 6. Check ECS Deployment Files
Write-Host "[6/8] Checking ECS Deployment Files..." -ForegroundColor Yellow
$ecsFiles = @(
    "ecs/backend-task-definition.json",
    "ecs/frontend-admin-task-definition.json",
    "ecs/frontend-client-task-definition.json",
    "ecs/ecs-services.json",
    "ecs/auto-scaling.json",
    "ecs/deploy.sh",
    "ecs/alb-rules.md",
    "ecs/README.md"
)

foreach ($file in $ecsFiles) {
    if (Test-Path $file) {
        Write-Host "  ✓ $file" -ForegroundColor Green
        $success += "ECS: $file"
    } else {
        Write-Host "  ✗ Missing: $file" -ForegroundColor Red
        $errors += "Missing: $file"
    }
}

# 7. Check GitHub CI/CD Workflows
Write-Host "[7/8] Checking GitHub CI/CD Workflows..." -ForegroundColor Yellow
$workflowFiles = @(
    ".github/workflows/deploy-backend.yml",
    ".github/workflows/deploy-frontend-admin.yml",
    ".github/workflows/deploy-frontend-client.yml"
)

foreach ($file in $workflowFiles) {
    if (Test-Path $file) {
        Write-Host "  ✓ $file" -ForegroundColor Green
        $success += "CI/CD: $file"
    } else {
        Write-Host "  ✗ Missing: $file" -ForegroundColor Red
        $errors += "Missing: $file"
    }
}

# 8. Check Storage Dashboard Features
Write-Host "[8/8] Checking Storage Dashboard Features..." -ForegroundColor Yellow
if (Test-Path "frontend-admin/app/admin/storage/page.tsx") {
    $storageContent = Get-Content "frontend-admin/app/admin/storage/page.tsx" -Raw
    $checks = @(
        @{Pattern="StorageType.*b2.*s3.*azure.*gcs"; Desc="Multi-storage types"},
        @{Pattern="Add Storage"; Desc="Add Storage button"},
        @{Pattern="tenant.*assign|Assign to Tenant"; Desc="Tenant assignment"},
        @{Pattern="Storage Dashboard"; Desc="Storage Dashboard title"}
    )
    
    foreach ($check in $checks) {
        if ($storageContent -match $check.Pattern) {
            Write-Host "  ✓ $($check.Desc)" -ForegroundColor Green
            $success += "Storage: $($check.Desc)"
        } else {
            Write-Host "  ✗ Missing: $($check.Desc)" -ForegroundColor Red
            $errors += "Storage: Missing $($check.Desc)"
        }
    }
} else {
    Write-Host "  ✗ Storage page not found" -ForegroundColor Red
    $errors += "Storage page missing"
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Verification Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "✓ Success: $($success.Count) checks passed" -ForegroundColor Green
if ($warnings.Count -gt 0) {
    Write-Host "⚠ Warnings: $($warnings.Count)" -ForegroundColor Yellow
    foreach ($w in $warnings) {
        Write-Host "  - $w" -ForegroundColor Yellow
    }
}
if ($errors.Count -gt 0) {
    Write-Host "✗ Errors: $($errors.Count)" -ForegroundColor Red
    foreach ($e in $errors) {
        Write-Host "  - $e" -ForegroundColor Red
    }
    exit 1
} else {
    Write-Host ""
    Write-Host "✅ All critical checks passed!" -ForegroundColor Green
    exit 0
}

