<#
.SYNOPSIS
  ADR-003 D4 — Windows equivalent of fetch-syncthing.sh.

.DESCRIPTION
  Downloads the latest stable Syncthing release for each supported
  platform, verifies its sha256 against the signed sha256sums.txt,
  and unpacks it into frontend/resources/syncthing/ where
  electron-builder picks it up via extraResources. Idempotent.

.PARAMETER Platforms
  One or more of: darwin-arm64, darwin-amd64, linux-amd64, linux-arm64,
  windows-amd64. Omit to fetch all of them.

.EXAMPLE
  ./scripts/fetch-syncthing.ps1
  ./scripts/fetch-syncthing.ps1 -Platforms windows-amd64
#>

[CmdletBinding()]
param(
    [string[]]$Platforms
)

$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$OutDir   = Join-Path $RepoRoot 'frontend/resources/syncthing'
$GhApi    = 'https://api.github.com/repos/syncthing/syncthing/releases/latest'

$SuffixByPlatform = @{
    'darwin-arm64'   = 'macos-arm64.zip'
    'darwin-amd64'   = 'macos-amd64.zip'
    'linux-amd64'    = 'linux-amd64.tar.gz'
    'linux-arm64'    = 'linux-arm64.tar.gz'
    'windows-amd64'  = 'windows-amd64.zip'
}

function Write-Info($msg) { Write-Host "[fetch-syncthing] $msg" }

function Get-Sha256($path) {
    (Get-FileHash -Path $path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Fetch-Platform {
    param(
        [string]$Platform,
        [string]$Version,
        [string]$SumsTxt
    )

    $suffix = $SuffixByPlatform[$Platform]
    if (-not $suffix) { throw "Unknown platform '$Platform'" }

    $fileName = "syncthing-$Platform-v$Version." + $suffix.Substring($suffix.IndexOf('.') + 1)
    $expected = ($SumsTxt -split "`n" `
                | Where-Object { $_ -match "\s$([regex]::Escape($fileName))\s*$" } `
                | Select-Object -First 1).Split()[0]
    if (-not $expected) { throw "No sha256 entry for $fileName in sha256sums.txt" }

    $destDir = Join-Path $OutDir $Platform
    $stamp   = Join-Path $destDir ".version-v$Version"
    if (Test-Path $stamp) {
        Write-Info "v $Platform already at v$Version, skipping"
        return
    }

    Write-Info "Fetching $fileName"
    $tmpDir = New-Item -ItemType Directory -Path (Join-Path $env:TEMP ("syncthing-" + [Guid]::NewGuid())) -Force
    try {
        $archive = Join-Path $tmpDir $fileName
        $url = "https://github.com/syncthing/syncthing/releases/download/v$Version/$fileName"
        Invoke-WebRequest -Uri $url -OutFile $archive

        $actual = Get-Sha256 $archive
        if ($actual -ne $expected.ToLowerInvariant()) {
            throw "sha256 mismatch for $fileName: got $actual, want $expected"
        }
        Write-Info "sha256 verified ($expected)"

        if (Test-Path $destDir) { Remove-Item $destDir -Recurse -Force }
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        if ($archive.EndsWith('.zip')) {
            $expandDir = Join-Path $tmpDir 'expanded'
            Expand-Archive -Path $archive -DestinationPath $expandDir -Force
            # Zip archives contain a single top-level folder; copy its contents up.
            $topLevel = Get-ChildItem -Path $expandDir | Select-Object -First 1
            Copy-Item -Path (Join-Path $topLevel.FullName '*') -Destination $destDir -Recurse -Force
        } elseif ($archive.EndsWith('.tar.gz')) {
            tar -xzf $archive -C $destDir --strip-components=1
        } else {
            throw "Unsupported archive: $archive"
        }
        New-Item -ItemType File -Path $stamp -Force | Out-Null
        Write-Info "$Platform unpacked into $destDir"
    }
    finally {
        Remove-Item $tmpDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

New-Item -ItemType Directory -Path $OutDir -Force | Out-Null

Write-Info "Querying GitHub for latest Syncthing release..."
$release = Invoke-RestMethod -Uri $GhApi -Headers @{ 'Accept' = 'application/vnd.github+json' }
$version = $release.tag_name.TrimStart('v')
Write-Info "Latest stable: v$version"

Write-Info "Downloading sha256sums.txt..."
$sumsUrl = "https://github.com/syncthing/syncthing/releases/download/v$version/sha256sums.txt"
$sumsTxt = (Invoke-WebRequest -Uri $sumsUrl).Content

if (-not $Platforms -or $Platforms.Count -eq 0) {
    $Platforms = $SuffixByPlatform.Keys
}

foreach ($p in $Platforms) {
    Fetch-Platform -Platform $p -Version $version -SumsTxt $sumsTxt
}

Write-Info "Done. Syncthing binaries are in $OutDir"
