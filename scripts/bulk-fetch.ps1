$headers = @{"Authorization"="Bearer kazulog-cron-secret-2024"}
$base = "http://localhost:3000/api/batch/sync"

Write-Host "=== 大量データ取得開始 ===" -ForegroundColor Cyan

# 人気順 offset=6901から続き（既に約6900件入ってるので）
Write-Host "`n[人気順] 取得開始..." -ForegroundColor Yellow
for ($offset = 6901; $offset -le 49901; $offset += 500) {
    $url = "${base}?type=works&sort=rank&offset=${offset}&batches=5"
    Write-Host "  offset=${offset}..." -NoNewline
    $res = Invoke-WebRequest -Uri $url -Headers $headers -UseBasicParsing
    $json = $res.Content | ConvertFrom-Json
    if ($json.results.saved -eq 0) {
        Write-Host " データなし、終了" -ForegroundColor Red
        break
    }
    Write-Host " 保存: $($json.results.saved)件" -ForegroundColor Green
    Start-Sleep -Milliseconds 500
}

Write-Host "`n=== 完了！ ===" -ForegroundColor Cyan
