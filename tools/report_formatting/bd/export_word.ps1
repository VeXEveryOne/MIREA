param([string]$DocumentPath,[string]$PdfPath)
$ErrorActionPreference = 'Stop'
$bdWord = New-Object -ComObject Word.Application
$bdWord.Visible = $false
$bdWord.DisplayAlerts = 0
try {
    $bdDoc = $bdWord.Documents.Open($DocumentPath, $false, $false)
    $bdDoc.Fields.Update() | Out-Null
    foreach ($bdToc in $bdDoc.TablesOfContents) { $bdToc.Update() }
    $bdDoc.Repaginate()
    foreach ($bdToc in $bdDoc.TablesOfContents) { $bdToc.UpdatePageNumbers() }
    $bdDoc.Save()
    $bdDoc.ExportAsFixedFormat($PdfPath, 17)
    Write-Output ('Pages: ' + $bdDoc.ComputeStatistics(2))
    $bdDoc.Close(0)
} finally { $bdWord.Quit() }
