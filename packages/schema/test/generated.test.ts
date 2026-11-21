import { expect, test } from "bun:test";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { jsonSchemas } from "../src/json-schema";

const generatedDir = fileURLToPath(new URL("../generated/", import.meta.url));

test("todo schema registrado tem um JSON Schema gerado e nenhum sobra", async () => {
  const files = (await readdir(generatedDir))
    .filter((name) => name.endsWith(".json"))
    .sort();
  const expected = Object.keys(jsonSchemas)
    .map((name) => name + ".json")
    .sort();

  expect(files).toEqual(expected);

  for (const name of files) {
    const text = await readFile(generatedDir + name, "utf8");
    const parsed = JSON.parse(text) as Record<string, unknown>;
    expect(parsed.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(typeof parsed.title).toBe("string");
  }
});
