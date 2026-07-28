# ScreenWall Lite

Prototyp inspirovaný projektem [ScreenWall](https://screenwall.app) — mění staré telefony a tablety
v šuplíku na hodiny, meteostanici, fotorámeček nebo textovou nástěnku.

Ve druhé verzi přibylo:

- **Vlastní účty** — registrace jménem a heslem, každý uživatel vidí a spravuje jen svoje displeje.
- **Skrytá databáze** — Firebase adresa a přístupové údaje už nejsou nikde v prohlížeči ani v párovacím
  odkazu. Veškerá komunikace jde přes pár malých serverless funkcí (`/api/...`), které běží na Vercelu
  a k Firebase mluví samy pomocí servisního účtu.

## Soubory

- **`index.html`** — hlavní stránka s odkazy na obě části.
- **`admin.html`** — přihlášení/registrace + správa displejů. Otevíráš na počítači.
- **`display.html`** — pasivní displej. Otevíráš na starém telefonu/tabletu.
- **`api/`** — serverless funkce (Node.js, žádné závislosti navíc), které mluví s Firebase a řeší účty,
  párování a přístupová práva. Nasazují se samy, jakmile je repo na Vercelu.

## 1. Firebase — jen jako úložiště, servisní účet místo test mode

1. V [Firebase konzoli](https://console.firebase.google.com) u projektu **ScreenWall Lite**:
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
4. Přiřaď mu widget (hodiny, počasí, fotorámeček, textová deska).

Jeden účet může mít víc "zdí" — stačí v administraci změnit Wall ID a znovu načíst; pro každou zeď se
generuje samostatný párovací odkaz.

## Jak to funguje pod kapotou

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

## Nápady na rozšíření

- Vizuální rozmístění displejů do mřížky/mozaiky (drag & drop) jako v originále.
- Živá data z Relay.app/n8n do widgetu `text` přes vlastní malý API klíč na zápis.
- Vlastní widgety psané v JS, načítané z URL zadané v administraci.
- Automatické obnovení `display.html` po nasazení nové verze (dnes je potřeba telefon ručně obnovit).
- Reset hesla / správa víc uživatelů v rámci jedné organizace.
