# Solstone Baustelle — stalna Android aplikacija i nadogradnje

## Šta više ne radimo
Ne pravimo novi `visualpreview` ili `internal` paket kao novu odvojenu aplikaciju za svaku promjenu. To su bile demonstracije, ne konačni identitet aplikacije.

## Konačni identitet
- Android application ID (zauvijek): **`com.solstone.baustelle`**.
- Izvor funkcija: **jedna Next.js web aplikacija** i ista Supabase baza kao u pregledniku.
- Izdanje: **release APK potpisan uvijek istim privatnim ključem**, uz **veći `versionCode`**.
- Ažuriranja web stranice ne zahtijevaju novi APK kada mobilna aplikacija učitava isti server. Za Android-native promjene ipak je potreban novi potpisani APK.
- GitHub workflow: `.github/workflows/android-stable-update.yml`. On se ručno pokreće kada želite novi potpisani Android paket.
- Ovo je **internal-test** verzija s udaljenom web stranicom. Za Google Play treba zaseban pregled arhitekture: Capacitor `server.url` namijenjen je live-reload/test načinu, nije gotova store-release arhitektura.

## OBAVEZNO: prvi potpisni ključ
1. U lokalnom repozitoriju na Windowsu pokreni PowerShell:
   `powershell -ExecutionPolicy Bypass -File .\mobile\scripts\create_stable_signing_key.ps1`
2. Skripta kreira privatni ključ u `%USERPROFILE%\SolstoneSigning\solstone-baustelle-update.jks` i base64 tekst za GitHub secret. Ne šalji te podatke ChatGPT-u ili javnom GitHub repozitoriju.
3. Otvori GitHub repozitorij > Settings > Secrets and variables > Actions > **Repository secrets**. Dodaj:
   - `SOLSTONE_KEYSTORE_BASE64` — sadržaj lokalnog `keystore-for-github-secret.txt`
   - `SOLSTONE_KEYSTORE_PASSWORD` — lozinka koju si odabrao
   - `SOLSTONE_KEY_ALIAS` — `solstone_release`
   - `SOLSTONE_KEY_PASSWORD` — lozinka ključa (za PKCS12 često ista kao prethodna)
4. Pod **Repository variables** dodaj `SOLSTONE_CERT_SHA256`, fingerprint certifikata koji je prikazala skripta (bez dvotačaka ili s dvotačkama, workflow prihvata oba).
5. Sačuvaj `.jks` **offline** uz drugu rezervnu kopiju i lozinke u password manageru. Ako se izgubi ključ, Android neće moći instalirati novu verziju preko stare (osim valjanog postupka rotacije ključa). Nikad ne stavljaj ključ u Git repo.
6. Otvori GitHub Actions > **Solstone Android – stable signed update APK** > Run workflow na branch `mobile-android-ios-test-2026-11-20`. Nakon uspješnog pokretanja preuzmi artefakt `solstone-stable-upgrade-N-N` i instaliraj APK.

## Sljedeća nadogradnja
Isti workflow koristi iste četiri GitHub tajne, **isti application ID** i automatski povećava `versionCode` (na osnovu GitHub run number / attempt). Preuzeti APK može se instalirati **preko** prethodnog potpisanog Solstone APK-a. Ne treba brisati aplikaciju. Za automatsku isporuku bez ručnog preuzimanja Android APK-a potreban je Google Play internal test / production track ili drugi pouzdan sistem upravljanja uređajima.

**Važna iznimka:** stari test `com.solstone.baustelle.visualpreview` (#35) i `com.solstone.baustelle.internal` imaju DRUGAČIJI identitet. Njih NIJE moguće pretvoriti u `com.solstone.baustelle` Android nadogradnjom; konačna aplikacija ima **jednu prvu instalaciju**. Ako je raniji `com.solstone.baustelle` potpisan drugim ključem, treba vratiti stari signing key ili na taj telefon napraviti jednokratnu novu instalaciju; Android ne dopušta zaobilaženje potpisne provjere.

## Status funkcionalnosti
- Stvarna web app, radnici/admini, unos sati, gradilišta i ostali moduli: koristi se isti postojeći web backend.
- Radničko mobilno dno: Početna / **Chat** / **🚶 AI** / Profil — na testnoj GitHub grani. To će biti vidljivo u Android web shell **tek kada ista verzija web koda bude puštena na server**.
- `/team-chat` i API rute postoje u testnoj grani, ali `solstone_chat_*` tabele **još nisu aktivirane** u Supabase produkciji, zato slanje stvarnih poruka nije spremno.
- AI ima samo pripremljeni serverski endpoint (zadano OFF); direktno dugme za osobni ChatGPT ne znači da Solstone čita tvoje ChatGPT razgovore.
- Ne puštati radnicima prije revizije hardkodiranih starih PIN-ova, zaštite RLS (kritično: 58 tabela), testiranja pravila pristupa i stvarnog chat testa.
- iOS ima drugi sistem potpisivanja (Apple Developer/TestFlight), ne može se Android APK instalirati na iPhone.

## Tehnička sigurnosna ograda
`SOLSTONE_WEB_URL` učitava produkcijsku HTTPS adresu samo za **interni test**, dok ne postoji sigurni staging URL s prečišćenom bazom i završenom provjerom. Ovaj workflow **ne radi deploy** web aplikacije i ne mijenja bazu.
