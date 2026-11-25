# Invoked only by the trusted main-branch deployment job.
param([Parameter(Mandatory)][string]$Jar,
      [Parameter(Mandatory)][ValidatePattern('^[a-f0-9]{40}$')][string]$Sha,
      [Parameter(Mandatory)][string]$Java, [int]$Port=18080)
$ErrorActionPreference='Stop'
$base=Join-Path $env:LOCALAPPDATA 'ecommerce-qy-staging'
$logs=Join-Path $base 'logs'
[IO.Directory]::CreateDirectory($logs) | Out-Null
$lock=[IO.File]::Open((Join-Path $base 'agent.lock'),'OpenOrCreate','ReadWrite','None')
try {
  $dir=Join-Path $base $Sha
  [IO.Directory]::CreateDirectory($dir) | Out-Null
  $target=Join-Path $dir 'app.jar'
  $source=(Resolve-Path -LiteralPath $Jar).Path
  $javaPath=(Get-Item -LiteralPath $Java).FullName
  # Verify the artifact carries the exact workflow SHA before stopping the old service.
  $archive=[IO.Compression.ZipFile]::OpenRead($source)
  try {
    $entry=$archive.GetEntry('BOOT-INF/classes/static/build-sha.txt')
    if (!$entry) {throw 'Artifact has no build version'}
    $reader=[IO.StreamReader]::new($entry.Open())
    try {if ($reader.ReadToEnd().Trim() -ne $Sha) {throw 'Artifact version mismatch'}} finally {$reader.Dispose()}
  } finally {$archive.Dispose()}
  $record=Join-Path $base 'process.json'
  if (Test-Path -LiteralPath $record) {
    $old=Get-Content -LiteralPath $record -Raw | ConvertFrom-Json
    $proc=Get-Process -Id $old.pid -ErrorAction SilentlyContinue
    if ($proc -and $proc.StartTime.ToUniversalTime().Ticks.ToString() -eq $old.started -and $proc.ProcessName -eq 'java') {
      $proc.Kill();$proc.WaitForExit()
    }
  }
  Copy-Item -LiteralPath $source -Destination $target -Force
  # Task Scheduler owns the app outside the Actions Windows job object.
  $launchConfig=Join-Path $base 'launch.json'
  @{java=$javaPath;jar=$target;directory=$dir;port=$Port;logs=$logs;record=$record} |
    ConvertTo-Json | Set-Content -LiteralPath $launchConfig -Encoding utf8
  $launcher=Join-Path $base 'run-app.ps1'
  @'
$ErrorActionPreference='Stop'
$config=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'launch.json') -Raw | ConvertFrom-Json
  $start=[Diagnostics.ProcessStartInfo]::new($config.java)
  $start.UseShellExecute=$false
  $start.CreateNoWindow=$true
  $start.WorkingDirectory=$config.directory
  # App survives the job and never inherits the runner's credentials or tracking ID.
  $start.Environment.Clear()
  foreach($key in 'SystemRoot','TEMP','TMP','USERPROFILE'){ $start.Environment[$key]=[Environment]::GetEnvironmentVariable($key) }
  foreach($arg in '-jar',$config.jar,'--server.address=127.0.0.1',"--server.port=$($config.port)",'--spring.h2.console.enabled=false',"--logging.file.name=$($config.logs)/app.log"){$start.ArgumentList.Add($arg)}
  $proc=[Diagnostics.Process]::Start($start)
  @{pid=$proc.Id;started=$proc.StartTime.ToUniversalTime().Ticks.ToString()}|ConvertTo-Json|Set-Content -LiteralPath $config.record
  $proc.WaitForExit()
  exit $proc.ExitCode
'@ | Set-Content -LiteralPath $launcher -Encoding utf8
  $taskName='XCODE-Ecommerce-Staging-App'
  if(Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue){Stop-ScheduledTask -TaskName $taskName}
  if(Test-Path -LiteralPath $record){Remove-Item -LiteralPath $record}
  $action=New-ScheduledTaskAction -Execute (Get-Process -Id $PID).Path -Argument ('-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "{0}"' -f $launcher)
  $principal=New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
  $settings=New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit ([TimeSpan]::Zero)
  Register-ScheduledTask -TaskName $taskName -Action $action -Principal $principal -Settings $settings -Description 'Staging app host; started by Actions deployment, no polling trigger' -Force | Out-Null
  Start-ScheduledTask -TaskName $taskName
  for($i=0;$i -lt 60;$i++) {
    if(Test-Path -LiteralPath $record){
      $current=Get-Content -LiteralPath $record -Raw | ConvertFrom-Json
      if(!(Get-Process -Id $current.pid -ErrorAction SilentlyContinue)){throw 'Application exited during startup; inspect deployment logs'}
    }
    try {
      $local="http://127.0.0.1:$Port"
      $version=(Invoke-WebRequest "$local/build-sha.txt" -TimeoutSec 3).Content.Trim()
      $page=Invoke-WebRequest "$local/" -TimeoutSec 3
      $products=Invoke-RestMethod "$local/api/products" -TimeoutSec 3
      if ($version -eq $Sha -and $page.Content -match 'id="app"' -and $products.code -eq 200 -and $products.data -is [array]) {
        "Verified staging version $Sha; homepage and products API passed."
        if ($env:GITHUB_STEP_SUMMARY) {"staging version: $Sha — homepage and API checks passed." | Add-Content $env:GITHUB_STEP_SUMMARY}
        return
      }
    } catch {}
    Start-Sleep 2
  }
  throw 'Deployment health checks failed'
} finally {$lock.Dispose()}
