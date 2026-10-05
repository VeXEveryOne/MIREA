param([string]$OutputDirectory = '')
$ErrorActionPreference = 'Stop'
$taskPack = Split-Path -Parent $PSScriptRoot
if (-not $OutputDirectory) { $OutputDirectory = $taskPack }
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$taskWord = New-Object -ComObject Word.Application
$taskWord.Visible = $false
$taskWord.DisplayAlerts = 0
try {
    foreach ($taskSource in Get-ChildItem -LiteralPath $taskPack -Filter '*.docx' -File) {
        $taskDoc = $taskWord.Documents.Open($taskSource.FullName, $false, $false)
        try {
            $taskYear = $null
            foreach ($taskParagraph in $taskDoc.Paragraphs) {
                if ($taskParagraph.Range.Text.StartsWith('Москва 2026')) {
                    $taskYear = $taskParagraph
                    break
                }
            }
            if ($null -ne $taskYear) {
                $taskYear.Format.SpaceBefore = 0
                $taskDoc.Repaginate()
                $taskStartY = $taskYear.Range.Information(6)
                $taskSetup = $taskYear.Range.Sections.Item(1).PageSetup
                $taskTargetY = $taskSetup.PageHeight - $taskSetup.BottomMargin - 40
                $taskYear.Format.SpaceBefore = [Math]::Max(0, $taskTargetY - $taskStartY)
                $taskDoc.Repaginate()
                for ($taskAttempt = 0; $taskAttempt -lt 30 -and $taskYear.Range.Information(3) -gt 1; $taskAttempt++) {
                    $taskYear.Format.SpaceBefore = [Math]::Max(0, $taskYear.Format.SpaceBefore - 5)
                    $taskDoc.Repaginate()
                }
                if ($taskYear.Range.Information(3) -ne 1) { throw 'Титульный лист не помещается на одну страницу' }
            }
            $taskDoc.Fields.Update() | Out-Null
            foreach ($taskToc in $taskDoc.TablesOfContents) {
                $taskToc.Update()
                $taskToc.Range.Font.Name = 'Times New Roman'
                $taskToc.Range.Font.Size = 14
                $taskToc.Range.Font.Color = 0
                $taskToc.Range.Font.Underline = 0
                $taskToc.Range.ParagraphFormat.LineSpacingRule = 0
                $taskToc.Range.ParagraphFormat.SpaceBefore = 0
                $taskToc.Range.ParagraphFormat.SpaceAfter = 3
            }
            $taskDoc.Repaginate()
            foreach ($taskToc in $taskDoc.TablesOfContents) { $taskToc.UpdatePageNumbers() }
            $taskDoc.Save()
            $taskPdf = Join-Path $OutputDirectory ($taskSource.BaseName + '.pdf')
            $taskDoc.ExportAsFixedFormat($taskPdf, 17)
            Write-Output "$($taskSource.Name): $($taskDoc.ComputeStatistics(2)) страниц"
        } finally { $taskDoc.Close(0) }
    }
} finally {
    $taskWord.Quit()
    [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($taskWord)
}
