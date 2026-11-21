import { expect, test } from "bun:test";
import {
  AvatarNotConfiguredError,
  createAvatarRenderer,
} from "../src/index";

test("o esqueleto do avatar falha de forma honesta até a F6a", () => {
  expect(() => createAvatarRenderer()).toThrow(AvatarNotConfiguredError);
});
