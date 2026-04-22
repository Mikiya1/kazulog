# 設定
$DMM_API_ID = "TNgEcHuzc13U3zf9sDCR"
$DMM_AFFILIATE_ID = "mikiyabskb-990"
$SUPABASE_URL = "https://myqcwdfcjqgexpbkomst.supabase.co"
$SUPABASE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY

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

$progressFile = "$PSScriptRoot\fetch-actress-details-progress.txt"

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
    $body = "{`"p_limit`":$pageSize,`"p_offset`":$offset}"
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
        $dmmUrl = "https://api.dmm.com/affiliate/v3/ActressSearch?api_id=$DMM_API_ID&affiliate_id=$DMM_AFFILIATE_ID&output=json&actress_id=$($actress.id)"
        $dmmRes = Invoke-WebRequest -Uri $dmmUrl -UseBasicParsing -Headers @{"User-Agent" = "Mozilla/5.0"}
        $data = ($dmmRes.Content | ConvertFrom-Json).result.actress

        if (-not $data -or $data.Count -eq 0) {
            Write-Host "[$i/$($actresses.Count) $pct%] $($actress.name): not found" -ForegroundColor Yellow
            Add-Content -Path $progressFile -Value $actress.id.ToString()
            continue
        }

        $a = $data[0]

        # Supabaseに更新
        $updateBody = @{
            bust     = if ($a.bust) { [int]$a.bust } else { $null }
            waist    = if ($a.waist) { [int]$a.waist } else { $null }
            hip      = if ($a.hip) { [int]$a.hip } else { $null }
            height   = if ($a.height) { [int]$a.height } else { $null }
            cup      = if ($a.cup) { $a.cup } else { $null }
            birthday = if ($a.birthday) { $a.birthday } else { $null }
        } | ConvertTo-Json -Compress

        Invoke-WebRequest -Uri "$SUPABASE_URL/rest/v1/actresses?id=eq.$($actress.id)" `
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
