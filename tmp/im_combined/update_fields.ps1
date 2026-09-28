$ErrorActionPreference='Stop'
$taskPath='D:\GitHub\MIREA\4\ИМ\ИМ_АлбахтинИВ_Отчёт.docx'
$taskWord=New-Object -ComObject Word.Application
$taskWord.Visible=$false
$taskWord.DisplayAlerts=0
try {
    $taskDoc=$taskWord.Documents.Open($taskPath,$false,$false)
    $taskDoc.Fields.Update() | Out-Null
    foreach($taskToc in $taskDoc.TablesOfContents) {
        $taskToc.Update()
        $taskToc.Range.Font.Name='Times New Roman'
        $taskToc.Range.Font.Size=14
        $taskToc.Range.Font.Color=0
        $taskToc.Range.ParagraphFormat.LeftIndent=0
        $taskToc.Range.ParagraphFormat.FirstLineIndent=0
        $taskToc.Range.ParagraphFormat.SpaceAfter=0
        $taskToc.Range.ParagraphFormat.LineSpacingRule=1
    }
    $taskDoc.Repaginate()
    foreach($taskToc in $taskDoc.TablesOfContents) {$taskToc.UpdatePageNumbers()}
    $taskDoc.Save()
    Write-Output ('Pages: '+$taskDoc.ComputeStatistics(2))
    $taskDoc.Close(0)
} finally {
    $taskWord.Quit()
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($taskWord)
}
