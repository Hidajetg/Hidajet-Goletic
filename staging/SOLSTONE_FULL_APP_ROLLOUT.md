# Solstone Baustelle — jedinstvena web + Android + iOS aplikacija (plan testiranja)
Datum provjere: 2026-11-21. Ovo je **izolovana testna grana**; produkcija se ne mijenja.

## Ciljna arhitektura
- **Jedan izvor funkcionalnosti:** postojeća Next.js Solstone web aplikacija.
- **Jedna baza:** Supabase `baustelle-ai` (`axpfymarrqjebpwosidr`), isti projekti, kalendar, radnici, sati, materijali, fotografije i chat.
- **Web:** administratori i radnici zadržavaju sve postojeće funkcije i ovlaštenja; UI može se prilagoditi veličini ekrana bez odvajanja baze.
- **Android / iOS:** Capacitor interni test otvara istu HTTPS aplikaciju i njene API rute. Testni Vite `UiPreview` je samo demonstracija i NIJE radna aplikacija. Za store izdanje treba zasebno provjerena native/release arhitektura, uređaji i signing.
- **Autorizacija:** korisnik ne bira ulogu radi povećanja ovlaštenja; server provjerava potpisanu sesiju i aktivan `workers.role` za svaki osjetljivi API. Budući DB pristup mora poštovati Supabase Auth + RLS ili strogo kontrolisane server-only rute.

## Trenutno poznato (provjera 2026-11-21)
- Supabase projekt aktivan; `workers`: 8 aktivnih, `baustellen`: 82.
- `work_calendar`: 0 zapisa — demonstracijski datum nije stvarni raspored.
- 58 tabela imaju **isključen RLS**; Supabase upozorava na anon/authenticated pristup. Ne uključivati RLS bez provjerenih pravila — to može oboriti web i mobitel.
- `app/api/auth/login/route.ts` još sadrži stare hardkodirane PIN-ove. To je sigurnosna blokada za javno izdanje. Jedan administratorski profil nema evidentiran hash PIN-a u `worker_auth`; prije uklanjanja legacy prijave potreban je siguran reset tog korisnika.
- Team Chat shema se nalazi u `staging/solstone-team-chat-schema.sql` i izričito je označena kao **staging-only**; trenutne `solstone_chat_*` tabele nisu pronađene u produkcijskom spisku tabela. Ne primjenjivati bez zasebnog DB testa i pregleda RLS.
- Novo dugme `🚶 AI` u offline demo aplikaciji otvara lični ChatGPT u pregledniku. To **ne dijeli** Solstone bazu ili historiju razgovora sa ChatGPT računom.
- Novi `/assistant` i `/api/solstone-ai` su pripremljeni u testnoj grani za read-only pitanja. Server flag `SOLSTONE_AI_ENABLED=true` i tajni `OPENAI_API_KEY` su potrebni tek nakon odobrenja. **Zadana postavka: OFF.** Ograničenje poruka je samo po instanci — treba distribuirani rate limit i limit troška prije javnog izlaska.
- Vercel projekt `stone-boutique/hidajet-goletic-frno` ima produkcijsku domenu `https://hidajet-goletic-frno.vercel.app`. Preview deploymenti imaju SSO zaštitu, a kod na GitHub testnoj grani NIJE automatski produkcijski kod.
- Android real-web CI: `.github/workflows/android-web-test.yml`; pravi paket nosi ID `com.solstone.baustelle.internal` i otvara postojeći production web host. Demonstracijski APK: `android-ui-preview.yml` i paket `com.solstone.baustelle.visualpreview`. Ne miješati ih.
- iPhone test je trenutno nepotpisani iOS simulator build, **ne IPA za fizički iPhone**.
- Android `FLAG_SECURE` u testnoj grani uklonjen radi screenshots; produkcija nije dirana.

## Siguran redoslijed do punog rada
1. Sačuvati provjerenu rezervnu kopiju baze, Storage fajlova i aktuelnog produkcijskog web koda (uključujući razlike u lokalnim Windows fajlovima).
2. Povezati _tačan_ najnoviji produkcijski izvorni kod sa GitHubom; ne mergeovati staru granu preko novijih produkcijskih funkcija.
3. Na izolovanom DB okruženju zamijeniti legacy PIN login sigurnim hash/sesija sistemom; za admina bez hash-a uraditi siguran reset preko kontrolisanog admin postupka, bez slanja PIN-a u chat.
4. Dokumentovati prava po tabeli (admin vs radnik, dodijeljena gradilišta, vlastiti sati), migrirati browser čitanja/pisanja u server-only rute ili Supabase Auth + RLS; testirati negativne pristupe radnika.
5. Testirati migraciju Team Chat sheme i private storage bucketa u stagingu prije primjene na produkciju.
6. Provjeriti popunjavanje `work_calendar` i stvarne dodjele radnika.
7. Omogućiti AI samo kad su autentikacija, RLS, server-side ključ, budžet i rate limit verificirani. AI smije odgovoriti na dozvoljene podatke, ne smije sam mijenjati bazu.
8. Na staging web adresi provjeriti admin i radnik: login/logout, kalendar, Baustelle, sobe, sati, produktivnost, materijali, slike, PDF, chat, AI, jezici, arhiva i uloge.
9. Izgraditi Android internal test APK povezan na *potvrđenu* staging ili production URL; provjeriti kameru, upload, download, tastaturu, back i kolačiće na uređaju.
10. Testirati iOS na fizičkom uređaju uz Apple signing/TestFlight, prije App Store izdanja.
11. Tek uz uspješne testove i odobrenje postepeno pustiti produkcijski kod. Sačuvati rollback i pratiti greške.

## Kriteriji za prihvatanje
- Unos na telefonu odmah vidljiv u web verziji i obratno, bez dupliranja.
- Svaki radnik vidi samo svoja gradilišta/kolege vezane uz radni raspored; admin može upravljati svima.
- Ni jedna administratorska operacija ne može se izvesti promjenom `localStorage` ili HTTP body polja `role`.
- Privatne poruke, PIN hash-evi i dokumenti nisu javno dostupni kroz anon ključ.
- Dva ekrana, jedna baza, jedan skup podataka; testni demo nikad ne šalje stvarne poruke.
