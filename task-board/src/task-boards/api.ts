import { authenticate } from '#core/authenticate';
import { requireAuth } from '#core/require-auth';
import cookieSession from 'cookie-session';
import express, { Application, Router } from 'express';
import http from 'http';

export const startAPI = (router: Router) => {
  const app: Application = express();

  app.set('trust proxy', true);
  app.set('etag', false);
  app.use(express.json());
  app.use(
    express.urlencoded({
      extended: true,
    }),
  );
  app.use(
    cookieSession({
      signed: false,
      secure: process.env.NODE_ENV !== 'test',
    }),
  );
  app.use(authenticate);
  app.use(requireAuth);
  app.use('/task-boards', router);

  const server = http.createServer(app);

  server.listen(5000);

  server.on('listening', () => {
    console.info('server up listening');
  });
};
