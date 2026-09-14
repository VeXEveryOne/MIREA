$ErrorActionPreference='Stop'
$taskWord=New-Object -ComObject Word.Application
$taskWord.Visible=$false
$taskWord.DisplayAlerts=0
try {
 $taskDoc=$taskWord.Documents.Open('D:\GitHub\MIREA\tmp\rop_bpmn_review\updated.docx',$false,$false)
 $taskDoc.Repaginate()
 foreach($taskToc in $taskDoc.TablesOfContents){$taskToc.Update()}
 $taskDoc.Fields.Update() | Out-Null
 $taskDoc.Repaginate()
 $taskDoc.Save()
 $taskDoc.Close(0)
} finally { $taskWord.Quit();[void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($taskWord) }
