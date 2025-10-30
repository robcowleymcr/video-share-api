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

export const handler: Handler = async (event: any, context: Context, callback: Callback) => {
  const server = await bootstrapServer();
  return server(event, context, callback);
};
