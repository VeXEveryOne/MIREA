$ErrorActionPreference = 'Stop'
$assetDir = Join-Path $PSScriptRoot 'assets'
New-Item -ItemType Directory -Force -Path $assetDir | Out-Null

$assets = @{
  'cover.jpg' = 'https://www.knime.com/sites/default/files/public/header-predicting-customer-churn-marketing-analytics.jpg'
  'training-workflow.png' = 'https://www.knime.com/sites/default/files/public/1-predicting-customer-churn-marketing-analytics.png'
  'deployment-workflow.png' = 'https://www.knime.com/sites/default/files/public/2-predicting-customer-churn-marketing-analytics.png'
  'churn-dashboard.png' = 'https://www.knime.com/sites/default/files/public/3-predicting-customer-churn-marketing-analytics.png'
  'confusion-matrix.png' = 'https://www.knime.com/sites/default/files/public/1-visual-scoring-techniques-for-classification-models.png'
  'roc-curve.png' = 'https://www.knime.com/sites/default/files/public/2-visual-scoring-techniques-for-classification-models.png'
}

foreach ($item in $assets.GetEnumerator()) {
  Invoke-WebRequest -Uri $item.Value -OutFile (Join-Path $assetDir $item.Key)
}

Get-ChildItem -LiteralPath $assetDir | Select-Object Name, Length
