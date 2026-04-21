$headers = @{"Authorization"="Bearer kazulog-cron-secret-2024"}
$base = "http://localhost:3000/api/batch/sync"

# 人気ランキング上位100人の女優IDをSupabaseから取得して実行
# まずSupabaseから人気女優IDを取得するAPIを叩く
$actressUrl = "http://localhost:3000/api/batch/actress-ids"
$actressRes = Invoke-WebRequest -Uri $actressUrl -Headers $headers -UseBasicParsing
$actressJson = $actressRes.Content | ConvertFrom-Json
$actresses = $actressJson.actresses

Write-Host "Total actresses: $($actresses.Count)" -ForegroundColor Cyan

$total = 0
foreach ($actress in $actresses) {
    $offset = 1
    Write-Host "[$($actress.name)] fetching..." -NoNewline
    
    $saved = 0
    while ($true) {
        $url = "${base}?type=by_actress&actress_id=$($actress.id)&offset=${offset}"
        $res = Invoke-WebRequest -Uri $url -Headers $headers -UseBasicParsing
        $json = $res.Content | ConvertFrom-Json
        $saved += $json.results.saved
        
        if ($json.results.saved -lt 2000) { break }
        $offset = $json.results.next_offset
        Start-Sleep -Milliseconds 300
    }
    
    Write-Host " saved: ${saved}" -ForegroundColor Green
    $total += $saved
    Start-Sleep -Milliseconds 300
}

Write-Host "Total saved: ${total}" -ForegroundColor Cyan
Write-Host "Done!" -ForegroundColor Cyan
