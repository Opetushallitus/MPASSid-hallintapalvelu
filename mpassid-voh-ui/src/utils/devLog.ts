export type LogLevel = "ERROR" | "WARN" | "INFO" | "DEBUG";

const ORDER: Record<LogLevel, number> = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const isLogLevel = (value: string): value is LogLevel => value in ORDER;

export const logLevelStorageKey = "hallintapalvelu-log-level";

/**
 * Taso ratkaistaan kerran moduulin latauksen yhteydessä:
 * localStorage-override > ENV.LOG_LEVEL (VITE_LOG_LEVEL) > PROD ? INFO : DEBUG.
 * Overridella tuen saa DEBUG-lokit esiin tuotannossa ilman uutta buildia:
 *   localStorage.setItem("hallintapalvelu-log-level", "DEBUG")
 */
const resolveLevel = (): LogLevel => {
  let override: string | null = null;
  try {
    override = globalThis.localStorage?.getItem(logLevelStorageKey) ?? null;
  } catch {
    // Selain voi estää localStorage-pääsyn (private mode, evätyt evästeet).
  }
  const raw = (
    override ??
    ENV.LOG_LEVEL ??
    (ENV.PROD ? "INFO" : "DEBUG")
  ).toUpperCase();
  return isLogLevel(raw) ? raw : ENV.PROD ? "INFO" : "DEBUG";
};

const threshold = ORDER[resolveLevel()];

/**
 * Kutsupaikan vartija: käytä tätä, kun lokiargumentin laskeminen maksaa
 * (funktiokutsu, syväkopio, vertailu), koska argumentit evaluoidaan ennen
 * loggerin kutsua riippumatta siitä, logataanko mitään.
 */
export const logEnabled = (level: LogLevel) => ORDER[level] <= threshold;

const method: Record<LogLevel, "error" | "warn" | "info" | "debug"> = {
  ERROR: "error",
  WARN: "warn",
  INFO: "info",
  DEBUG: "debug",
};

const noop = () => {};

export type Logger = (text: string, ...data: unknown[]) => void;

/**
 * Palauttaa bindatun console-metodin — EI käärefunktiota. Bindattu funktio ei
 * luo omaa pinokehystä, joten selain merkitsee viestin sen tiedoston ja rivin
 * kohdalle, josta loggeria kutsutaan, eikä tämän moduulin sisälle. Käärefunktio
 * veisi ankkurin aina tänne (devLog.ts).
 *
 * Kutsu moduulitasolla kerran per tiedosto:
 *   const debugLog = createLogger("DEBUG");
 *
 * Taso lukitaan luontihetkellä, joten loggerit on luotava moduulitasolla, ei
 * ehtolauseen sisällä.
 */
export const createLogger = (level: LogLevel): Logger =>
  logEnabled(level)
    ? // eslint-disable-next-line no-console -- tämä moduuli on sovelluksen ainoa konsolisilta.
      console[method[level]].bind(console, `${level}:`)
    : noop;

// --- Salaisuuksien peitto lokissa ---------------------------------------
//
// OIDC-palveluntarjoajan `client_secret` ja Azure-IdP:n `clientKey` kulkevat
// samoissa integraatio-, konfiguraatio-, metadata- ja attribuuttiolioissa,
// joita DEBUG-lokit dumppaavat sellaisenaan. Backend palauttaa ne yleensä
// muodossa "***", mutta juuri generoidun salaisuuden se paljastaa kerran
// raakana — ja LOG_LEVEL=DEBUG on saatavilla tuotannossa localStorage-
// overridella. Siksi salaisuudet peitetään ennen konsolia.
//
// Peitto tehdään KUTSUPAIKALLA eikä loggerissa: loggeri on bindattu
// console-metodi, ja käärefunktio veisi rivinumeroankkurin devLog.ts:ään.

const SECRET_KEY = /^(client_?secret|clientkey)$/i;
const MASK = "***";
const MAX_DEPTH = 6;

const isSecret = (key: unknown, value: unknown) =>
  typeof key === "string" && SECRET_KEY.test(key) && typeof value === "string" && value !== "";

const mask = (value: unknown, depth: number): unknown => {
  if (depth > MAX_DEPTH || value === null || typeof value !== "object") return value;

  if (Array.isArray(value)) {
    let changed = false;
    const out = value.map((item) => {
      const masked = mask(item, depth + 1);
      if (masked !== item) changed = true;
      return masked;
    });
    return changed ? out : value;
  }

  // Vain tavalliset oliot: Date, Map, React-elementit yms. palautetaan sellaisenaan.
  if (Object.getPrototypeOf(value) !== Object.prototype) return value;

  const record = value as Record<string, unknown>;

  // Attribuuttimuoto { name: "clientKey", content: "..." }
  if (isSecret(record.name, record.content)) return { ...record, content: MASK };

  const entries = Object.entries(record);
  const masked = entries.map(
    ([key, item]) => [key, isSecret(key, item) ? MASK : mask(item, depth + 1)] as const
  );
  const changed = masked.some(([, item], i) => item !== entries[i]![1]);
  return changed ? Object.fromEntries(masked) : value;
};

/**
 * Peittää tunnetut salaisuudet logattavasta oliosta. Palauttaa alkuperäisen
 * viitteen, jos peitettävää ei löydy, joten kutsu on käytännössä ilmainen.
 * Käytä aina, kun logaat kokonaisen integraatio-, konfiguraatio-, metadata-
 * tai attribuuttiolion.
 */
export const redactSecrets = (value: unknown): unknown => mask(value, 0);

/**
 * Sama lehtiarvoille, joiden salaisuus selviää vain avaimesta — esimerkiksi
 * `metadata[name]` tai `attribute.content`, joissa arvo on paljas merkkijono.
 */
export const redactSecretValue = (key: unknown, value: unknown): unknown =>
  isSecret(key, value) ? MASK : mask(value, 0);
