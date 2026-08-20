import { rm } from "node:fs/promises";

const paths = ["public/assets", "public/index.html"];

await Promise.all(
  paths.map((path) =>
    rm(path, {
      force: true,
      recursive: true,
    }),
  ),
);
