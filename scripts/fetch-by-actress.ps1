$headers = @{"Authorization"="Bearer kazulog-cron-secret-2024"}
$base = "http://localhost:3000/api/batch/sync"

Write-Host "Fetching actress IDs..." -ForegroundColor Cyan
$actressRes = Invoke-WebRequest -Uri "http://localhost:3000/api/batch/actress-ids?limit=200" -Headers $headers -UseBasicParsing
$actresses = ($actressRes.Content | ConvertFrom-Json).actresses

# 47番目から再開
$actresses = $actresses | Select-Object -Skip 46

Write-Host "Remaining: $($actresses.Count) actresses" -ForegroundColor Cyan

$total = 0
$i = 46

# 5人ずつ並列処理
for ($batch = 0; $batch -lt $actresses.Count; $batch += 5) {
    $group = $actresses | Select-Object -Skip $batch -First 5
    $jobs = @()

    foreach ($actress in $group) {
        $i++
        $aid = $actress.id
        $aname = $actress.name
        $jobs += Start-Job -ScriptBlock {
            param($base, $headers, $aid, $aname, $i)
            $offset = 1
            $saved = 0
            while ($true) {
                $url = "${base}?type=by_actress&actress_id=${aid}&offset=${offset}"
                try {
                    $res = Invoke-WebRequest -Uri $url -Headers $headers -UseBasicParsing
                    $json = $res.Content | ConvertFrom-Json
                    $saved += $json.results.saved
                    if ($json.results.saved -lt 2000) { break }
                    $offset = $json.results.next_offset
                } catch { break }
                Start-Sleep -Milliseconds 200
            }
            return @{name=$aname; saved=$saved; index=$i}
        } -ArgumentList $base, $headers, $aid, $aname, $i
    }

    $results = $jobs | Wait-Job | Receive-Job
    $jobs | Remove-Job

    foreach ($r in $results) {
        Write-Host "[$($r.index)/200] $($r.name): $($r.saved) works" -ForegroundColor Green
        $total += $r.saved
    }

    Start-Sleep -Milliseconds 300
}

Write-Host "Total saved: $total" -ForegroundColor Cyan
Write-Host "Done!" -ForegroundColor Cyan
