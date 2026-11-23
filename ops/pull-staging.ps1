# Run periodically as a dedicated standard Windows account, using PowerShell 7.
param([Parameter(Mandatory)][string]$Java, [int]$Port=18080,
      [string]$EnvironmentUrl="http://localhost:18080",[switch]$RetryFailed)
$ErrorActionPreference='Stop'
$repo='https://api.github.com/repos/qinyuhuaiyuan-ctrl/ecommerce-platform-qy'
if (!$env:STAGING_GITHUB_TOKEN) { throw 'Configure a staging-only Actions read / Deployments write credential.' }
$headers=@{Authorization="Bearer $env:STAGING_GITHUB_TOKEN";Accept='application/vnd.github+json'}
$base=Join-Path $env:LOCALAPPDATA 'ecommerce-qy-staging'
[IO.Directory]::CreateDirectory($base) | Out-Null
$lock=[IO.File]::Open((Join-Path $base 'agent.lock'),'OpenOrCreate','ReadWrite','None')
try {
  $ds=Invoke-RestMethod "$repo/deployments?environment=staging&per_page=1" -Headers $headers
  if (!$ds) { return }
  $d=$ds[0]
  if ($d.task -ne 'deploy:ecommerce' -or $d.sha -notmatch '^[a-f0-9]{40}$') {throw 'Unexpected deployment'}
  $states="$repo/deployments/$($d.id)/statuses"
  $last=Invoke-RestMethod "$states`?per_page=1" -Headers $headers
  $local="http://127.0.0.1:$Port"
  function Healthy {
    try {
      $id=(Invoke-WebRequest "$local/build-sha.txt" -TimeoutSec 3).Content
      if ($id.Trim() -ne $d.sha) {return $false}
      $homePage=Invoke-WebRequest "$local/" -TimeoutSec 3
      $products=Invoke-RestMethod "$local/api/products" -TimeoutSec 3
      return ($homePage.Content -match 'id="app"' -and $products.code -eq 200 -and $products.data -is [array])
    } catch {return $false}
  }
  if ($last -and $last[0].state -eq 'success' -and (Healthy)) {return}
  if ($last -and $last[0].state -eq 'failure' -and !$RetryFailed) {return}
  function Report($state,$description) {
    $body=@{state=$state;description=$description;environment='staging';environment_url=$EnvironmentUrl}
    Invoke-RestMethod $states -Method Post -Headers $headers -ContentType 'application/json' -Body ($body|ConvertTo-Json) | Out-Null
  }
  Report 'in_progress' 'Windows test machine preparing deployment'
  try {
    $n=$d.payload.artifact
    if ("$n" -notmatch '^\d+$') {throw 'Invalid artifact'}
    $artifact=Invoke-RestMethod "$repo/actions/artifacts/$n" -Headers $headers
    if ($artifact.expired -or $artifact.name -ne "staging-$($d.sha)" -or $artifact.workflow_run.head_sha -ne $d.sha -or $artifact.workflow_run.head_branch -ne 'main') {throw 'Untrusted or expired artifact'}
    $run=Invoke-RestMethod "$repo/actions/runs/$($artifact.workflow_run.id)" -Headers $headers
    if ($run.path -ne '.github/workflows/ci-cd.yml' -or $run.event -ne 'push') {throw 'Unexpected workflow'}
    $zip=Join-Path $base 'candidate.zip'
    Invoke-WebRequest "$repo/actions/artifacts/$n/zip" -Headers $headers -OutFile $zip
    if ((Get-FileHash $zip).Hash -ne ($d.payload.digest -replace '^sha256:','')) {throw 'Artifact digest mismatch'}
    $dir=Join-Path $base $d.sha
    [IO.Directory]::CreateDirectory($dir) | Out-Null
    $jar=Join-Path $dir 'app.jar'
    $archive=[IO.Compression.ZipFile]::OpenRead($zip)
    try {
      if ($archive.Entries.Count -ne 1 -or $archive.Entries[0].FullName -ne 'app.jar') {throw 'Unexpected archive contents'}
      if (!(Test-Path -LiteralPath $jar)) {[IO.Compression.ZipFileExtensions]::ExtractToFile($archive.Entries[0],$jar)}
    } finally {$archive.Dispose()}
    $record=Join-Path $base 'process.json'
    if (Test-Path $record) {
      $old=Get-Content $record -Raw | ConvertFrom-Json
      $proc=Get-Process -Id $old.pid -ErrorAction SilentlyContinue
      if ($proc -and $proc.StartTime.ToUniversalTime().Ticks.ToString() -eq $old.started -and $proc.Path -eq (Get-Item $Java).FullName) {$proc.Kill();$proc.WaitForExit()}
    }
    $start=[Diagnostics.ProcessStartInfo]::new((Get-Item $Java).FullName)
    $start.UseShellExecute=$false
    $start.CreateNoWindow=$true
    $start.WorkingDirectory=$dir
    $start.Environment.Clear()
    foreach($key in 'SystemRoot','TEMP','TMP','USERPROFILE'){ $start.Environment[$key]=[Environment]::GetEnvironmentVariable($key) }
    foreach($arg in '-jar',$jar,'--server.address=127.0.0.1',"--server.port=$Port",'--spring.h2.console.enabled=false'){ $start.ArgumentList.Add($arg) }
    $proc=[Diagnostics.Process]::Start($start)
    @{pid=$proc.Id;started=$proc.StartTime.ToUniversalTime().Ticks.ToString()}|ConvertTo-Json|Set-Content $record
    for($i=0;$i -lt 40;$i++){if (Healthy){Report 'success' 'Commit, homepage and products API verified';return};Start-Sleep 2}
    throw 'Deployment smoke checks failed'
  } catch {Report 'failure' 'Windows staging failed; inspect test-machine output and retry the same artifact';throw}
} finally {$lock.Dispose()}
