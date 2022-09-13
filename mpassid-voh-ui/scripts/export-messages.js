import "@visma/public.config/config";

import { readFile, writeFile } from "node:fs/promises";

const keyWithDescription = ([key, { defaultMessage, description }]) => [
  `${description ?? "yleinen"};${key}`,
  defaultMessage,
];

const messagesJSON = await readFile(`lang/${global.ENV.LOCALES[0]}.json`);
const messages = JSON.parse(messagesJSON);
const combinedKeys = Object.fromEntries(
  Object.entries(messages).map(keyWithDescription)
);

await writeFile(
  "default-messages-export.json",
  JSON.stringify(combinedKeys, null, 2)
);
