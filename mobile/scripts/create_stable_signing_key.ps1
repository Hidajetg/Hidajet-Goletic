# Run once on your own Windows computer, NOT in GitHub Actions.
# The private release signing key never leaves your machine unless you choose
# to upload its base64 representation to a PRIVATE GitHub Actions secret.
$ErrorActionPreference = "Stop"

$targetDirectory = Join-Path $env:USERPROFILE "SolstoneSigning"
$keystore = Join-Path $targetDirectory "solstone-baustelle-update.jks"
$b64Path = Join-Path $targetDirectory "keystore-for-github-secret.txt"
$alias = "solstone_release"

$possible = @()
if ($env:JAVA_HOME) { $possible += (Join-Path $env:JAVA_HOME "bin\keytool.exe") }
$possible += "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe"
$possible += "C:\Program Files\Java\jdk-21\bin\keytool.exe"
$keytoolPath = $possible | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $keytoolPath) {
    $command = Get-Command keytool.exe -ErrorAction SilentlyContinue
    if ($command) { $keytoolPath = $command.Source }
}
if (-not $keytoolPath) { throw "Nisam našao keytool.exe. Instaliraj Android Studio/JDK pa pokreni ponovo." }

New-Item -ItemType Directory -Force -Path $targetDirectory | Out-Null
if (Test-Path $keystore) {
    Write-Host "Postojeći Solstone ključ je pronađen. NOVI SE NEĆE KREIRATI:" -ForegroundColor Yellow
    Write-Host $keystore
} else {
    Write-Host "Kreiram PRVI Solstone potpisni ključ. Zapamti lozinku i obavezno sačuvaj rezervnu kopiju." -ForegroundColor Yellow
    Write-Host "Program će dva puta zatražiti lozinku. Ne šalji je u ChatGPT niti GitHub kod."
    & $keytoolPath -genkeypair -v -storetype PKCS12 -keystore $keystore -alias $alias -keyalg RSA -keysize 3072 -validity 10000 -dname "CN=Solstone Baustelle, OU=Mobile, O=Stone Boutique, C=AT"
    if ($LASTEXITCODE -ne 0) { throw "Nije uspjelo kreiranje ključa." }
}

[IO.File]::WriteAllText($b64Path, [Convert]::ToBase64String([IO.File]::ReadAllBytes($keystore)))
Write-Host ""
Write-Host "GitHub Actions secrets (postavi u Settings -> Secrets and variables -> Actions):" -ForegroundColor Green
Write-Host "1. SOLSTONE_KEYSTORE_BASE64 = sadržaj datoteke: $b64Path"
Write-Host "2. SOLSTONE_KEYSTORE_PASSWORD = lozinka koju si zadao"
Write-Host "3. SOLSTONE_KEY_ALIAS = $alias"
Write-Host "4. SOLSTONE_KEY_PASSWORD = lozinka ključa (podrazumijevano ista kao keystore za PKCS12)"
Write-Host ""
Write-Host "Potpisni SHA256 certifikat (unijeti kao GitHub Actions VARIABLE SOLSTONE_CERT_SHA256):"
& $keytoolPath -list -v -keystore $keystore -alias $alias
if ($LASTEXITCODE -ne 0) { throw "Nije uspjela provjera ključa." }

Write-Host ""
Write-Host "NAPRAVI SIGURNU OFFLINE KOPIJU: $keystore" -ForegroundColor Yellow
Write-Host "NE commitaj keystore, base64 ili lozinke na GitHub. Ne šalji ih u poruci."
