param(
    [Parameter(Mandatory=$true)][string[]]$Documents,
    [string]$OutputDirectory,
    [switch]$UpdateSource
)
$ErrorActionPreference='Stop'
$taskWord=New-Object -ComObject Word.Application
$taskWord.Visible=$false
$taskWord.DisplayAlerts=0
$taskWord.AutomationSecurity=3
try {
    foreach($taskPath in $Documents) {
        $taskInput=(Resolve-Path -LiteralPath $taskPath).Path
        $taskOutput=if($OutputDirectory) {
            $taskFolder=[IO.Path]::GetFullPath($OutputDirectory)
            [void][IO.Directory]::CreateDirectory($taskFolder)
            Join-Path $taskFolder ([IO.Path]::GetFileNameWithoutExtension($taskInput)+'.pdf')
        } else { [IO.Path]::ChangeExtension($taskInput,'.pdf') }
        $taskDocument=$null
        try {
            $taskDocument=$taskWord.Documents.Open($taskInput,$false,(-not $UpdateSource),$false)
            $taskDocument.Repaginate()
            foreach($taskToc in $taskDocument.TablesOfContents){$taskToc.Update()}
            [void]$taskDocument.Fields.Update()
            foreach($taskSection in $taskDocument.Sections) {
                foreach($taskFooter in $taskSection.Footers){[void]$taskFooter.Range.Fields.Update()}
                foreach($taskHeader in $taskSection.Headers){[void]$taskHeader.Range.Fields.Update()}
            }
            $taskDocument.Repaginate()
            foreach($taskToc in $taskDocument.TablesOfContents){$taskToc.UpdatePageNumbers()}
            if($UpdateSource){$taskDocument.Save()}
            $taskDocument.ExportAsFixedFormat($taskOutput,17)
            [PSCustomObject]@{Document=$taskInput;PDF=$taskOutput;Pages=$taskDocument.ComputeStatistics(2);SourceUpdated=[bool]$UpdateSource}
        } finally {
            if($taskDocument){$taskDocument.Close(0);[void][Runtime.InteropServices.Marshal]::ReleaseComObject($taskDocument)}
        }
    }
} finally {
    $taskWord.Quit()
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($taskWord)
}
