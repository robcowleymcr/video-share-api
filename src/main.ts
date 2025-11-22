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

    expressApp.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', 'https://amplify.d1hf606h22june.amplifyapp.com,http://localhost:3000');
      res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
      res.header('Access-Control-Allow-Credentials', 'true');

      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
      next();
    });

    const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
    app.enableCors({
      origin: ['https://amplify.d1hf606h22june.amplifyapp.com', 'http://localhost:3001'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    });
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

  // app.enableCors({
  //   origin: ['http://localhost:3001', 'https://amplify.d1hf606h22june.amplifyapp.com'],
  //   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  //   allowedHeaders: ['Content-Type', 'Authorization'],
  //   credentials: true,
  // });

  app.enableCors();

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Local server running at http://localhost:${port}`);
}

// Only run this in local mode (not when running as a Lambda)
if (process.env.AWS_LAMBDA_FUNCTION_NAME === undefined) {
  bootstrapLocal();
}
