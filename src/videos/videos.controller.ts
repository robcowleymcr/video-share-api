import { Body, Controller, Post } from "@nestjs/common";
import { VideosService } from "./videos.service";
import { VideoActionDto } from "./dto/video-action.dto";
import { VideoResponse } from "./interfaces/video-response.interface";

@Controller('videos')
export class VideoController {
    constructor(private readonly videosService: VideosService) {}

    @Post()
    async handleVideoAction(@Body() body: VideoActionDto): Promise<VideoResponse> {
        return this.videosService.handleVideoAction(body);
    }
}