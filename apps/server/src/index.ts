import Fastify from 'fastify';
import { runWorkflow } from '@skein/engine';

const fastify = Fastify({
  logger: true
});

fastify.get('/', async (request, reply) => {
  return { hello: 'world' };
});

fastify.get('/health', async (request, reply) => {
  const result = runWorkflow({
    id: 'health-test',
    name: 'Health Check Workflow',
    nodes: [],
    edges: []
  });
  return { status: 'ok', engineMessage: result };
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3000;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Server is running at http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
