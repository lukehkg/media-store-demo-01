# Test Login Script
Write-Host "Testing Backend API..." -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "`n1. Testing /health endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing
    Write-Host "   ✅ Backend is running (Status: $($health.StatusCode))" -ForegroundColor Green
    Write-Host "   Response: $($health.Content)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Backend is not accessible: $_" -ForegroundColor Red
    exit 1
}

# Test 2: Login
Write-Host "`n2. Testing login endpoint..." -ForegroundColor Yellow
try {
    $body = "username=admin@example.com&password=admin123"
    $login = Invoke-WebRequest -Uri "http://localhost:8000/api/auth/login" `
        -Method POST `
        -Body $body `
        -ContentType "application/x-www-form-urlencoded" `
        -UseBasicParsing
    
    $tokenData = $login.Content | ConvertFrom-Json
    if ($tokenData.access_token) {
        Write-Host "   ✅ Login successful!" -ForegroundColor Green
        Write-Host "   Token: $($tokenData.access_token.Substring(0, 20))..." -ForegroundColor Gray
        
        # Test 3: Get Me
        Write-Host "`n3. Testing /me endpoint with token..." -ForegroundColor Yellow
        $headers = @{
            "Authorization" = "Bearer $($tokenData.access_token)"
            "Content-Type" = "application/json"
        }
        
        $me = Invoke-WebRequest -Uri "http://localhost:8000/api/auth/me" `
            -Headers $headers `
            -UseBasicParsing
        
        $userData = $me.Content | ConvertFrom-Json
        Write-Host "   ✅ User data retrieved!" -ForegroundColor Green
        Write-Host "   Email: $($userData.email)" -ForegroundColor Gray
        Write-Host "   Is Admin: $($userData.is_admin)" -ForegroundColor Gray
        
        if ($userData.is_admin) {
            Write-Host "`n✅ All tests passed! Login should work in browser." -ForegroundColor Green
        } else {
            Write-Host "`n⚠️  User is not admin" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ❌ No token in response" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Login failed: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Response: $responseBody" -ForegroundColor Red
    }
}

Write-Host "`nDone!" -ForegroundColor Cyan

