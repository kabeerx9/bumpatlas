import { buildApp } from "../apps/server/dist/create-app.mjs";

const app = buildApp();
let readyPromise;

export default async function handler(request, response) {
  readyPromise ??= app.ready();
  await readyPromise;

  app.server.emit("request", request, response);
}
