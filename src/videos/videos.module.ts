import { Module } from "@nestjs/common";
import { VideoController } from "./videos.controller";
import { VideosService } from "./videos.service";

@Module({
    controllers: [VideoController],
    providers: [VideosService],
})

export class VideosModule {}