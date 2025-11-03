import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { VideosService } from "./videos.service";
import { VideoActionDto } from "./dto/video-action.dto";
import { VideoResponse } from "./interfaces/video-response.interface";
import { CognitoAuthGuard } from "common/guards/cognito.guard";

@Controller('videos')
export class VideoController {
    constructor(private readonly videosService: VideosService) {}

    @Post()
    @UseGuards(CognitoAuthGuard)
    async handleVideoAction(@Body() dto: { body: VideoActionDto }, @Req() req): Promise<VideoResponse> {
        return this.videosService.handleVideoAction(dto.body, req.user['cognito:username'], req.user['name']);
    }
}