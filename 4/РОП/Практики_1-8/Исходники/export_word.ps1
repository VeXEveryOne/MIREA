$ErrorActionPreference='Stop'
$taskRoot='D:\GitHub\MIREA\4\РОП\Практики_1-8'
$taskWord=New-Object -ComObject Word.Application
$taskWord.Visible=$false
$taskWord.DisplayAlerts=0
try {
 $taskDoc=$taskWord.Documents.Open((Join-Path $taskRoot 'РОП_Практики_1-8_АлбахтинИВ_готово.docx'),$false,$false)
 $taskDoc.Repaginate()
 foreach($taskToc in $taskDoc.TablesOfContents){$taskToc.Update()}
 $taskDoc.Fields.Update() | Out-Null
 $taskDoc.Repaginate()
 foreach($taskToc in $taskDoc.TablesOfContents){$taskToc.Update()}
 for($taskIndex=2;$taskIndex -le $taskDoc.Paragraphs.Count;$taskIndex++){
  if($taskDoc.Paragraphs.Item($taskIndex).Range.Text.Trim() -eq 'Введение'){
   $taskEnd=$taskDoc.Paragraphs.Item($taskIndex-1)
   if($taskEnd.Range.Text.Trim() -eq ''){
    $taskEnd.Format.KeepWithNext=-1
    $taskEnd.Format.PageBreakBefore=-1
    $taskDoc.Paragraphs.Item($taskIndex).Format.PageBreakBefore=0
    $taskEnd.Format.SpaceBefore=0
    $taskEnd.Format.SpaceAfter=0
    $taskEnd.Format.LineSpacingRule=4
    $taskEnd.Format.LineSpacing=1
    $taskEnd.Range.Font.Size=1
   }
   break
  }
 }
 $taskDoc.Repaginate()
 foreach($taskToc in $taskDoc.TablesOfContents){$taskToc.UpdatePageNumbers()}
 $taskDoc.Save()
 $taskDoc.ExportAsFixedFormat((Join-Path $taskRoot 'РОП_Практики_1-8_АлбахтинИВ_готово.pdf'),17)
 Write-Output ('Pages: '+$taskDoc.ComputeStatistics(2))
 $taskDoc.Close(0)
} finally {$taskWord.Quit();[void][Runtime.InteropServices.Marshal]::ReleaseComObject($taskWord)}

