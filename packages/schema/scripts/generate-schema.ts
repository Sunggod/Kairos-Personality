import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { jsonSchemas } from "../src/json-schema";

const outDir = fileURLToPath(new URL("../generated/", import.meta.url));
await mkdir(outDir, { recursive: true });

for (const [name, schema] of Object.entries(jsonSchemas)) {
  await writeFile(
    join(outDir, name + ".json"),
    JSON.stringify(schema, null, 2) + "\n",
    "utf8",
  );
}

console.log("JSON Schema gerado em " + outDir);
