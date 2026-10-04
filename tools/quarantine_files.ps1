param(
    [Parameter(Mandatory=$true)][string]$PlanPath,
    [Parameter(Mandatory=$true)][string]$BackupDirectory,
    [switch]$Apply
)

$ErrorActionPreference = 'Stop'
$taskRepo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\')
$taskBackup = [IO.Path]::GetFullPath($BackupDirectory).TrimEnd('\')
if ($taskBackup -eq $taskRepo -or $taskBackup.StartsWith($taskRepo + '\', [StringComparison]::OrdinalIgnoreCase)) {
    throw 'BackupDirectory must be outside this repository.'
}
$taskPlan = Get-Content -Raw -LiteralPath $PlanPath | ConvertFrom-Json
$taskItems = @()
foreach ($taskEntry in $taskPlan) {
    $taskSource = [IO.Path]::GetFullPath((Join-Path $taskRepo $taskEntry.path))
    if (-not $taskSource.StartsWith($taskRepo + '\', [StringComparison]::OrdinalIgnoreCase)) {
        throw "Path escapes the repository: $($taskEntry.path)"
    }
    if ($taskSource -eq (Join-Path $taskRepo '.git') -or $taskSource.StartsWith((Join-Path $taskRepo '.git\'), [StringComparison]::OrdinalIgnoreCase)) {
        throw 'The parent Git repository must not be moved.'
    }
    $taskDestination = [IO.Path]::GetFullPath((Join-Path $taskBackup ('removed\' + $taskEntry.path)))
    if (-not $taskDestination.StartsWith($taskBackup + '\removed\', [StringComparison]::OrdinalIgnoreCase)) {
        throw "Invalid destination: $taskDestination"
    }
    if (-not (Test-Path -LiteralPath $taskSource)) { throw "Missing source: $taskSource" }
    if (Test-Path -LiteralPath $taskDestination) { throw "Destination already exists: $taskDestination" }
    if ($taskEntry.sha256) {
        $taskHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $taskSource).Hash.ToLowerInvariant()
        if ($taskHash -ne $taskEntry.sha256) { throw "Source has changed: $taskSource" }
    }
    $taskItems += [PSCustomObject]@{Source=$taskSource;Destination=$taskDestination;Reason=$taskEntry.reason}
}
if (-not $Apply) {
    $taskItems | Select-Object Source,Reason
    Write-Output ("Validated {0} explicit targets; use -Apply to move them." -f $taskItems.Count)
    exit 0
}
$taskManifest = Join-Path $taskBackup 'moved_files.json'
$taskMoved = [System.Collections.Generic.List[object]]::new()
if (Test-Path -LiteralPath $taskManifest) {
    foreach ($taskPrevious in @(Get-Content -Raw -LiteralPath $taskManifest | ConvertFrom-Json)) {
        $taskMoved.Add($taskPrevious)
    }
}
foreach ($taskItem in $taskItems) {
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $taskItem.Destination) | Out-Null
    Move-Item -LiteralPath $taskItem.Source -Destination $taskItem.Destination
    $taskMoved.Add($taskItem)
    # This is a machine-generated recovery manifest, updated after every successful move.
    ConvertTo-Json -InputObject ($taskMoved.ToArray()) -Depth 4 | Set-Content -Encoding utf8 -LiteralPath $taskManifest
}
Write-Output ("Moved {0} targets to {1}; recovery manifest has {2} entries." -f $taskItems.Count,$taskBackup,$taskMoved.Count)
