import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
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
        console.log(`>>>>>> body: ${JSON.stringify(dto.body)}`);
        return this.videosService.handleVideoAction(dto.body, req.user['cognito:username'], req.user['name']);
    }

    @Get()
    @UseGuards(CognitoAuthGuard)
    async getAllVideos(): Promise<any> {
        console.log(`>>>>>> getAllVideos`);
        return this.videosService.getAllVideos();
    }

    @Delete(':id')
    @UseGuards(CognitoAuthGuard)
    async deleteVideo(@Param('id') id: string): Promise<any> {
        return this.videosService.deleteVideo(id);
    }
}