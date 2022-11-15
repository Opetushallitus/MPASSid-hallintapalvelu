import "@visma/public.config/config";

import { stringify } from "csv-stringify/sync";
import { readFile, writeFile } from "node:fs/promises";

const messagesJSON = await readFile(`lang/${global.ENV.LOCALES[0]}.json`);
const messages = JSON.parse(messagesJSON);

// await writeFile(
//   "public/default-messages-export.json",
//   JSON.stringify(combinedKeys, null, 2)
// );

const messagesList = Object.entries(messages).map(
  ([key, { defaultMessage, description }]) => ({
    category: "mpassid",
    key: `${description ?? "yleinen"};${key}`,
    locale: "fi",
    value: defaultMessage,
  })
);

await writeFile(
  "public/default-messages-update.js",
  `(() => {
    fetch(
      "https://virkailija.testiopintopolku.fi/lokalisointi/cxf/rest/v1/localisation/update",
      {
        headers: {
          "content-type": "application/json;charset=UTF-8",
        },
        body: '${JSON.stringify(messagesList)}',
        method: 'POST',
      }
    );
})();`
);

await writeFile(
  "public/default-messages-export.csv",
  stringify(messagesList, { delimiter: "\t", header: true })
);
