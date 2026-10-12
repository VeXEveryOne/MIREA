param([string]$OutputDirectory = '')

$ErrorActionPreference = 'Stop'
$taskBD = Split-Path -Parent $PSScriptRoot
$taskRepo = Split-Path -Parent (Split-Path -Parent $taskBD)
$taskCache = Join-Path $taskRepo '.cache\bd-combined-pr2'
if (-not $OutputDirectory) { $OutputDirectory = $taskBD }
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null

$taskWord = New-Object -ComObject Word.Application
$taskWord.Visible = $false
$taskWord.DisplayAlerts = 0
try {
    foreach ($taskStudent in @('АлбахтинИВ', 'ГубаревСА')) {
        $taskParts = Join-Path $taskCache $taskStudent
        $taskVisual = Join-Path $taskParts 'visual.docx'
        $taskStorage = Join-Path $taskParts 'storage.docx'
        if (-not (Test-Path -LiteralPath $taskVisual -PathType Leaf) -or
            -not (Test-Path -LiteralPath $taskStorage -PathType Leaf)) {
            throw "Prepare the DOCX sections first: $taskStudent"
        }
        $taskStem = "ТИАБД_ПР2_$taskStudent"
        $taskDocx = Join-Path $OutputDirectory "$taskStem.docx"
        $taskPdf = Join-Path $OutputDirectory "$taskStem.pdf"
        Copy-Item -LiteralPath $taskVisual -Destination $taskDocx -Force
        $taskDoc = $taskWord.Documents.Open($taskDocx, $false, $false)
        try {
            $taskEnd = $taskDoc.Content.End - 1
            $taskRange = $taskDoc.Range($taskEnd, $taskEnd)
            $taskRange.InsertBreak(7) # wdPageBreak
            $taskEnd = $taskDoc.Content.End - 1
            $taskRange = $taskDoc.Range($taskEnd, $taskEnd)
            $taskRange.InsertFile($taskStorage)
            $taskDoc.Fields.Update() | Out-Null
            foreach ($taskToc in $taskDoc.TablesOfContents) { $taskToc.Update() }
            $taskDoc.Repaginate()
            foreach ($taskToc in $taskDoc.TablesOfContents) { $taskToc.UpdatePageNumbers() }
            $taskDoc.Save()
            $taskDoc.ExportAsFixedFormat($taskPdf, 17) # wdExportFormatPDF
            Write-Output "${taskStem}: $($taskDoc.ComputeStatistics(2)) pages"
        } finally {
            $taskDoc.Close(0)
        }
    }
} finally {
    $taskWord.Quit()
    [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($taskWord)
}
