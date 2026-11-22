<#
.SYNOPSIS
    API smoke test for the cPanel / split deployment (Bearer token + CORS).

.DESCRIPTION
    Tests a remote or local Laravel API WITHOUT browser cookies, so it works
    against:
      - your real cPanel backend   : -BaseUrl https://kjugarap.top/omc-backend
      - the local cPanel-style sim : -BaseUrl http://127.0.0.1:8092/omc-backend

    Default run is READ-ONLY (health, CORS, token login, profile, catalogue,
    admin/worker reads, protected ID download, logout). Pass -Full to also
    exercise cart -> checkout -> cancel (creates and cancels an order).

.PARAMETER BaseUrl
    API root INCLUDING the cPanel subdirectory, e.g.
    https://kjugarap.top/omc-backend  (the script appends /api/...).

.PARAMETER Origin
    Optional browser origin to test CORS against, e.g. https://your-app.vercel.app

.PARAMETER Full
    Enable mutating cart/checkout/cancel checks.

.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/smoke-test-token.ps1 -BaseUrl https://kjugarap.top/omc-backend -Origin https://omc.vercel.app
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$BaseUrl,
    [string]$Origin = "",
    [switch]$Full
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$BaseUrl = $BaseUrl.TrimEnd("/")
$Api = "$BaseUrl/api"

$script:passed = 0
$script:failed = 0
$script:results = @()

$Demo = @{
    Admin    = @{ Email = "admin@onlinemall.test"; Password = "Admin#2026Secure" }
    Worker   = @{ Email = "worker@onlinemall.test"; Password = "Worker#2026Secure" }
    Customer = @{ Email = "customer@onlinemall.test"; Password = "Customer#2026Secure" }
}

function Write-Section([string]$Title) {
    Write-Host ""
    Write-Host "=== $Title ===" -ForegroundColor Cyan
}

function Test-Check([string]$Name, [scriptblock]$Action) {
    try {
        & $Action
        $script:passed++
        $script:results += [pscustomobject]@{ Check = $Name; Result = "PASS"; Detail = "" }
        Write-Host "  PASS  $Name" -ForegroundColor Green
    } catch {
        $script:failed++
        $script:results += [pscustomobject]@{ Check = $Name; Result = "FAIL"; Detail = $_.Exception.Message }
        Write-Host "  FAIL  $Name" -ForegroundColor Red
        Write-Host "        $($_.Exception.Message)" -ForegroundColor DarkRed
    }
}

function Assert-True([bool]$Condition, [string]$Message) {
    if (-not $Condition) { throw $Message }
}

function Assert-Equal($Actual, $Expected, [string]$Message) {
    if ($Actual -ne $Expected) { throw "$Message (expected '$Expected', got '$Actual')" }
}

function Get-HeaderValue($Headers, [string]$Name) {
    if ($null -eq $Headers) { return "" }
    try {
        $values = $Headers.GetValues($Name)
        if ($values) { return [string]($values | Select-Object -First 1) }
    } catch { }
    return [string]$Headers[$Name]
}

function Invoke-Api {
    param(
        [Parameter(Mandatory)] [string]$Method,
        [Parameter(Mandatory)] [string]$Path,
        [string]$Token = "",
        $Body = $null,
        [hashtable]$ExtraHeaders = @{}
    )

    $headers = @{ Accept = "application/json"; "X-Requested-With" = "XMLHttpRequest" }
    if ($Origin) { $headers["Origin"] = $Origin; $headers["Referer"] = "$Origin/" }
    if ($Token) { $headers["Authorization"] = "Bearer $Token" }
    foreach ($key in $ExtraHeaders.Keys) { $headers[$key] = $ExtraHeaders[$key] }

    $request = @{
        Uri             = "$Api$Path"
        Method          = $Method
        Headers         = $headers
        TimeoutSec      = 30
        UseBasicParsing = $true
    }
    if ($null -ne $Body) {
        $request.ContentType = "application/json"
        $request.Body = ($Body | ConvertTo-Json -Depth 10 -Compress)
    }

    try {
        $response = Invoke-WebRequest @request
        $status = [int]$response.StatusCode
        $text = $response.Content
        $responseHeaders = $response.Headers
    } catch {
        $webResponse = $_.Exception.Response
        if ($null -eq $webResponse) { throw }
        $reader = New-Object System.IO.StreamReader($webResponse.GetResponseStream())
        $text = $reader.ReadToEnd()
        $reader.Dispose()
        $status = [int]$webResponse.StatusCode
        $responseHeaders = $webResponse.Headers
        if ($status -eq 419) {
            throw "HTTP 419 CSRF mismatch: the request was treated as a stateful cookie request. Use an Origin that is NOT in SANCTUM_STATEFUL_DOMAINS."
        }
    }

    $json = $null
    if ($text) { try { $json = $text | ConvertFrom-Json } catch { $json = $null } }

    return [pscustomobject]@{ Status = $status; Json = $json; Text = $text; Headers = $responseHeaders }
}

function Get-Token([string]$Email, [string]$Password) {
    $response = Invoke-Api -Method POST -Path "/auth/token" -Body @{
        login       = $Email
        password    = $Password
        device_name = "smoke-test"
    }
    if ($response.Status -ne 200) {
        throw "Token login failed for $Email (HTTP $($response.Status)): $($response.Text)"
    }
    $token = [string]$response.Json.data.token
    Assert-True ($token.Length -gt 20) "Token login returned an empty token."
    return $token
}

Write-Host "Online Mall API - split-deployment smoke test" -ForegroundColor Yellow
Write-Host "API: $Api"
Write-Host "Mode: $(if ($Full) { 'FULL (mutating cart/checkout)' } else { 'READ-ONLY' })"
if ($Origin) { Write-Host "CORS origin: $Origin" }

# ---------------------------------------------------------------------------
Write-Section "1. Public + CORS"
# ---------------------------------------------------------------------------
Test-Check "GET /api/health reports ok" {
    $response = Invoke-Api -Method GET -Path "/health"
    Assert-Equal $response.Status 200 "health status"
    Assert-Equal $response.Json.data.status "ok" "health payload"
    Assert-Equal $response.Json.data.database "ok" "database connectivity"
}

if ($Origin) {
    Test-Check "CORS preflight allows the frontend origin" {
        $preflight = Invoke-Api -Method OPTIONS -Path "/auth/token" -ExtraHeaders @{
            "Access-Control-Request-Method"  = "POST"
            "Access-Control-Request-Headers" = "authorization,content-type"
        }
        Assert-Equal $preflight.Status 204 "preflight status"
        $allowOrigin = Get-HeaderValue $preflight.Headers "Access-Control-Allow-Origin"
        Assert-Equal $allowOrigin $Origin "Access-Control-Allow-Origin"
    }

    Test-Check "CORS headers on a simple GET" {
        $response = Invoke-Api -Method GET -Path "/products?per_page=1"
        Assert-Equal $response.Status 200 "products status"
        $allowOrigin = Get-HeaderValue $response.Headers "Access-Control-Allow-Origin"
        Assert-Equal $allowOrigin $Origin "Access-Control-Allow-Origin"
    }
}

$products = $null
Test-Check "GET /api/products returns the catalogue" {
    $script:products = Invoke-Api -Method GET -Path "/products?per_page=50"
    Assert-Equal $script:products.Status 200 "products status"
    Assert-True ($script:products.Json.data.Count -ge 1) "catalogue is empty"
}

# ---------------------------------------------------------------------------
Write-Section "2. Token auth (customer)"
# ---------------------------------------------------------------------------
$customerToken = ""
Test-Check "customer obtains a Bearer token" {
    $script:customerToken = Get-Token $Demo.Customer.Email $Demo.Customer.Password
    Assert-True ($script:customerToken -like "*|*") "token is not a Sanctum plaintext token"
}

Test-Check "Bearer token authenticates /auth/me" {
    $me = Invoke-Api -Method GET -Path "/auth/me" -Token $script:customerToken
    Assert-Equal $me.Status 200 "me status"
    Assert-Equal $me.Json.data.role "customer" "role"
}

Test-Check "customer token is scoped out of admin endpoints (403)" {
    $response = Invoke-Api -Method GET -Path "/admin/accounts" -Token $script:customerToken
    Assert-Equal $response.Status 403 "customer -> admin"
}

Test-Check "customer token is scoped out of worker endpoints (403)" {
    $response = Invoke-Api -Method GET -Path "/worker/orders" -Token $script:customerToken
    Assert-Equal $response.Status 403 "customer -> worker"
}

Test-Check "GET /auth/me without token is 401" {
    $response = Invoke-Api -Method GET -Path "/auth/me"
    Assert-Equal $response.Status 401 "anonymous me"
}

# ---------------------------------------------------------------------------
Write-Section "3. Admin + worker token access"
# ---------------------------------------------------------------------------
Test-Check "admin token can list accounts and download a private ID scan" {
    $adminToken = Get-Token $Demo.Admin.Email $Demo.Admin.Password
    $accounts = Invoke-Api -Method GET -Path "/admin/accounts?tab=pending&per_page=5" -Token $adminToken
    Assert-Equal $accounts.Status 200 "admin accounts"

    if ($accounts.Json.data.Count -gt 0) {
        $accountId = $accounts.Json.data[0].id
        $docs = Invoke-Api -Method GET -Path "/admin/accounts/$accountId/id-documents" -Token $adminToken
        Assert-Equal $docs.Status 200 "id-documents metadata"
        $documents = @($docs.Json.data.documents)
        Assert-True ($documents.Count -ge 1) "no ID documents returned"

        $downloadUrl = [string]$documents[0].download_url
        Assert-True ($downloadUrl.Length -gt 10) "missing download_url"

        $imageHeaders = @{ Accept = "image/*"; Authorization = "Bearer $adminToken" }
        if ($Origin) { $imageHeaders["Origin"] = $Origin }
        try {
            $image = Invoke-WebRequest -Uri $downloadUrl -Headers $imageHeaders -UseBasicParsing -TimeoutSec 30
            Assert-Equal ([int]$image.StatusCode) 200 "ID scan download"
            Assert-True ([string](Get-HeaderValue $image.Headers "Content-Type") -like "image/*") "unexpected ID scan content type"
        } catch {
            throw "ID scan download failed: $($_.Exception.Message)"
        }
    }
}

Test-Check "worker token can list the order queue" {
    $workerToken = Get-Token $Demo.Worker.Email $Demo.Worker.Password
    $response = Invoke-Api -Method GET -Path "/worker/orders?status=pending&per_page=5" -Token $workerToken
    Assert-Equal $response.Status 200 "worker orders"
}

Test-Check "admin sales summary is readable" {
    $adminToken = Get-Token $Demo.Admin.Email $Demo.Admin.Password
    $month = (Get-Date).ToString("yyyy-MM")
    $response = Invoke-Api -Method GET -Path "/admin/sales/summary?month=$month" -Token $adminToken
    Assert-Equal $response.Status 200 "sales summary"
}

# ---------------------------------------------------------------------------
Write-Section "4. Cart / checkout (optional)"
# ---------------------------------------------------------------------------
if ($Full) {
    $customerToken = Get-Token $Demo.Customer.Email $Demo.Customer.Password
    $inStock = @($products.Json.data | Where-Object { [int]$_.stock -ge 2 })
    Test-Check "add item, checkout and cancel an order with a Bearer token" {
        Assert-True ($inStock.Count -ge 1) "no in-stock product available"
        $product = $inStock[0]

        $add = Invoke-Api -Method POST -Path "/cart/items" -Token $customerToken -Body @{
            product_id = $product.id
            quantity   = 1
        }
        Assert-True ($add.Status -in @(200, 201)) "add to cart status $($add.Status): $($add.Text)"

        $checkout = Invoke-Api -Method POST -Path "/checkout" -Token $customerToken -Body @{ select_all = $true }
        Assert-True ($checkout.Status -in @(200, 201)) "checkout status $($checkout.Status): $($checkout.Text)"
        $orderId = $checkout.Json.data.id
        Assert-True ($orderId -gt 0) "checkout returned no order id"

        $cancel = Invoke-Api -Method PATCH -Path "/orders/$orderId/cancel" -Token $customerToken
        Assert-True ($cancel.Status -in @(200, 204)) "cancel status $($cancel.Status): $($cancel.Text)"
    }
}

# ---------------------------------------------------------------------------
Write-Section "5. Logout revokes the token"
# ---------------------------------------------------------------------------
Test-Check "logout deletes the token and it stops working" {
    $token = Get-Token $Demo.Customer.Email $Demo.Customer.Password
    $logout = Invoke-Api -Method POST -Path "/auth/logout" -Token $token
    Assert-Equal $logout.Status 204 "logout status"

    $me = Invoke-Api -Method GET -Path "/auth/me" -Token $token
    Assert-Equal $me.Status 401 "revoked token still authenticated"
}

# ---------------------------------------------------------------------------
Write-Section "Summary"
# ---------------------------------------------------------------------------
$total = $script:passed + $script:failed
Write-Host ""
Write-Host "Checks: $total   Passed: $($script:passed)   Failed: $($script:failed)" -ForegroundColor Yellow
if ($script:failed -gt 0) {
    Write-Host "Failed checks:" -ForegroundColor Red
    $script:results | Where-Object { $_.Result -eq "FAIL" } | Format-Table -AutoSize
    exit 1
}

Write-Host "All token/CORS smoke checks passed." -ForegroundColor Green
exit 0
