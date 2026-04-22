# 設定
$DMM_API_ID = "TNgEcHuzc13U3zf9sDCR"
$DMM_AFFILIATE_ID = "mikiyabskb-990"
$SUPABASE_URL = "https://myqcwdfcjqgexpbkomst.supabase.co"
$SUPABASE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $SUPABASE_KEY) {
    Write-Host "ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable not set" -ForegroundColor Red
    Write-Host "Set it with: `$env:SUPABASE_SERVICE_ROLE_KEY = 'your-key'" -ForegroundColor Yellow
    exit 1
}

$supabaseHeaders = @{
    "apikey"        = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
    "Content-Type"  = "application/json"
    "Prefer"        = "resolution=merge-duplicates"
}

$PARALLEL = 10
$progressFile = "$PSScriptRoot\fetch-actress-details-progress.txt"

# 進捗ログ読み込み（再開用）
$completedIds = @{}
if (Test-Path $progressFile) {
    Get-Content $progressFile | ForEach-Object { $completedIds[$_] = $true }
    Write-Host "Resume mode: $($completedIds.Count) actresses already completed, skipping." -ForegroundColor Yellow
}

# 未取得の女優一覧をSupabaseから取得（bustがnullの女優）
Write-Host "Fetching actresses without detail data..." -ForegroundColor Cyan
$pageSize = 1000
$allActresses = @()

$offset = 0
while ($true) {
    # RPC経由でページング取得
    $body = "{""p_limit"":$pageSize,""p_offset"":$offset}" 
    try {
        $res = Invoke-WebRequest -Uri "$SUPABASE_URL/rest/v1/rpc/get_actresses_without_details" `
            -Method Post -Headers $supabaseHeaders -Body $body -UseBasicParsing
        $batch = $res.Content | ConvertFrom-Json
        if ($batch.Count -eq 0) { break }
        $allActresses += $batch
        Write-Host "  Fetched $($allActresses.Count) actresses so far..." -ForegroundColor Gray
        if ($batch.Count -lt $pageSize) { break }
        $offset += $pageSize
    } catch {
        Write-Host "Error fetching actress list: $_" -ForegroundColor Red
        break
    }
}

# 処理済みをスキップ
if ($null -eq $completedIds) { $completedIds = @{} }
$actresses = $allActresses | Where-Object { -not $completedIds[$_.id.ToString()] }
Write-Host "Total: $($actresses.Count) actresses to process, parallel: $PARALLEL" -ForegroundColor Cyan

$total = 0
$errors = 0

for ($i = 0; $i -lt $actresses.Count; $i += $PARALLEL) {
    $batch = $actresses[$i..([Math]::Min($i + $PARALLEL - 1, $actresses.Count - 1))]

    $jobs = $batch | ForEach-Object {
        $actress = $_
        Start-Job -ScriptBlock {
            param($actress, $dmmId, $dmmAffi, $supaUrl, $supaKey)

            $headers = @{
                "apikey"        = $supaKey
                "Authorization" = "Bearer $supaKey"
                "Content-Type"  = "application/json"
                "Prefer"        = "resolution=merge-duplicates"
            }

            # DMM APIで女優詳細取得
            $url = "https://api.dmm.com/affiliate/v3/ActressSearch?api_id=$dmmId&affiliate_id=$dmmAffi&output=json&actress_id=$($actress.id)"
            try {
                $res = Invoke-WebRequest -Uri $url -UseBasicParsing -Headers @{"User-Agent" = "Mozilla/5.0"}
                $data = ($res.Content | ConvertFrom-Json).result.actress
                if (-not $data -or $data.Count -eq 0) {
                    return @{ id = $actress.id.ToString(); name = $actress.name; status = "not_found" }
                }
                $a = $data[0]

                # Supabaseに更新
                $body = @{
                    bust     = if ($a.bust) { [int]$a.bust } else { $null }
                    waist    = if ($a.waist) { [int]$a.waist } else { $null }
                    hip      = if ($a.hip) { [int]$a.hip } else { $null }
                    height   = if ($a.height) { [int]$a.height } else { $null }
                    cup      = if ($a.cup) { $a.cup } else { $null }
                    birthday = if ($a.birthday) { $a.birthday } else { $null }
                } | ConvertTo-Json -Compress

                $patchUrl = "$supaUrl/rest/v1/actresses?id=eq.$($actress.id)"
                Invoke-WebRequest -Uri $patchUrl -Method Patch -Headers $headers -Body $body -UseBasicParsing | Out-Null

                return @{ id = $actress.id.ToString(); name = $actress.name; status = "ok" }
            } catch {
                return @{ id = $actress.id.ToString(); name = $actress.name; status = "error" }
            }
        } -ArgumentList $actress, $DMM_API_ID, $DMM_AFFILIATE_ID, $SUPABASE_URL, $SUPABASE_KEY
    }

    $results = $jobs | Wait-Job | Receive-Job
    $jobs | Remove-Job

    foreach ($r in $results) {
        if ($r) {
            $pct = [Math]::Round(($i + $PARALLEL) / $actresses.Count * 100, 1)
            if ($r.status -eq "ok") {
                Write-Host "[$($i + $PARALLEL)/$($actresses.Count) $pct%] $($r.name): updated" -ForegroundColor Green
                $total++
            } elseif ($r.status -eq "not_found") {
                Write-Host "[$($i + $PARALLEL)/$($actresses.Count) $pct%] $($r.name): not found in DMM" -ForegroundColor Yellow
            } else {
                Write-Host "[$($i + $PARALLEL)/$($actresses.Count) $pct%] $($r.name): error" -ForegroundColor Red
                $errors++
            }
            Add-Content -Path $progressFile -Value $r.id
        }
    }

    Start-Sleep -Milliseconds 200
}

Write-Host "Done! Updated: $total, Errors: $errors" -ForegroundColor Cyan

# 全完了時はログ削除
if (Test-Path $progressFile) { Remove-Item $progressFile }
Write-Host "Progress log cleared." -ForegroundColor Gray
