param([string]$InputDocx,[string]$OutputPdf)
$ErrorActionPreference = 'Stop'
$taskWord = New-Object -ComObject Word.Application
$taskWord.Visible = $false
$taskWord.DisplayAlerts = 0
try {
 $taskDoc = $taskWord.Documents.Open($InputDocx, $false, $true)
 $taskDoc.Repaginate()
 $taskDoc.ExportAsFixedFormat($OutputPdf, 17)
 $taskDoc.Close(0)
} finally {
 $taskWord.Quit()
 [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($taskWord)
}
