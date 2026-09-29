# Solstone Baustelle – Native Mobile

Ovaj folder je **jedina native mobilna aplikacija** za Android i iPhone.
Glavni Next.js projekat u root folderu ostaje web/admin aplikacija i server/API sloj.
Mobilna aplikacija koristi istu Supabase bazu i iste korisničke podatke.

## Važno

- `webDir` je `dist` jer Vite build generiše `mobile/dist`.
- Produkcijska aplikacija **ne koristi** `server.url` niti `http://10.0.2.2:3000`.
- Supabase vrijednosti za mobilni klijent su u `.env.local`. Nikad ne stavljati `SUPABASE_SERVICE_ROLE_KEY` u mobile.
- `.env.local` se ne commit-a u Git. `.env.example` služi samo kao predložak.

## Prvi setup na Windowsu

```powershell
cd mobile
npm install
npm run build
npx cap sync android
npx cap open android
```

Nakon svake izmjene mobilnog React koda:

```powershell
cd mobile
npm run android:open
```

Ta komanda prvo napravi novi Vite build, zatim `cap sync android`, pa otvori Android Studio.

## iPhone / iOS

Za iOS je potreban Mac sa Xcode-om. Na Macu, jednom:

```bash
cd mobile
npm install @capacitor/ios@8.4.1
npx cap add ios
npm run ios:open
```

Nakon toga se isti `mobile/src` kod koristi za Android i iPhone.

## Pravilo za daljnji razvoj

- Admin/desktop funkcije ostaju u glavnom Next.js projektu.
- Funkcije za radnike razvijamo u `mobile/src` i dijelimo istu Supabase bazu.
- Native funkcije (kamera, fotografije, push, filesystem, lokacija) dodajemo preko Capacitor plugina.
- Ne praviti treći mobilni frontend.
