import { Module } from "@nestjs/common";
import { VideoController } from "./videos.controller";
import { VideosService } from "./videos.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Video } from "./entities/video.entity";

@Module({
    imports: [TypeOrmModule.forFeature([Video])],
    controllers: [VideoController],
    providers: [VideosService],
})

export class VideosModule {}