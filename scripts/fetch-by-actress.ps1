$headers = @{"Authorization"="Bearer kazulog-cron-secret-2024"}
$base = "http://localhost:3000/api/batch/sync"

Write-Host "Fetching actress IDs..." -ForegroundColor Cyan
$actressRes = Invoke-WebRequest -Uri "http://localhost:3000/api/batch/actress-ids" -Headers $headers -UseBasicParsing
$actresses = ($actressRes.Content | ConvertFrom-Json).actresses

Write-Host "Total: $($actresses.Count) actresses" -ForegroundColor Cyan

$total = 0
$i = 0
foreach ($actress in $actresses) {
    $i++
    $offset = 1
    $actressSaved = 0
    Write-Host "[$i/$($actresses.Count)] $($actress.name)..." -NoNewline

    while ($true) {
        $url = "${base}?type=by_actress&actress_id=$($actress.id)&offset=${offset}"
        $res = Invoke-WebRequest -Uri $url -Headers $headers -UseBasicParsing
        $json = $res.Content | ConvertFrom-Json
        $actressSaved += $json.results.saved

        if ($json.results.saved -lt 2000) { break }
        $offset = $json.results.next_offset
        Start-Sleep -Milliseconds 200
    }

    Write-Host " $actressSaved works" -ForegroundColor Green
    $total += $actressSaved
    Start-Sleep -Milliseconds 200
}

Write-Host "Total saved: $total" -ForegroundColor Cyan
Write-Host "Done!" -ForegroundColor Cyan
