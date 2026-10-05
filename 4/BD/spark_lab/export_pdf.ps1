param([string]$OutputDirectory = '')
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
$bd = Join-Path $repo '4\BD'
if (-not $OutputDirectory) { $OutputDirectory = $bd }
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
# Word is the export fallback when the desktop runtime has no bundled
# LibreOffice. This is a dedicated automation instance, not the user's window.
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
    foreach ($number in @(3,4)) {
        $source = Join-Path $bd "Практическая работа №$number.docx"
        $target = Join-Path $OutputDirectory "Практическая работа №$number.pdf"
        $document = $word.Documents.Open($source, $false, $true)
        try {
            $document.Repaginate()
            $document.ExportAsFixedFormat($target, 17)
            Write-Output "$number pages=$($document.ComputeStatistics(2)) $target"
        } finally {
            $document.Close(0)
        }
    }
} finally {
    $word.Quit()
    [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($word)
}
