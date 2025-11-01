import { Body, Controller, Get, Post } from "@nestjs/common";
import { VideosService } from "./videos.service";
import { VideoActionDto } from "./dto/video-action.dto";
import { VideoResponse } from "./interfaces/video-response.interface";

@Controller('videos')
export class VideoController {
    constructor(private readonly videosService: VideosService) {}

    @Post()
    async handleVideoAction(@Body() dto: { body: VideoActionDto }): Promise<VideoResponse> {
        // console.log(`>>>>>>> body: ${JSON.stringify(body)}`);
        return this.videosService.handleVideoAction(dto.body);
    }
}