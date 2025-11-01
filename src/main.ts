import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import serverlessExpress from '@vendia/serverless-express';
import { Handler, Context, Callback } from 'aws-lambda';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

let cachedServer: Handler;

async function bootstrapServer(): Promise<Handler> {
  if (!cachedServer) {
    const expressApp = express();
    const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
    await app.init();
    cachedServer = serverlessExpress({ app: expressApp });
  }
  return cachedServer;
}

/**
 * Lambda handler (used by SAM / AWS)
 */
export const handler: Handler = async (event: any, context: Context, callback: Callback) => {
  const server = await bootstrapServer();
  return server(event, context, callback);
};

/**
 * Local development entry point
 * This will run if you execute `npm run start:dev`
 */
async function bootstrapLocal() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: 'http://localhost:5173', // ✅ your React dev server
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true, // optional, only if you use cookies or auth headers
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Local server running at http://localhost:${port}`);
}

// Only run this in local mode (not when running as a Lambda)
if (process.env.AWS_LAMBDA_FUNCTION_NAME === undefined) {
  bootstrapLocal();
}
