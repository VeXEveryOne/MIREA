param([string]$OutputDirectory = '', [string[]]$Students = @('АлбахтинИВ', 'ГубаревСА'))

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
    foreach ($taskStudent in $Students) {
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
            $taskYear = $null
            foreach ($taskParagraph in $taskDoc.Paragraphs) {
                if ($taskParagraph.Range.Text.StartsWith('Москва 2026')) { $taskYear = $taskParagraph; break }
            }
            if ($null -ne $taskYear) {
                $taskYear.Format.SpaceBefore = 0
                $taskDoc.Repaginate()
                $taskStartY = $taskYear.Range.Information(6)
                $taskSetup = $taskYear.Range.Sections.Item(1).PageSetup
                $taskTargetY = $taskSetup.PageHeight - $taskSetup.BottomMargin - 40
                $taskYear.Format.SpaceBefore = [Math]::Max(0, $taskTargetY - $taskStartY)
                $taskDoc.Repaginate()
                for ($taskAttempt = 0; $taskAttempt -lt 40 -and $taskYear.Range.Information(3) -gt 1; $taskAttempt++) {
                    $taskYear.Format.SpaceBefore = [Math]::Max(0, $taskYear.Format.SpaceBefore - 5)
                    $taskDoc.Repaginate()
                }
                if ($taskYear.Range.Information(3) -ne 1) { throw 'Cover year is outside the first page' }
            }
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
