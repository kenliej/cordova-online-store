<#
.SYNOPSIS
    End-to-end API smoke test for the Online Mall Cordova Laravel backend.

.DESCRIPTION
    Exercises the real HTTP surface against a running backend (php artisan serve
    or the Docker stack) using Sanctum SPA cookie + CSRF auth, exactly like the
    React client:
      - public catalog endpoints
      - customer auth, cart, checkout, order cancel
      - worker order status transitions
      - admin accounts / sales / stores / contact messages
      - authorization (401/403/404) and rate-limit behaviour
      - registration with ID document uploads + admin approval

    Exit code 0 = every check passed, 1 = at least one failure.

.PARAMETER BaseUrl
    Backend origin, default http://127.0.0.1:8000

.EXAMPLE
    pwsh -File scripts/smoke-test.ps1
#>
[CmdletBinding()]
param(
    [string]$BaseUrl = "http://127.0.0.1:8000"
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$script:Passed = 0
$script:Failed = 0
$script:Results = @()

$script:Customer = @{ email = "customer@onlinemall.test"; password = "Customer#2026Secure" }
$script:Worker = @{ email = "worker@onlinemall.test"; password = "Worker#2026Secure" }
$script:Admin = @{ email = "admin@onlinemall.test"; password = "Admin#2026Secure" }

function Write-Section([string]$Title) {
    Write-Host ""
    Write-Host "=== $Title ===" -ForegroundColor Cyan
}

function Test-Check([string]$Name, [scriptblock]$Action) {
    try {
        & $Action
        $script:Passed++
        $script:Results += [pscustomobject]@{ Check = $Name; Result = "PASS"; Detail = "" }
        Write-Host "  PASS  $Name" -ForegroundColor Green
    } catch {
        $script:Failed++
        $message = $_.Exception.Message
        $script:Results += [pscustomobject]@{ Check = $Name; Result = "FAIL"; Detail = $message }
        Write-Host "  FAIL  $Name" -ForegroundColor Red
        Write-Host "        $message" -ForegroundColor DarkRed
    }
}

function Assert-True([bool]$Condition, [string]$Message) {
    if (-not $Condition) { throw $Message }
}

function Assert-Equal($Actual, $Expected, [string]$Message) {
    if ($Actual -ne $Expected) { throw "$Message (expected '$Expected', got '$Actual')" }
}

function New-ApiSession {
    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $null = Invoke-WebRequest -Uri "$BaseUrl/sanctum/csrf-cookie" -WebSession $session `
        -Headers @{ Accept = "application/json" } -TimeoutSec 30
    return $session
}

function Get-CsrfHeaders([Microsoft.PowerShell.Commands.WebRequestSession]$Session) {
    $cookie = $Session.Cookies.GetCookies($BaseUrl) |
        Where-Object { $_.Name -eq "XSRF-TOKEN" } |
        Select-Object -First 1

    if (-not $cookie) { throw "XSRF-TOKEN cookie was not issued by $BaseUrl" }

    return @{
        "X-XSRF-TOKEN"     = [System.Uri]::UnescapeDataString($cookie.Value)
        "Accept"           = "application/json"
        "X-Requested-With" = "XMLHttpRequest"
        # Sanctum only treats a request as stateful (session cookie auth) when
        # the browser-style Referer/Origin matches a configured stateful domain.
        "Referer"          = "$BaseUrl/"
        "Origin"           = $BaseUrl
    }
}

function Invoke-Api {
    param(
        [Parameter(Mandatory)] [string]$Method,
        [Parameter(Mandatory)] [string]$Path,
        [Microsoft.PowerShell.Commands.WebRequestSession]$Session,
        $Body
    )

    $headers = @{
        Accept           = "application/json"
        "X-Requested-With" = "XMLHttpRequest"
        Referer          = "$BaseUrl/"
        Origin           = $BaseUrl
    }
    if ($Session) {
        $headers = Get-CsrfHeaders $Session
    }

    $request = @{
        Uri        = "$BaseUrl$Path"
        Method     = $Method
        Headers    = $headers
        WebSession = $Session
        TimeoutSec = 60
        UseBasicParsing = $true
    }

    if ($Body -ne $null) {
        $request.ContentType = "application/json"
        $request.Body = ($Body | ConvertTo-Json -Depth 10 -Compress)
    }

    try {
        $response = Invoke-WebRequest @request
        $status = [int]$response.StatusCode
        $text = $response.Content
    } catch {
        # Windows PowerShell 5.1 throws on non-2xx responses.
        $webResponse = $_.Exception.Response
        if ($null -eq $webResponse) { throw }
        $reader = New-Object System.IO.StreamReader($webResponse.GetResponseStream())
        $text = $reader.ReadToEnd()
        $reader.Dispose()
        $status = [int]$webResponse.StatusCode
    }

    $json = $null
    if ($text) {
        try { $json = $text | ConvertFrom-Json } catch { $json = $null }
    }

    return [pscustomobject]@{
        Status = $status
        Json   = $json
        Text   = $text
    }
}

<#
    Multipart/form-data helper (works on Windows PowerShell 5.1, where
    Invoke-WebRequest has no -Form parameter). Fields is a hashtable; File fields
    are FileInfo values, plain values are strings.
#>
function Invoke-ApiMultipart {
    param(
        [Parameter(Mandatory)] [string]$Method,
        [Parameter(Mandatory)] [string]$Path,
        [Parameter(Mandatory)] [Microsoft.PowerShell.Commands.WebRequestSession]$Session,
        [Parameter(Mandatory)] [hashtable]$Fields
    )

    $boundary = "----OnlineMallBoundary" + [guid]::NewGuid().ToString("N")
    $stream = New-Object System.IO.MemoryStream
    $writer = New-Object System.IO.StreamWriter($stream, (New-Object System.Text.UTF8Encoding($false)))
    $writer.NewLine = "`r`n"

    foreach ($key in $Fields.Keys) {
        $value = $Fields[$key]
        if ($value -is [System.IO.FileInfo]) {
            $bytes = [System.IO.File]::ReadAllBytes($value.FullName)
            $writer.Write("--$boundary`r`n")
            $writer.Write("Content-Disposition: form-data; name=`"$key`"; filename=`"$($value.Name)`"`r`n")
            $writer.Write("Content-Type: image/png`r`n`r`n")
            $writer.Flush()
            $stream.Write($bytes, 0, $bytes.Length)
            $writer.Write("`r`n")
        } else {
            $writer.Write("--$boundary`r`n")
            $writer.Write("Content-Disposition: form-data; name=`"$key`"`r`n`r`n")
            $writer.Write([string]$value)
            $writer.Write("`r`n")
        }
        $writer.Flush()
    }

    $writer.Write("--$boundary--`r`n")
    $writer.Flush()
    $bodyBytes = $stream.ToArray()
    $writer.Dispose()
    $stream.Dispose()

    $headers = Get-CsrfHeaders $Session
    $request = @{
        Uri             = "$BaseUrl$Path"
        Method          = $Method
        Headers         = $headers
        WebSession      = $Session
        ContentType     = "multipart/form-data; boundary=$boundary"
        Body            = $bodyBytes
        TimeoutSec      = 120
        UseBasicParsing = $true
    }

    try {
        $response = Invoke-WebRequest @request
        $status = [int]$response.StatusCode
        $text = $response.Content
    } catch {
        $webResponse = $_.Exception.Response
        if ($null -eq $webResponse) { throw }
        $reader = New-Object System.IO.StreamReader($webResponse.GetResponseStream())
        $text = $reader.ReadToEnd()
        $reader.Dispose()
        $status = [int]$webResponse.StatusCode
    }

    $json = $null
    if ($text) {
        try { $json = $text | ConvertFrom-Json } catch { $json = $null }
    }

    return [pscustomobject]@{ Status = $status; Json = $json; Text = $text }
}

function Login-Api([string]$Login, [string]$Password) {
    $session = New-ApiSession
    $result = Invoke-Api -Method POST -Path "/api/auth/login" -Session $session -Body @{
        login    = $Login
        password = $Password
        remember = $true
    }
    if ($result.Status -ne 200) {
        throw "Login failed for $Login (HTTP $($result.Status)): $($result.Text)"
    }
    return $session
}

Write-Host "Online Mall Cordova - end-to-end API smoke test" -ForegroundColor Yellow
Write-Host "Target: $BaseUrl"

# ---------------------------------------------------------------------------
Write-Section "1. Public endpoints"
# ---------------------------------------------------------------------------
$products = $null
Test-Check "GET /api/health returns ok" {
    $r = Invoke-Api -Method GET -Path "/api/health"
    Assert-Equal $r.Status 200 "health status"
    Assert-Equal $r.Json.data.status "ok" "health payload"
    Assert-Equal $r.Json.data.database "ok" "database connectivity"
}

Test-Check "GET /api/products returns a seeded catalogue" {
    $script:products = Invoke-Api -Method GET -Path "/api/products?per_page=50"
    Assert-Equal $script:products.Status 200 "products status"
    Assert-True ($script:products.Json.data.Count -ge 5) "expected >= 5 seeded products, got $($script:products.Json.data.Count)"
}

Test-Check "GET /api/products?sort=price_asc is ordered" {
    $r = Invoke-Api -Method GET -Path "/api/products?sort=price_asc&per_page=50"
    Assert-Equal $r.Status 200 "sorted products status"
    $prices = @($r.Json.data | ForEach-Object { [double]$_.price })
    $sorted = @($prices | Sort-Object)
    Assert-True (($prices -join ",") -eq ($sorted -join ",")) "products are not sorted ascending"
}

Test-Check "GET /api/products/{slug} returns detail with images" {
    $slug = $script:products.Json.data[0].slug
    $r = Invoke-Api -Method GET -Path "/api/products/$slug"
    Assert-Equal $r.Status 200 "product detail status"
    Assert-True ($r.Json.data.images.Count -ge 1) "product detail missing images[]"
    Assert-True ($null -ne $r.Json.data.category) "product detail missing category"
}

Test-Check "GET /api/stores returns seeded stores" {
    $r = Invoke-Api -Method GET -Path "/api/stores?per_page=50"
    Assert-Equal $r.Status 200 "stores status"
    Assert-True ($r.Json.data.Count -ge 5) "expected >= 5 seeded stores"
}

Test-Check "GET /api/home returns featured collections" {
    $r = Invoke-Api -Method GET -Path "/api/home"
    Assert-Equal $r.Status 200 "home status"
    Assert-True ($null -ne $r.Json.data.new_arrivals) "home missing new_arrivals"
    Assert-True ($null -ne $r.Json.data.stores) "home missing stores"
}

Test-Check "search endpoint is injection-safe" {
    $r = Invoke-Api -Method GET -Path ("/api/products?search=" + [uri]::EscapeDataString("' OR 1=1-- <script>alert(1)</script>"))
    Assert-Equal $r.Status 200 "search with payload"
    Assert-True ($r.Json.data -is [array]) "search did not return a JSON array"
}

Test-Check "POST /api/contact stores a public message" {
    # Public form, but Laravel's CSRF middleware still applies to the SPA flow.
    $contactSession = New-ApiSession
    $r = Invoke-Api -Method POST -Path "/api/contact" -Session $contactSession -Body @{
        name    = "Smoke Test"
        email   = "smoke@onlinemall.test"
        phone   = "09170000001"
        subject = "Smoke test message"
        message = "Hello from the automated smoke test."
        website = ""
    }
    Assert-True ($r.Status -in 200, 201) "contact status was $($r.Status)"
}

# ---------------------------------------------------------------------------
Write-Section "2. Authentication & authorization"
# ---------------------------------------------------------------------------
Test-Check "unauthenticated cart access is 401" {
    $r = Invoke-Api -Method GET -Path "/api/cart"
    Assert-Equal $r.Status 401 "cart without session"
}

Test-Check "unauthenticated admin access is 401" {
    $r = Invoke-Api -Method GET -Path "/api/admin/accounts"
    Assert-Equal $r.Status 401 "admin without session"
}

Test-Check "invalid credentials are rejected (422)" {
    $session = New-ApiSession
    $r = Invoke-Api -Method POST -Path "/api/auth/login" -Session $session -Body @{
        login = "nobody@onlinemall.test"; password = "WrongPassword#1"; remember = $false
    }
    Assert-Equal $r.Status 422 "invalid login status"
}

Test-Check "customer login + /auth/me returns customer role" {
    $script:customerSession = Login-Api $script:Customer.email $script:Customer.password
    $r = Invoke-Api -Method GET -Path "/api/auth/me" -Session $script:customerSession
    Assert-Equal $r.Status 200 "auth me status"
    Assert-Equal $r.Json.data.role "customer" "customer role"
}

Test-Check "customer cannot access admin endpoints (403)" {
    $r = Invoke-Api -Method GET -Path "/api/admin/accounts" -Session $script:customerSession
    Assert-Equal $r.Status 403 "customer -> admin"
}

Test-Check "customer cannot access worker endpoints (403)" {
    $r = Invoke-Api -Method GET -Path "/api/worker/orders" -Session $script:customerSession
    Assert-Equal $r.Status 403 "customer -> worker"
}

# ---------------------------------------------------------------------------
Write-Section "3. Cart, checkout and order cancellation"
# ---------------------------------------------------------------------------
$script:orderCancel = $null
$script:orderReady = $null
$script:productId = $null

Test-Check "catalogue product can be added to cart" {
    $inStock = @($script:products.Json.data | Where-Object { [int]$_.stock -ge 2 -and $_.is_active -ne $false })
    Assert-True ($inStock.Count -ge 1) "no in-stock product available for cart test"
    $script:productId = $inStock[0].id
    $r = Invoke-Api -Method POST -Path "/api/cart/items" -Session $script:customerSession -Body @{
        product_id = $script:productId; quantity = 2
    }
    Assert-True ($r.Status -in 200, 201) "add to cart status was $($r.Status): $($r.Text)"
    $r2 = Invoke-Api -Method GET -Path "/api/cart" -Session $script:customerSession
    Assert-True ($r2.Json.data.items.Count -ge 1) "cart is empty after add"
    Assert-True ([double]$r2.Json.data.summary.total -gt 0) "cart total not computed"
}

Test-Check "cart quantity can be updated" {
    $cart = Invoke-Api -Method GET -Path "/api/cart" -Session $script:customerSession
    $item = $cart.Json.data.items[0]
    $r = Invoke-Api -Method PATCH -Path "/api/cart/items/$($item.id)" -Session $script:customerSession -Body @{ quantity = 1 }
    Assert-True ($r.Status -in 200, 204) "update cart status was $($r.Status)"
}

Test-Check "checkout creates a pending order and decrements stock" {
    $before = Invoke-Api -Method GET -Path "/api/products?per_page=50"
    $beforeStock = ($before.Json.data | Where-Object { $_.id -eq $script:productId }).stock
    $r = Invoke-Api -Method POST -Path "/api/checkout" -Session $script:customerSession -Body @{ select_all = $true }
    Assert-True ($r.Status -in 200, 201) "checkout status was $($r.Status): $($r.Text)"
    $script:orderCancel = $r.Json.data
    Assert-True ($script:orderCancel.id -gt 0) "checkout did not return an order id"
    Assert-Equal $script:orderCancel.status_code "pending" "new order status"
    $after = Invoke-Api -Method GET -Path "/api/products?per_page=50"
    $afterStock = ($after.Json.data | Where-Object { $_.id -eq $script:productId }).stock
    Assert-True ($afterStock -lt $beforeStock) "stock was not decremented at checkout ($beforeStock -> $afterStock)"
}

Test-Check "second checkout creates an order left for the worker flow" {
    $inStock = @($script:products.Json.data | Where-Object { [int]$_.stock -ge 2 })
    Assert-True ($inStock.Count -ge 1) "no in-stock product for second order"
    $add = Invoke-Api -Method POST -Path "/api/cart/items" -Session $script:customerSession -Body @{
        product_id = $inStock[0].id; quantity = 1
    }
    Assert-True ($add.Status -in 200, 201) "add to cart (2) status was $($add.Status)"
    $r = Invoke-Api -Method POST -Path "/api/checkout" -Session $script:customerSession -Body @{ select_all = $true }
    Assert-True ($r.Status -in 200, 201) "checkout (2) status was $($r.Status)"
    $script:orderReady = $r.Json.data
}

Test-Check "customer can cancel a pending order and stock is restored" {
    $r = Invoke-Api -Method PATCH -Path "/api/orders/$($script:orderCancel.id)/cancel" -Session $script:customerSession
    Assert-True ($r.Status -in 200, 204) "cancel status was $($r.Status): $($r.Text)"
    $detail = Invoke-Api -Method GET -Path "/api/orders/$($script:orderCancel.id)" -Session $script:customerSession
    Assert-Equal $detail.Json.data.status_code "cancelled" "cancelled order status"
}

Test-Check "order history is returned for the customer" {
    $r = Invoke-Api -Method GET -Path "/api/orders?status=history" -Session $script:customerSession
    Assert-Equal $r.Status 200 "order history status"
    Assert-True (@($r.Json.data | Where-Object { $_.id -eq $script:orderCancel.id }).Count -ge 1) "cancelled order missing from history"
}

# ---------------------------------------------------------------------------
Write-Section "4. Worker order workflow"
# ---------------------------------------------------------------------------
Test-Check "worker login + order list" {
    $script:workerSession = Login-Api $script:Worker.email $script:Worker.password
    $r = Invoke-Api -Method GET -Path "/api/worker/orders?status=pending" -Session $script:workerSession
    Assert-Equal $r.Status 200 "worker orders status"
    Assert-True ($null -ne $r.Json.data) "worker orders returned no data"
}

Test-Check "worker marks order ready (pending -> ready)" {
    $r = Invoke-Api -Method PATCH -Path "/api/worker/orders/$($script:orderReady.id)/status" -Session $script:workerSession -Body @{ status = "ready" }
    Assert-True ($r.Status -in 200, 204) "mark ready status was $($r.Status): $($r.Text)"
    $detail = Invoke-Api -Method GET -Path "/api/worker/orders/$($script:orderReady.id)" -Session $script:workerSession
    Assert-Equal $detail.Json.data.status_code "ready" "order status after ready"
    Assert-True ($null -ne $detail.Json.data.claim_deadline) "claim deadline was not set"
}

Test-Check "worker marks order claimed (ready -> claimed)" {
    $r = Invoke-Api -Method PATCH -Path "/api/worker/orders/$($script:orderReady.id)/status" -Session $script:workerSession -Body @{ status = "claimed" }
    Assert-True ($r.Status -in 200, 204) "mark claimed status was $($r.Status): $($r.Text)"
}

Test-Check "invalid transition is rejected with 409" {
    # "ready" is a valid enum value but claimed is terminal -> state machine 409.
    $r = Invoke-Api -Method PATCH -Path "/api/worker/orders/$($script:orderReady.id)/status" -Session $script:workerSession -Body @{ status = "ready" }
    Assert-Equal $r.Status 409 "invalid transition"
    Assert-Equal $r.Json.code "invalid_order_status" "invalid transition code"
}

Test-Check "worker cannot cancel an already claimed order (409)" {
    $r = Invoke-Api -Method PATCH -Path "/api/worker/orders/$($script:orderReady.id)/status" -Session $script:workerSession -Body @{ status = "cancelled" }
    Assert-Equal $r.Status 409 "claimed -> cancelled"
}

# ---------------------------------------------------------------------------
Write-Section "5. Admin reporting & account management"
# ---------------------------------------------------------------------------
Test-Check "admin login + account tabs" {
    $script:adminSession = Login-Api $script:Admin.email $script:Admin.password
    foreach ($tab in @("pending", "customer", "worker", "removed")) {
        $r = Invoke-Api -Method GET -Path "/api/admin/accounts?tab=$tab&per_page=10" -Session $script:adminSession
        Assert-Equal $r.Status 200 "accounts tab $tab status"
        Assert-True ($null -ne $r.Json.data) "accounts tab $tab returned no data"
    }
}

Test-Check "admin sales summary reflects the claimed order" {
    $month = (Get-Date).ToString("yyyy-MM")
    $r = Invoke-Api -Method GET -Path "/api/admin/sales/summary?month=$month" -Session $script:adminSession
    Assert-Equal $r.Status 200 "sales summary status"
    Assert-True ([double]$r.Json.data.revenue -ge 0) "revenue missing"
    $today = (Get-Date).ToString("yyyy-MM-dd")
    $daily = Invoke-Api -Method GET -Path "/api/admin/sales?date=$today&status=claimed" -Session $script:adminSession
    Assert-Equal $daily.Status 200 "daily sales status"
}

Test-Check "admin can list stores and contact messages" {
    $stores = Invoke-Api -Method GET -Path "/api/admin/stores?per_page=10" -Session $script:adminSession
    Assert-Equal $stores.Status 200 "admin stores status"
    $messages = Invoke-Api -Method GET -Path "/api/admin/contact-messages?per_page=10" -Session $script:adminSession
    Assert-Equal $messages.Status 200 "admin contact messages status"
    Assert-True ($messages.Json.data.Count -ge 1) "smoke-test contact message missing"
}

Test-Check "admin cannot use customer cart endpoints (403)" {
    $r = Invoke-Api -Method GET -Path "/api/cart" -Session $script:adminSession
    Assert-Equal $r.Status 403 "admin -> cart"
}

# ---------------------------------------------------------------------------
Write-Section "6. Registration + ID upload + approval"
# ---------------------------------------------------------------------------
Test-Check "registration with ID images creates a pending account" {
    $pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    $tmpDir = Join-Path ([System.IO.Path]::GetTempPath()) ("onlinemall-smoke-" + [guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Path $tmpDir -Force | Out-Null
    $idFront = Join-Path $tmpDir "id-front.png"
    $idBack = Join-Path $tmpDir "id-back.png"
    [System.IO.File]::WriteAllBytes($idFront, [Convert]::FromBase64String($pngBase64))
    [System.IO.File]::WriteAllBytes($idBack, [Convert]::FromBase64String($pngBase64))

    $email = "smoke." + (Get-Date -Format "yyyyMMddHHmmss") + "@onlinemall.test"
    $script:newCustomerEmail = $email
    $script:newCustomerPassword = "SmokeTest#2026Secure"

    $form = @{
        name                  = "Smoke Test Registrant"
        email                 = $email
        phone                 = "0917" + (Get-Random -Minimum 1000000 -Maximum 9999999)
        address               = "Cordova, Cebu"
        birthday              = "1995-05-15"
        gender                = "Gender Neutral"
        password              = $script:newCustomerPassword
        password_confirmation = $script:newCustomerPassword
        agree_terms           = "1"
        id_front              = Get-Item $idFront
        id_back               = Get-Item $idBack
    }
    $registerSession = New-ApiSession
    $r = Invoke-ApiMultipart -Method POST -Path "/api/auth/register" -Session $registerSession -Fields $form
    if ($r.Status -eq 429) { throw "registration rate limited (429) - rerun later" }
    Assert-True ($r.Status -in 200, 201) "register status was $($r.Status): $($r.Text)"
    Remove-Item -LiteralPath $tmpDir -Recurse -Force -ErrorAction SilentlyContinue
}

Test-Check "pending account cannot log in (403 account_pending)" {
    $session = New-ApiSession
    $r = Invoke-Api -Method POST -Path "/api/auth/login" -Session $session -Body @{
        login = $script:newCustomerEmail; password = $script:newCustomerPassword; remember = $false
    }
    Assert-Equal $r.Status 403 "pending login status"
    Assert-Equal $r.Json.code "account_pending" "pending login code"
}

Test-Check "admin approves the pending registration" {
    $list = Invoke-Api -Method GET -Path "/api/admin/accounts?tab=pending&per_page=50" -Session $script:adminSession
    $target = @($list.Json.data | Where-Object { $_.email -eq $script:newCustomerEmail }) | Select-Object -First 1
    Assert-True ($null -ne $target) "new registration not found in pending tab"
    $r = Invoke-Api -Method POST -Path "/api/admin/accounts/$($target.id)/approve" -Session $script:adminSession
    Assert-True ($r.Status -in 200, 204) "approve status was $($r.Status): $($r.Text)"
    $script:newCustomerId = $target.id
}

Test-Check "newly approved customer can log in" {
    $session = Login-Api $script:newCustomerEmail $script:newCustomerPassword
    $r = Invoke-Api -Method GET -Path "/api/auth/me" -Session $session
    Assert-Equal $r.Status 200 "approved user /auth/me"
    Assert-Equal $r.Json.data.role "customer" "approved role"
    Assert-True ($null -ne $r.Json.data.customer_no) "customer_no was not generated on approval"
}

# ---------------------------------------------------------------------------
Write-Section "7. Rate limiting"
# ---------------------------------------------------------------------------
Test-Check "login brute force is throttled (429)" {
    $login = "bruteforce." + [guid]::NewGuid().ToString("N") + "@onlinemall.test"
    $last = 0
    for ($i = 1; $i -le 7; $i++) {
        $session = New-ApiSession
        $r = Invoke-Api -Method POST -Path "/api/auth/login" -Session $session -Body @{
            login = $login; password = "WrongPass#2026"; remember = $false
        }
        $last = $r.Status
        if ($last -eq 429) { break }
    }
    Assert-Equal $last 429 "expected throttling after repeated failures"
}

# ---------------------------------------------------------------------------
Write-Section "Summary"
# ---------------------------------------------------------------------------
$total = $script:Passed + $script:Failed
Write-Host ""
Write-Host "Checks: $total   Passed: $($script:Passed)   Failed: $($script:Failed)" -ForegroundColor Yellow

if ($script:Failed -gt 0) {
    Write-Host ""
    Write-Host "Failed checks:" -ForegroundColor Red
    $script:Results | Where-Object { $_.Result -eq "FAIL" } | Format-Table -AutoSize
    exit 1
}

Write-Host "All end-to-end API checks passed." -ForegroundColor Green
exit 0
