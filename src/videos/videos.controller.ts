import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Param, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { VideosService } from "./videos.service";
import { VideoActionDto } from "./dto/video-action.dto";
import { VideoResponse } from "./interfaces/video-response.interface";
import { CognitoAuthGuard } from "../common/guards/cognito.guard";

@Controller('videos')
export class VideoController {
    constructor(private readonly videosService: VideosService) { }

    @Post()
    @UseGuards(CognitoAuthGuard)
    async uploadVideo(@Body() dto: { body: VideoActionDto }, @Req() req): Promise<VideoResponse> {
        try {
            const groups = req.user['cognito:groups'] || [];
            const body = dto.body;

            if (!groups.includes('admin')) {
                throw new ForbiddenException('Only admins can upload videos');  
            }

            if (!body.action || !body.platform || !body.videoDescription || !body.videoTitle || !body.releaseYear) {
                throw new BadRequestException("Please ensure all fields have been provided.");
            }

            const userId = req.user ? req.user.sub : null;
            const name = req.user ? req.user.username : null;

            return await this.videosService.requestSignedUrl(dto.body, userId, name)
        } catch (error) {
            throw error
        }
    }

    @Post('play')
    async getVideo(@Body() dto: { body: VideoActionDto }, @Req() req): Promise<VideoResponse> {
        const userId = req.user ? req.user['sub'] : null;
        const name = req.user ? req.user['cognito:username'] : null;
        return this.videosService.handleVideoAction(dto.body, userId, name);
    }

    @Get()
    async getAllVideos(@Query('order') order: string = 'dsc', @Query('limit') limit: string, @Query('page') page: string): Promise<any> {
        console.log(`>>>>>>> get videos`)
        // const limitInt = parseInt(limit);
        const limitInt = limit ? parseInt(limit) : null;
        const pageInt = page ? parseInt(page) : 1;
        return this.videosService.getAllVideos(limitInt, pageInt);
    }

    @Get('recommended')
    async getRecommendedVideos(): Promise<any> {
        return this.videosService.getRecommendedVideos();
    }

    @Delete(':id')
    @UseGuards(CognitoAuthGuard)
    async deleteVideo(@Param('id') id: string, @Req() req): Promise<any> {
        const userId = req.user ? req.user['sub'] : null;
        return this.videosService.deleteVideo(id, userId);
    }

    @Get(':id')
    async getVideoMetadata(@Param('id') id: string): Promise<any> {
        return this.videosService.getVideoMetadata(id);
    }

    @Put(':id')
    async updateVideoMetadata(@Param('id') id: string, @Body() videoMetadata: any): Promise<any> {
        // console.log(`>>>>> videoId: ${id}`);
        // console.log(`>>>>> videoMetadata: ${JSON.stringify(videoMetadata)}`);
        return this.videosService.updateVideoMetadata(id, videoMetadata);
    }
}