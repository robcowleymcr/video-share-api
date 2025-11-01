import { Module } from '@nestjs/common';
import { VideosModule } from './videos/videos.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [VideosModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
