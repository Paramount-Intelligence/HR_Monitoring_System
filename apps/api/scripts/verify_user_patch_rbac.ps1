# Safe no-op verification for PATCH /users/{id} RBAC (F-01).
# Requires env vars for credentials — never hardcode passwords.
param(
    [string]$ApiBaseUrl = $(if ($env:PIMS_API_BASE_URL) { $env:PIMS_API_BASE_URL } else { "http://localhost:8080/api/v1" })
)

function Mask-Token([string]$Token) {
    if (-not $Token -or $Token.Length -lt 12) { return "<none>" }
    return "$($Token.Substring(0, 8))...$($Token.Substring($Token.Length - 4))"
}

function Login([string]$Email, [string]$Password) {
    if (-not $Email -or -not $Password) {
        throw "Missing credentials. Set PIMS_*_EMAIL and PIMS_*_PASSWORD environment variables."
    }
    $body = @{ email = $Email; password = $Password } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "$ApiBaseUrl/auth/login" -Method POST -ContentType "application/json" -Body $body
    return $response.access_token
}

function Assert-Status([string]$Label, [int]$Expected, [object]$Response, [hashtable]$Body, [string]$TargetEmail) {
    $actual = [int]$Response.StatusCode
    $text = if ($Body) { ($Body | ConvertTo-Json -Compress) } else { "" }
    $leaked = ($TargetEmail -and $text -like "*$TargetEmail*")
    if ($actual -ne $Expected -or $leaked) {
        Write-Host "FAIL $Label expected=$Expected actual=$actual leaked=$leaked" -ForegroundColor Red
        if ($text) { Write-Host "Body: $text" }
        throw "Verification failed: $Label"
    }
    Write-Host "PASS $Label -> $actual" -ForegroundColor Green
}

function Invoke-Patch([string]$Token, [string]$UserId, [hashtable]$Payload) {
    $json = if ($Payload.Count -eq 0) { "{}" } else { ($Payload | ConvertTo-Json -Compress) }
    return Invoke-WebRequest -Uri "$ApiBaseUrl/users/$UserId" -Method PATCH `
        -Headers @{ Authorization = "Bearer $Token" } `
        -ContentType "application/json" -Body $json `
        -SkipHttpErrorCheck
}

function Get-User([string]$Token, [string]$UserId) {
    return Invoke-WebRequest -Uri "$ApiBaseUrl/users/$UserId" -Method GET `
        -Headers @{ Authorization = "Bearer $Token" } `
        -SkipHttpErrorCheck
}

$internToken = Login $env:PIMS_INTERN_EMAIL $env:PIMS_INTERN_PASSWORD
$managerToken = Login $env:PIMS_MANAGER_EMAIL $env:PIMS_MANAGER_PASSWORD
$adminToken = Login $env:PIMS_ADMIN_EMAIL $env:PIMS_ADMIN_PASSWORD

Write-Host "Tokens: intern=$(Mask-Token $internToken) manager=$(Mask-Token $managerToken) admin=$(Mask-Token $adminToken)"

$me = Invoke-RestMethod -Uri "$ApiBaseUrl/users/me" -Headers @{ Authorization = "Bearer $internToken" }
$users = Invoke-RestMethod -Uri "$ApiBaseUrl/users" -Headers @{ Authorization = "Bearer $adminToken" }
$other = $users | Where-Object { $_.id -ne $me.id } | Select-Object -First 1
$managerMe = Invoke-RestMethod -Uri "$ApiBaseUrl/users/me" -Headers @{ Authorization = "Bearer $managerToken" }
$managerTeam = Invoke-RestMethod -Uri "$ApiBaseUrl/users" -Headers @{ Authorization = "Bearer $managerToken" }
$outside = $users | Where-Object { $_.id -ne $managerMe.id -and ($managerTeam.id -notcontains $_.id) } | Select-Object -First 1

if (-not $other) { throw "Could not resolve a non-self user for intern tests." }
if (-not $outside) { throw "Could not resolve an outside-team user for manager tests." }

Write-Host "Intern self=$($me.id) other=$($other.id)"
Write-Host "Manager self=$($managerMe.id) outside=$($outside.id)"

$r = Get-User $internToken $other.id
Assert-Status "intern GET other" 403 ($r) ($r.Content | ConvertFrom-Json -ErrorAction SilentlyContinue) $other.email

$noopCases = @(
    @{ label = "intern PATCH other {}"; token = $internToken; user = $other; payload = @{} },
    @{ label = "intern PATCH other full_name"; token = $internToken; user = $other; payload = @{ full_name = $other.full_name } },
    @{ label = "intern PATCH other phone"; token = $internToken; user = $other; payload = @{ phone = $other.phone } },
    @{ label = "intern PATCH other designation"; token = $internToken; user = $other; payload = @{ designation = $other.designation } },
    @{ label = "intern PATCH other manager_id"; token = $internToken; user = $other; payload = @{ manager_id = $other.manager_id } },
    @{ label = "intern PATCH other status"; token = $internToken; user = $other; payload = @{ status = $other.status } },
    @{ label = "intern PATCH self role"; token = $internToken; user = $me; payload = @{ role = "admin" } },
    @{ label = "intern PATCH self status"; token = $internToken; user = $me; payload = @{ status = "inactive" } },
    @{ label = "manager PATCH outside {}"; token = $managerToken; user = $outside; payload = @{} },
    @{ label = "manager PATCH outside full_name"; token = $managerToken; user = $outside; payload = @{ full_name = $outside.full_name } }
)

foreach ($case in $noopCases) {
    $resp = Invoke-Patch $case.token $case.user.id $case.payload
    $body = $resp.Content | ConvertFrom-Json -ErrorAction SilentlyContinue
    Assert-Status $case.label 403 $resp $body $case.user.email
}

$adminResp = Invoke-Patch $adminToken $other.id @{ designation = $other.designation }
if ([int]$adminResp.StatusCode -ne 200) {
    throw "Admin allowed PATCH failed with status $($adminResp.StatusCode)"
}
Write-Host "PASS admin PATCH allowed field -> 200" -ForegroundColor Green
Write-Host "All safe RBAC verification checks passed."
