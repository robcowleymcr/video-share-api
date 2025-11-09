import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { VideosService } from "./videos.service";
import { VideoActionDto } from "./dto/video-action.dto";
import { VideoResponse } from "./interfaces/video-response.interface";
import { CognitoAuthGuard } from "common/guards/cognito.guard";

@Controller('videos')
export class VideoController {
    constructor(private readonly videosService: VideosService) {}

    @Post()
    // @UseGuards(CognitoAuthGuard)
    async handleVideoAction(@Body() dto: { body: VideoActionDto }, @Req() req): Promise<VideoResponse> {
        console.log('req.user', req.user);
        console.log('req.body', dto);
        const userId = req.user? req.user['cognito:username'] : null;
        const name = req.user? req.user['name'] : null;
        return this.videosService.handleVideoAction(dto.body, userId, name);
    }

    @Get()
    // @UseGuards(CognitoAuthGuard)
    async getAllVideos(): Promise<any> {
        return this.videosService.getAllVideos();
    }

    @Delete(':id')
    @UseGuards(CognitoAuthGuard)
    async deleteVideo(@Param('id') id: string): Promise<any> {
        return this.videosService.deleteVideo(id);
    }

    @Get(':id')
    // @UseGuards(CognitoAuthGuard)
    async getVideoMetadata(@Param('id') id: string): Promise<any> {
        return this.videosService.getVideoMetadata(id);
    }
}