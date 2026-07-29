# ScreenLive

Mění staré telefony a tablety v šuplíku na hodiny, meteostanici, fotorámeček, textovou nástěnku
nebo živě sdílenou obrazovku.

Ve druhé verzi přibylo:

- **Vlastní účty** — registrace jménem a heslem, každý uživatel vidí a spravuje jen svoje displeje.
- **Skrytá databáze** — Firebase adresa a přístupové údaje už nejsou nikde v prohlížeči ani v párovacím
  odkazu. Veškerá komunikace jde přes pár malých serverless funkcí (`/api/...`), které běží na Vercelu
  a k Firebase mluví samy pomocí servisního účtu.

## Soubory

- **`index.html`** — hlavní stránka s odkazy na obě části.
- **`admin.html`** — přihlášení/registrace + správa displejů + panel pro sdílení obrazovky. Otevíráš na počítači.
- **`display.html`** — pasivní displej. Otevíráš na starém telefonu/tabletu.
- **`api/`** — serverless funkce (Node.js, žádné závislosti navíc), které mluví s Firebase a řeší účty,
  párování, přístupová práva a přenos snímků při sdílení obrazovky. Nasazují se samy, jakmile je repo na Vercelu.

## 1. Firebase — jen jako úložiště, servisní účet místo test mode

1. V [Firebase konzoli](https://console.firebase.google.com) u projektu **ScreenLive**:
   **Build → Realtime Database → Create Database** (pokud ještě není). Region klidně `europe-west1`.
   Pravidla teď můžou být cokoliv, protože k databázi už napřímo nikdo z prohlížeče nepřistupuje —
   ale pro jistotu je zamkni: v **Rules** nastav
   ```json
   { "rules": { ".read": false, ".write": false } }
   ```
   Servisní účet (níže) tato pravidla obchází, takže appka bude fungovat dál, ale nikdo jiný se
   k datům přes REST API nedostane.
2. **Project settings** (ozubené kolo vlevo nahoře) → **Service accounts** → **Generate new private key**.
   Stáhne se JSON soubor — z něj budeš potřebovat pole `client_email` a `private_key`.
3. Zapamatuj si i **databaseURL** své Realtime Database (nahoře nad daty), např.
   `https://screenwall-lite-default-rtdb.europe-west1.firebasedatabase.app`.

## 2. Proměnné prostředí ve Vercelu

V nastavení projektu na Vercelu (**Settings → Environment Variables**) přidej:

| Proměnná | Hodnota |
|---|---|
| `FB_DB_URL` | databaseURL z kroku 1 |
| `FB_CLIENT_EMAIL` | `client_email` ze staženého JSON |
| `FB_PRIVATE_KEY` | `private_key` ze staženého JSON (i s `\n` uvnitř — kód si je sám převede na skutečné odřádkování) |
| `APP_SECRET` | libovolný dlouhý náhodný řetězec (podepisuje přihlašovací a párovací tokeny) |

Po uložení proměnných je potřeba projekt znovu nasadit (redeploy), aby se promítly do funkcí.

## 3. Použití

1. Otevři `admin.html` → **Vytvořit účet** (jméno + heslo, jen pro tebe).
2. V administraci se vygeneruje párovací QR kód pro aktuální Wall ID (výchozí `domov`).
3. Naskenuj ho na starém telefonu → telefon se sám zaregistruje a objeví se v seznamu.
4. Přiřaď mu widget — viz přehled níže.

Jeden účet může mít víc "zdí" — stačí v administraci změnit Wall ID a znovu načíst; pro každou zeď se
generuje samostatný párovací odkaz.

## Skupiny displejů a automatické zařazení

Pro akce/konference nebo třeba hotelové televize je nepohodlné nastavovat každý displej ručně. Řeší to
**skupiny**:

1. V kartě „Skupiny displejů" vytvoř skupinu (např. „Stream" nebo „Lobby TV") a nastav jí widget.
2. V kartě „Zeď" zvol tuhle skupinu jako **výchozí skupinu pro nově spárované displeje**.
3. Od teď se každý nově naskenovaný displej rovnou zařadí do skupiny a zobrazuje její widget —
   žádné ruční nastavování po jednom.
4. Změna widgetu skupiny se promítne okamžitě všem displejům v ní najednou.

Displej lze kdykoliv ze skupiny vyjmout (výběrem „— žádná —" v jeho vlastní kartě) a nastavit mu
vlastní widget ručně.

**Příklad — QR v prezentaci, co rovnou pustí diváky do streamu:**

1. Nastav Wall ID pro tu akci, např. `prednaska`, a „Přepnout / obnovit".
2. V „Skupiny displejů" vytvoř skupinu „Stream" a jako widget jí nastav **Sdílení obrazovky (živé)**.
3. V kartě „Zeď" zvol „Stream" jako výchozí skupinu — pod QR kódem se objeví potvrzení
   („Nově spárované displeje se přidají do skupiny „Stream"").
4. Vlož obrázek toho QR kódu (`qr-img` v kartě „Připojit novou obrazovku") do slidu prezentace.
5. Kdokoliv ho během přednášky naskenuje, se rovnou objeví ve streamu — nic se nemusí ručně
   přiřazovat.

## Widgety

| Widget | Co potřebuje | Poznámka |
|---|---|---|
| Hodiny | nic (volitelně světová města) | 12/24hodinový formát; nepovinný řádek s malými hodinami dalších měst (`Název\|Časové pásmo`, např. `Tokio\|Asia/Tokyo`) |
| Počasí | zeměpisné souřadnice (nebo napiš název města a vyber ze seznamu) | aktuální stav + výhled na 4 dny, zdarma přes Open-Meteo, bez API klíče |
| Fotorámeček | seznam URL adres obrázků | interval střídání v sekundách |
| Textová deska | volný text | velikost písma |
| QR kód | adresa nebo text | popisek pod kódem nepovinný, stejné bezplatné API jako párování |
| Odpočítávání | cílové datum a čas | dny/hod/min/sek do cíle, po dosažení zobrazí vlastní text; datum se ukládá jako přesný okamžik, takže sedí i displejům v jiné časové zóně |
| Sdílení obrazovky (živě) | nic v kartě displeje | obraz se pouští z panelu „Sdílení obrazovky" v administraci — libovolná karta/obrazovka z počítače, jako snímky po ~1 vteřině, se třemi presety kvality; hodí se na přednášky. Vyžaduje prohlížeč s podporou `getDisplayMedia` (běžné desktopové Chrome/Edge/Firefox). |

## Jak to funguje pod kapotou

- Vercel Hobby plán dovolí max. 12 serverless funkcí na nasazení — proto je v `api/` jen 7 souborů
  (mimo `_lib/`), i když endpointů je logicky víc. Příbuzné operace jsou spojené v jednom souboru
  a rozlišené podle HTTP metody a/nebo query parametru (`?action=`, `?id=`):
  - `api/auth.js` — registrace/přihlášení/odhlášení/„kdo jsem" (`?action=register|login|logout|me`)
  - `api/devices.js` — výpis (bez `id`) i úprava/smazání jednoho displeje (`?id=...`)
  - `api/groups.js` — výpis/vytvoření (bez `id`) i úprava/smazání jedné skupiny (`?id=...`)
  - `api/pair.js` — `GET` vygeneruje párovací odkaz (admin), `POST` ho uplatní (telefon)
  - `api/broadcast.js` — `GET` s `uid` v query je veřejný cachovaný snímek pro displeje,
    cokoliv jiného je přihlášená správa vlastního vysílání

- `admin.html` a `display.html` nikdy nemluví s Firebase přímo — jen s `/api/...` na stejné doméně.
- Serverless funkce si k Firebase vyřizují přístup přes Google servisní účet (OAuth2 JWT), takže
  žádný tajný klíč neopouští server.
- Přihlášení: heslo se ukládá jako salted hash (`scrypt`), session je podepsaný cookie token
  (HMAC, `APP_SECRET`), ne surové heslo ani ID.
- Párování: odkaz z administrace obsahuje podepsaný token vázaný na tvůj účet a Wall ID. Telefon ho
  po naskenování pošle na `/api/pair`, dostane zpět vlastní `deviceId` + `deviceToken` a ty pak používá
  pro pravidelnou synchronizaci — takže i kdyby někdo tenhle token telefonu odposlechl, dostane se
  akorát k datům toho jednoho displeje, ne k celému účtu.
- Různí uživatelé mají data oddělená pod `/users/{uid}/...` — jeden účet nemůže vidět ani smazat
  displeje jiného účtu (ověřeno testy při vývoji).
- Sdílení obrazovky posílá zmenšené a komprimované JPEG snímky (ne video) přes stejnou Firebase
  databázi — je to jednoduché a spolehlivé, ale není určené na celodenní nepřetržitý provoz;
  pro krátké přednáškové session je to v pohodě. Kvalita snímků (rozlišení + komprese) se dá
  přepnout v administraci mezi třemi presety (úsporná/vyvážená/vysoká).
- Snímek pro sdílení obrazovky se stahuje přes veřejnou cacheovanou GET větev `/api/broadcast`
  (`?uid=...&wall=...`, bez přihlášení) s krátkým cachováním na hraně Vercelu (`s-maxage=1`).
  Díky tomu nezáleží, jestli se dívá 5, nebo 100 displejů najednou — na Firebase a na serverless
  funkce jde pořád jen jeden dotaz za vteřinu, ne jeden za displej. Přenosová šířka pásma k divákům
  (displejům) roste s jejich počtem přirozeně dál — to je fyzikální limit, který cachování neřeší,
  ale u desítek až stovek displejů je to v rámci běžných limitů zdarma dostupných plánů.
- Snímky posílané na displeje NEJSOU nikde ukládané (jen ten poslední, přepisovaný) — nehodí se
  z nich rekonstruovat video. Místo toho administrace při sdílení paralelně nahrává skutečný
  videozáznam přímo v prohlížeči (`MediaRecorder` nad stejným streamem, nezávisle na tom, jak
  často se posílají snímky na displeje) a po zastavení sdílení nabídne stažení `.webm` souboru —
  nic se přitom neukládá na server.

## Nápady na rozšíření

- Vizuální rozmístění displejů do mřížky/mozaiky (drag & drop) jako v originále.
- Živá data z Relay.app/n8n do widgetu `text` přes vlastní malý API klíč na zápis.
- Vlastní widgety psané v JS, načítané z URL zadané v administraci.
- Automatické obnovení `display.html` po nasazení nové verze (dnes je potřeba telefon ručně obnovit).
- Reset hesla / správa víc uživatelů v rámci jedné organizace.
