# Solstone Baustelle — privatna instalacija (bez Google Play / App Store objave)

**Zajednički izvor:** postojeća Next.js Solstone web-aplikacija. Android i iPhone
su različiti načini otvaranja iste aplikacije, s istom Supabase bazom, istim
radnicima, pravima, kalendarom, satima, dokumentacijom i budućim chatom.
Ne stvaramo odvojene baze niti dva odvojena frontend projekta.

## Trenutna situacija
- Testni GitHub branch `mobile-android-ios-test-2026-11-20` nije produkcija.
- Instalacijske upute za radnike: `/instalacija` (jezici DE/BA/UZ/CZ/EN).
  Stranica će raditi tek na serveru na koji je ovaj kod zaista objavljen.
- Web manifest `public/manifest.json`, Apple web app metadata i ikona već su u zajedničkom projektu.
- Postojeći produkcijski host se trenutno koristi kao backend kod *internog*
  Android testa; mobilne promjene na GitHub branchu neće se vidjeti dok iste
  promjene ne budu sigurno objavljene i testirane na webu.
- Stvarni Team Chat nije aktiviran na Supabase serveru. Demonstracijske
  poruke nisu stvarne; ne distribuirati kao da chat već radi.
- AI pristup stvarnim projektima je zasad isključen.

## Android: WhatsApp -> APK -> ista instalacija uz buduće nadogradnje
1. Samo admin smije kreirati/odobriti konačni APK (workflow:
   `.github/workflows/android-stable-update.yml`).
2. Android `applicationId` mora ostati `com.solstone.baustelle` i svako novo
   izdanje mora imati veći `versionCode`.
3. Svaki release APK mora biti potpisan **istim privatnim release ključem**.
   Debug i UI-preview APK-ovi ne mogu nadograđivati stabilnu instalaciju.
4. Admin šalje gotov, provjeren potpisani APK preko WhatsAppa ili zaštićenog
   poslovnog kanala. Radnik ga preuzima i, ako Android zatraži, dopušta
   instalaciju iz tog izvora. Sigurnosnu dozvolu može nakon instalacije
   ponovo isključiti.
5. Sljedeći potpisani APK instalira se preko postojeće aplikacije — samo ako
   su `applicationId`, certifikat i `versionCode` kompatibilni.
6. Kako aplikacija učitava zajednički web server, obične web promjene mogu
   biti dostupne bez novog APK-a; za nativne izmjene potreban je novi APK.
7. Ovaj Capacitor `server.url` postupak **samo je za privatni interni test**.
   Prije šireg izdanja provjeriti distribuciju, web/HTTP sesije, sigurnost
   i Capacitor preporučenu produkcijsku arhitekturu.

### Važno: već pronađeni Android ključ
Na korisnikovom Windows računaru postoji kandidat
`OneDrive\Dokumenti\solstone-baustelle-upload.jks` s aliasom
`solstone-upload` (nastao 30.09.2026.). Lozinka je nepoznata, a provjera
integriteta nije uspjela bez nje. Ne izmišljati lozinku i ne prenositi .jks
ni njen base64 u ChatGPT, Git ili javne datoteke. **Ne pokretati skriptu za
generiranje novog ključa** dok korisnik ne utvrdi može li se stari privatni
ključ otključati i podudarati s instaliranom aplikacijom.

Ako se stari ključ oporavi, u sigurni CI sekret može se upisati postojeći
ključ (s aliasom `solstone-upload`) i ispravnom lozinkom. Ako stari certifikat
nije onaj kojim je potpisana postojeća instalacija, Android neće dopustiti
nadogradnju. Ako se certifikat ne može oporaviti, potrebna je zasebno
odobrena **jednokratna nova stabilna instalacija** i od tog dana novo
trajno potpisivanje. Zadržati backup starog .jks.

## iPhone: bez App Storea za sada
**Trenutno praktičan put:** Solstone kao web-aplikacija na Home Screenu:
- Administrator pošalje HTTPS adresu prave Solstone web-aplikacije.
- Radnik je otvori u Safariju na iPhoneu.
- Share/Podijeli -> Add to Home Screen/Dodaj na početni ekran
  -> Open as Web App/Otvori kao web-aplikaciju (ako je ponuđeno) -> Add/Dodaj.
- Solstone se otvara preko ikone i koristi iste web server rute i Supabase
  podatke. Ovaj način **nije potpisani native iPhone IPA**; neke nativne
  funkcije i dozvole zahtijevaju zasebno testiranje.

**Ako kasnije trebamo native iOS aplikaciju:** postojeći `ios-simulator-test`
proizvodi samo nepotpisanu simulatorsku aplikaciju, ne instalacijski IPA.
Potrebni su Apple Developer certifikati, potpisivanje/provisioning i
primjerena službena privatna distribucija (npr. registrirani uređaji/Ad Hoc
ili TestFlight). Običan IPA poslan preko WhatsAppa nije općenit način
instalacije na proizvoljan iPhone.

Službene Apple upute:
https://support.apple.com/en-lb/guide/iphone/iphea86e5236/27/ios/27
https://developer.apple.com/documentation/xcode/distributing-your-app-to-registered-devices/

## Prije slanja stvarnim radnicima — OBAVEZNA kontrola
- Backup postojećeg Supabase sadržaja (uključujući slike) i web produkcije.
- Zaštićena prijava; prava admin/radnik i RLS/server API autorizacija.
- Test u oba smjera: unos sata/slike/materijala iz Androida odmah vidljiv
  adminu u web pregledniku i obratno.
- Kamera, dodavanje slika, PDF, preuzimanje, lokalna dozvola, sesija/logout,
  njemački/BA/UZ/CZ/EN jezik, radnički i adminsko sučelje na telefonu.
- Chat tek kad se pravilno primijeni i testira sigurna chat shema.
- Provjeriti URL bez SSO blokade za radnike i napraviti plan povratka.
