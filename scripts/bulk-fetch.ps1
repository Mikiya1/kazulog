$headers = @{"Authorization"="Bearer kazulog-cron-secret-2024"}
$base = "http://localhost:3000/api/batch/sync"

Write-Host "Start bulk fetch" -ForegroundColor Cyan

for ($offset = 26701; $offset -le 49901; $offset += 2000) {
    $url = "${base}?type=works&sort=rank&offset=${offset}&batches=20"
    Write-Host "offset=${offset}..." -NoNewline
    try {
        $res = Invoke-WebRequest -Uri $url -Headers $headers -UseBasicParsing
        $json = $res.Content | ConvertFrom-Json
        if ($json.results.saved -eq 0) {
            Write-Host " No data, stopping." -ForegroundColor Red
            break
        }
        Write-Host " saved: $($json.results.saved)" -ForegroundColor Green
    } catch {
        Write-Host " Error: $_" -ForegroundColor Red
    }
    Start-Sleep -Milliseconds 500
}

Write-Host "Done!" -ForegroundColor Cyan
