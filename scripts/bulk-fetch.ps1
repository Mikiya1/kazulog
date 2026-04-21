$headers = @{"Authorization"="Bearer kazulog-cron-secret-2024"}
$base = "http://localhost:3000/api/batch/sync"

Write-Host "=== 大量データ取得開始 ===" -ForegroundColor Cyan

# 人気順 10000件 (100件×100バッチ = offset 1,501,1001,1501...9501)
Write-Host "`n[人気順] 取得開始..." -ForegroundColor Yellow
for ($offset = 1; $offset -le 9501; $offset += 500) {
    $url = "${base}?type=works&sort=rank&offset=${offset}&batches=5"
    Write-Host "  offset=${offset}..." -NoNewline
    $res = Invoke-WebRequest -Uri $url -Headers $headers -UseBasicParsing
    $json = $res.Content | ConvertFrom-Json
    Write-Host " 保存: $($json.results.saved)件, 次のoffset: $($json.results.next_offset)" -ForegroundColor Green
    Start-Sleep -Seconds 1
}

# 新着順 5000件
Write-Host "`n[新着順] 取得開始..." -ForegroundColor Yellow
for ($offset = 1; $offset -le 4501; $offset += 500) {
    $url = "${base}?type=works&sort=date&offset=${offset}&batches=5"
    Write-Host "  offset=${offset}..." -NoNewline
    $res = Invoke-WebRequest -Uri $url -Headers $headers -UseBasicParsing
    $json = $res.Content | ConvertFrom-Json
    Write-Host " 保存: $($json.results.saved)件" -ForegroundColor Green
    Start-Sleep -Seconds 1
}

Write-Host "`n=== 完了！ ===" -ForegroundColor Cyan
