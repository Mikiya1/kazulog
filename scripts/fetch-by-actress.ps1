$headers = @{"Authorization"="Bearer kazulog-cron-secret-2024"}
$base = "http://localhost:3000/api/batch/sync"

Write-Host "Fetching actress IDs..." -ForegroundColor Cyan
$actressRes = Invoke-WebRequest -Uri "http://localhost:3000/api/batch/actress-ids?limit=200" -Headers $headers -UseBasicParsing
$actresses = ($actressRes.Content | ConvertFrom-Json).actresses

Write-Host "Total: $($actresses.Count) actresses" -ForegroundColor Cyan

$total = 0
$parallelSize = 5

for ($i = 0; $i -lt $actresses.Count; $i += $parallelSize) {
    $batch = $actresses[$i..([Math]::Min($i + $parallelSize - 1, $actresses.Count - 1))]
    
    $jobs = $batch | ForEach-Object {
        $actress = $_
        Start-Job -ScriptBlock {
            param($actress, $base, $headers)
            $offset = 1
            $saved = 0
            while ($true) {
                $url = "${base}?type=by_actress&actress_id=$($actress.id)&offset=${offset}"
                try {
                    $res = Invoke-WebRequest -Uri $url -Headers $headers -UseBasicParsing
                    $json = $res.Content | ConvertFrom-Json
                    $saved += $json.results.saved
                    if ($json.results.saved -lt 2000) { break }
                    $offset = $json.results.next_offset
                } catch { break }
                Start-Sleep -Milliseconds 200
            }
            return @{name=$actress.name; saved=$saved}
        } -ArgumentList $actress, $base, $headers
    }
    
    $results = $jobs | Wait-Job | Receive-Job
    $jobs | Remove-Job
    
    foreach ($r in $results) {
        Write-Host "[$($i+1)-$($i+$parallelSize)/$($actresses.Count)] $($r.name): $($r.saved) works" -ForegroundColor Green
        $total += $r.saved
    }
}

Write-Host "Total saved: $total" -ForegroundColor Cyan
Write-Host "Done!" -ForegroundColor Cyan
