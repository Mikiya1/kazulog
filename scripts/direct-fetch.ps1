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
    "apikey" = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
    "Content-Type" = "application/json"
    "Prefer" = "resolution=merge-duplicates"
}

$PARALLEL = 10  # 同時処理数

function Fetch-DMMWorks($actressId, $offset, $hits = 100) {
    $url = "https://api.dmm.com/affiliate/v3/ItemList?api_id=$DMM_API_ID&affiliate_id=$DMM_AFFILIATE_ID&site=FANZA&service=digital&floor=videoa&output=json&hits=$hits&offset=$offset&article[]=actress&article_id[]=$actressId&sort=date"
    try {
        $res = Invoke-WebRequest -Uri $url -UseBasicParsing -Headers @{"User-Agent"="Mozilla/5.0"}
        $json = $res.Content | ConvertFrom-Json
        return $json.result.items
    } catch { return @() }
}

function Save-Works($items) {
    if ($items.Count -eq 0) { return 0 }
    
    # 既存IDチェック
    $ids = ($items | ForEach-Object { '"' + $_.content_id + '"' }) -join ","
    $checkUrl = "$SUPABASE_URL/rest/v1/works?select=id&id=in.($ids)"
    $existing = @{}
    try {
        $res = Invoke-WebRequest -Uri $checkUrl -Headers $supabaseHeaders -UseBasicParsing
        ($res.Content | ConvertFrom-Json) | ForEach-Object { $existing[$_.id] = $true }
    } catch {}
    
    $newItems = $items | Where-Object { -not $existing[$_.content_id] }
    if ($newItems.Count -eq 0) { return 0 }
    
    # works保存
    $works = $newItems | ForEach-Object {
        @{
            id = $_.content_id
            title = $_.title
            affiliate_url = $_.affiliateURL
            image_large = $_.imageURL.large
            image_small = $_.imageURL.small
            volume = if ($_.volume) { [int]$_.volume } else { $null }
            date = if ($_.date) { $_.date } else { $null }
            price = $_.prices.price
        }
    }
    $body = $works | ConvertTo-Json -Depth 3 -Compress
    if ($works.Count -eq 1) { $body = "[$body]" }
    
    try {
        Invoke-WebRequest -Uri "$SUPABASE_URL/rest/v1/works" -Method Post -Headers $supabaseHeaders -Body $body -UseBasicParsing | Out-Null
    } catch {}

    # genres保存
    $genreMap = @{}
    $workGenres = @()
    $newItems | ForEach-Object {
        $workId = $_.content_id
        $_.iteminfo.genre | ForEach-Object {
            $genreMap[$_.id.ToString()] = $_.name
            $workGenres += @{ work_id = $workId; genre_id = $_.id.ToString() }
        }
    }
    if ($genreMap.Count -gt 0) {
        $genreBody = ($genreMap.GetEnumerator() | ForEach-Object { @{ id = $_.Key; name = $_.Value } }) | ConvertTo-Json -Depth 2 -Compress
        if ($genreMap.Count -eq 1) { $genreBody = "[$genreBody]" }
        try { Invoke-WebRequest -Uri "$SUPABASE_URL/rest/v1/genres" -Method Post -Headers $supabaseHeaders -Body $genreBody -UseBasicParsing | Out-Null } catch {}
        $wgBody = $workGenres | ConvertTo-Json -Depth 2 -Compress
        if ($workGenres.Count -eq 1) { $wgBody = "[$wgBody]" }
        try { Invoke-WebRequest -Uri "$SUPABASE_URL/rest/v1/work_genres" -Method Post -Headers $supabaseHeaders -Body $wgBody -UseBasicParsing | Out-Null } catch {}
    }

    # actresses保存
    $actressMap = @{}
    $workActresses = @()
    $newItems | ForEach-Object {
        $workId = $_.content_id
        $_.iteminfo.actress | ForEach-Object {
            $actressMap[$_.id.ToString()] = @{ id = $_.id.ToString(); name = $_.name; ruby = $_.ruby }
            $workActresses += @{ work_id = $workId; actress_id = $_.id.ToString() }
        }
    }
    if ($actressMap.Count -gt 0) {
        $actressBody = ($actressMap.Values) | ConvertTo-Json -Depth 2 -Compress
        if ($actressMap.Count -eq 1) { $actressBody = "[$actressBody]" }
        try { Invoke-WebRequest -Uri "$SUPABASE_URL/rest/v1/actresses" -Method Post -Headers $supabaseHeaders -Body $actressBody -UseBasicParsing | Out-Null } catch {}
        $waBody = $workActresses | ConvertTo-Json -Depth 2 -Compress
        if ($workActresses.Count -eq 1) { $waBody = "[$waBody]" }
        try { Invoke-WebRequest -Uri "$SUPABASE_URL/rest/v1/work_actresses" -Method Post -Headers $supabaseHeaders -Body $waBody -UseBasicParsing | Out-Null } catch {}
    }

    return $newItems.Count
}

function Fetch-AllForActress($actress) {
    $totalSaved = 0
    $offset = 1
    while ($true) {
        $items = Fetch-DMMWorks $actress.id $offset
        if ($items.Count -eq 0) { break }
        $saved = Save-Works $items
        $totalSaved += $saved
        if ($items.Count -lt 100) { break }
        $offset += 100
        Start-Sleep -Milliseconds 100
    }
    return @{ name = $actress.name; saved = $totalSaved }
}

# 女優一覧取得
Write-Host "Fetching actress list from Supabase..." -ForegroundColor Cyan
$actressUrl = "$SUPABASE_URL/rest/v1/rpc/get_actresses_by_work_count"
$actressRes = Invoke-WebRequest -Uri $actressUrl -Method Post -Headers $supabaseHeaders -Body '{"p_limit":200}' -UseBasicParsing
$actresses = $actressRes.Content | ConvertFrom-Json

Write-Host "Total: $($actresses.Count) actresses, parallel: $PARALLEL" -ForegroundColor Cyan

$total = 0
for ($i = 0; $i -lt $actresses.Count; $i += $PARALLEL) {
    $batch = $actresses[$i..([Math]::Min($i + $PARALLEL - 1, $actresses.Count - 1))]
    
    $jobs = $batch | ForEach-Object {
        $actress = $_
        Start-Job -ScriptBlock ${function:Fetch-DMMWorks} -ArgumentList $actress | Out-Null
        Start-Job -ScriptBlock {
            param($actress, $dmmId, $dmmAffi, $supaUrl, $supaKey)
            
            $supabaseHeaders = @{
                "apikey" = $supaKey
                "Authorization" = "Bearer $supaKey"
                "Content-Type" = "application/json"
                "Prefer" = "resolution=merge-duplicates"
            }
            
            function Fetch-DMMWorks2($actressId, $offset) {
                $url = "https://api.dmm.com/affiliate/v3/ItemList?api_id=$dmmId&affiliate_id=$dmmAffi&site=FANZA&service=digital&floor=videoa&output=json&hits=100&offset=$offset&article[]=actress&article_id[]=$actressId&sort=date"
                try {
                    $res = Invoke-WebRequest -Uri $url -UseBasicParsing -Headers @{"User-Agent"="Mozilla/5.0"}
                    return ($res.Content | ConvertFrom-Json).result.items
                } catch { return @() }
            }

            function Save-Works2($items, $supaUrl, $headers) {
                if ($items.Count -eq 0) { return 0 }
                $ids = ($items | ForEach-Object { '"' + $_.content_id + '"' }) -join ","
                $existing = @{}
                try {
                    $res = Invoke-WebRequest -Uri "$supaUrl/rest/v1/works?select=id&id=in.($ids)" -Headers $headers -UseBasicParsing
                    ($res.Content | ConvertFrom-Json) | ForEach-Object { $existing[$_.id] = $true }
                } catch {}
                $newItems = $items | Where-Object { -not $existing[$_.content_id] }
                if ($newItems.Count -eq 0) { return 0 }
                $works = $newItems | ForEach-Object { @{ id=$_.content_id; title=$_.title; affiliate_url=$_.affiliateURL; image_large=$_.imageURL.large; image_small=$_.imageURL.small; volume=if($_.volume){[int]$_.volume}else{$null}; date=$_.date; price=$_.prices.price } }
                $body = $works | ConvertTo-Json -Depth 3 -Compress
                if ($works.Count -eq 1) { $body = "[$body]" }
                try { Invoke-WebRequest -Uri "$supaUrl/rest/v1/works" -Method Post -Headers $headers -Body $body -UseBasicParsing | Out-Null } catch {}
                $genreMap = @{}; $workGenres = @(); $actressMap = @{}; $workActresses = @()
                $newItems | ForEach-Object {
                    $wid = $_.content_id
                    $_.iteminfo.genre | ForEach-Object { $genreMap[$_.id.ToString()]=$_.name; $workGenres+=@{work_id=$wid;genre_id=$_.id.ToString()} }
                    $_.iteminfo.actress | ForEach-Object { $actressMap[$_.id.ToString()]=@{id=$_.id.ToString();name=$_.name;ruby=$_.ruby}; $workActresses+=@{work_id=$wid;actress_id=$_.id.ToString()} }
                }
                if ($genreMap.Count -gt 0) {
                    $gb = ($genreMap.GetEnumerator()|ForEach-Object{@{id=$_.Key;name=$_.Value}})|ConvertTo-Json -Depth 2 -Compress
                    if($genreMap.Count-eq 1){$gb="[$gb]"}
                    try{Invoke-WebRequest -Uri "$supaUrl/rest/v1/genres" -Method Post -Headers $headers -Body $gb -UseBasicParsing|Out-Null}catch{}
                    $wgb=$workGenres|ConvertTo-Json -Depth 2 -Compress
                    if($workGenres.Count-eq 1){$wgb="[$wgb]"}
                    try{Invoke-WebRequest -Uri "$supaUrl/rest/v1/work_genres" -Method Post -Headers $headers -Body $wgb -UseBasicParsing|Out-Null}catch{}
                }
                if ($actressMap.Count -gt 0) {
                    $ab=$actressMap.Values|ConvertTo-Json -Depth 2 -Compress
                    if($actressMap.Count-eq 1){$ab="[$ab]"}
                    try{Invoke-WebRequest -Uri "$supaUrl/rest/v1/actresses" -Method Post -Headers $headers -Body $ab -UseBasicParsing|Out-Null}catch{}
                    $wab=$workActresses|ConvertTo-Json -Depth 2 -Compress
                    if($workActresses.Count-eq 1){$wab="[$wab]"}
                    try{Invoke-WebRequest -Uri "$supaUrl/rest/v1/work_actresses" -Method Post -Headers $headers -Body $wab -UseBasicParsing|Out-Null}catch{}
                }
                return $newItems.Count
            }

            $totalSaved = 0; $offset = 1
            while ($true) {
                $items = Fetch-DMMWorks2 $actress.id $offset
                if ($items.Count -eq 0) { break }
                $saved = Save-Works2 $items $supaUrl $headers
                $totalSaved += $saved
                if ($items.Count -lt 100) { break }
                $offset += 100
                Start-Sleep -Milliseconds 100
            }
            return @{ name = $actress.name; saved = $totalSaved }
        } -ArgumentList $actress, $DMM_API_ID, $DMM_AFFILIATE_ID, $SUPABASE_URL, $SUPABASE_KEY
    }
    
    $results = $jobs | Wait-Job | Receive-Job
    $jobs | Remove-Job
    
    foreach ($r in $results) {
        if ($r) {
            Write-Host "[$([Math]::Min($i+$PARALLEL, $actresses.Count))/$($actresses.Count)] $($r.name): $($r.saved) new works" -ForegroundColor Green
            $total += $r.saved
        }
    }
}

Write-Host "Total new works saved: $total" -ForegroundColor Cyan
Write-Host "Done!" -ForegroundColor Cyan
