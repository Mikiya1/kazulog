# 設定
$DMM_API_ID = "TNgEcHuzc13U3zf9sDCR"
$DMM_AFFILIATE_ID = "mikiyabskb-990"
$SUPABASE_URL = "https://myqcwdfcjqgexpbkomst.supabase.co"
$SUPABASE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY

# ID範囲（並列実行用）
# 例: .etch-actress-details.ps1 -IdFrom "1000000" -IdTo "1040000"
param(
    [string]$IdFrom = "",
    [string]$IdTo = ""
)

if (-not $SUPABASE_KEY) {
    Write-Host "ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable not set" -ForegroundColor Red
    exit 1
}

$supabaseHeaders = @{
    "apikey"        = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
    "Content-Type"  = "application/json"
    "Prefer"        = "resolution=merge-duplicates"
}

$suffix = if ($IdFrom -ne "") { "-$IdFrom" } else { "" }
$progressFile = "$PSScriptRoot\fetch-actress-details-progress$suffix.txt"

# 進捗ログ読み込み（再開用）
$completedIds = [hashtable]@{}
if (Test-Path $progressFile) {
    $lines = Get-Content $progressFile
    if ($lines) {
        @($lines) | ForEach-Object { $completedIds[$_.Trim()] = $true }
    }
    Write-Host "Resume mode: $($completedIds.Count) actresses already completed." -ForegroundColor Yellow
}

# 未取得の女優一覧をSupabaseから取得
Write-Host "Fetching actresses without detail data..." -ForegroundColor Cyan
$pageSize = 1000
$allActresses = [System.Collections.ArrayList]@()
$offset = 0

while ($true) {
    $body = "{`"p_limit`":$pageSize,`"p_offset`":$offset,`"p_id_from`":`"$IdFrom`",`"p_id_to`":`"$IdTo`"}"
    try {
        $res = Invoke-WebRequest -Uri "$SUPABASE_URL/rest/v1/rpc/get_actresses_without_details" `
            -Method Post -Headers $supabaseHeaders -Body $body -UseBasicParsing
        $batch = $res.Content | ConvertFrom-Json
        if (-not $batch -or $batch.Count -eq 0) { break }
        foreach ($item in $batch) { $allActresses.Add($item) | Out-Null }
        Write-Host "  Fetched $($allActresses.Count) actresses so far..." -ForegroundColor Gray
        if ($batch.Count -lt $pageSize) { break }
        $offset += $pageSize
    } catch {
        Write-Host "Error fetching actress list: $_" -ForegroundColor Red
        break
    }
}

# 処理済みをスキップ
$actresses = @($allActresses | Where-Object { -not $completedIds[$_.id.ToString()] })
Write-Host "Total: $($actresses.Count) actresses to process" -ForegroundColor Cyan

$total = 0
$errors = 0
$i = 0

foreach ($actress in $actresses) {
    $i++
    $pct = [Math]::Round($i / $actresses.Count * 100, 1)

    try {
        # DMM APIで女優詳細取得
        $actressId = [string]$actress.id
        $dmmUrl = "https://api.dmm.com/affiliate/v3/ActressSearch?api_id=" + $DMM_API_ID + "&affiliate_id=" + $DMM_AFFILIATE_ID + "&output=json&actress_id=" + $actressId
        $dmmRes = Invoke-WebRequest -Uri $dmmUrl -UseBasicParsing -Headers @{"User-Agent" = "Mozilla/5.0"}
        $data = ($dmmRes.Content | ConvertFrom-Json).result.actress

        if (-not $data -or $data.Count -eq 0) {
            Write-Host "[$i/$($actresses.Count) $pct%] $($actress.name): not found" -ForegroundColor Yellow
            Add-Content -Path $progressFile -Value $actress.id.ToString()
            continue
        }

        $a = $data[0]

        # 値があるフィールドだけbodyに含める
        $updateHash = @{}
        if ($a.bust)     { $updateHash["bust"]     = [int]$a.bust }
        if ($a.waist)    { $updateHash["waist"]    = [int]$a.waist }
        if ($a.hip)      { $updateHash["hip"]      = [int]$a.hip }
        if ($a.height)   { $updateHash["height"]   = [int]$a.height }
        if ($a.cup)      { $updateHash["cup"]      = [string]$a.cup }
        if ($a.birthday) { $updateHash["birthday"] = [string]$a.birthday }
        if ($a.imageURL -and $a.imageURL.large) { $updateHash["image_url"] = [string]$a.imageURL.large }
        if ($updateHash.Count -eq 0) {
            Write-Host "[$i/$($actresses.Count) $pct%] $($actress.name): no data" -ForegroundColor Gray
            Add-Content -Path $progressFile -Value $actress.id.ToString()
            continue
        }
        $updateBody = $updateHash | ConvertTo-Json -Compress

        $patchUrl = $SUPABASE_URL + "/rest/v1/actresses?id=eq." + $actressId
        Invoke-WebRequest -Uri $patchUrl `
            -Method Patch -Headers $supabaseHeaders -Body $updateBody -UseBasicParsing | Out-Null

        Write-Host "[$i/$($actresses.Count) $pct%] $($actress.name): updated" -ForegroundColor Green
        $total++

    } catch {
        Write-Host "[$i/$($actresses.Count) $pct%] $($actress.name): error - $($_.Exception.Message)" -ForegroundColor Red
        $errors++
    }

    Add-Content -Path $progressFile -Value $actress.id.ToString()
    Start-Sleep -Milliseconds 100
}

Write-Host "Done! Updated: $total, Errors: $errors" -ForegroundColor Cyan

if ($errors -eq 0 -and (Test-Path $progressFile)) {
    Remove-Item $progressFile
    Write-Host "Progress log cleared." -ForegroundColor Gray
}
