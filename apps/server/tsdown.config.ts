import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/main.ts", "./src/create-app.ts"],
  format: "esm",
  outDir: "./dist",
  clean: true,
  noExternal: [/@app-starter\/.*/],
});
