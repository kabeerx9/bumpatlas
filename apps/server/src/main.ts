import { buildApp } from "./create-app";

const fastify = buildApp();
const port = Number(process.env.PORT ?? 3000);

fastify.listen({ port }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }

  console.log(`Server running on port ${port}`);
});
