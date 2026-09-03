$projectFile = Join-Path $PSScriptRoot 'projects.js'
$assetsPath = Join-Path $PSScriptRoot 'assets'
$supportedExtensions = @('.jpg', '.jpeg', '.png', '.webp', '.mp4', '.webm')
$assetFiles = Get-ChildItem -Path $assetsPath -File | Where-Object {
  $_.Extension.ToLowerInvariant() -in $supportedExtensions -and $_.BaseName -match '^project\d+(?:-\d+)?$'
}
$galleryByProject = @{}
foreach ($asset in $assetFiles) {
  if ($asset.BaseName -match '^(project\d+)-(\d+)$') {
    $projectId = $Matches[1]
    if (-not $galleryByProject.ContainsKey($projectId)) { $galleryByProject[$projectId] = @() }
    $galleryByProject[$projectId] += [PSCustomObject]@{
      Index = [int]$Matches[2]
      Path = "assets/$($asset.Name)"
    }
  }
}
foreach ($projectId in @($galleryByProject.Keys)) {
  $galleryByProject[$projectId] = @($galleryByProject[$projectId] | Sort-Object Index, Path | ForEach-Object Path)
}
$content = Get-Content -Path $projectFile -Raw
$projectPattern = '(?s)(?<block>\{\s*id:\s*"(?<id>project\d+)".*?\n\s*\})'
$content = [regex]::Replace($content, $projectPattern, {
  param($match)
  $block = $match.Groups['block'].Value
  $projectId = $match.Groups['id'].Value
  $gallery = if ($galleryByProject.ContainsKey($projectId)) { @($galleryByProject[$projectId]) } else { @() }
  $galleryText = if ($gallery.Count -gt 0) {
    "gallery: [`n" + (($gallery | ForEach-Object { "      `"$_`"" }) -join ",`n") + "`n    ]"
  } else { 'gallery: []' }
  $block = [regex]::Replace($block, '(?s),?\s*gallery:\s*\[.*?\]\s*(?=\n\s*\})', '')
  $block = [regex]::Replace($block, '\s*\}$', (",`n    " + $galleryText + "`n  }"))
  return $block
})
Set-Content -Path $projectFile -Value $content -NoNewline
Write-Output "Synchronized project galleries from $($assetFiles.Count) matching asset(s)."
