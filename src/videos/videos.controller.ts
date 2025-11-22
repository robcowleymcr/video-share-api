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
            console.log(`>>> 2`)
            const groups = req.user['cognito:groups'] || [];
            console.log(`>>> 3`)
            const body = dto.body;
            console.log(`>>> 4`)

            if (!groups.includes('admin')) {
                throw new ForbiddenException('Only admins can upload videos');  
            }

            if (!body.action || !body.platform || !body.videoDescription || !body.videoTitle || !body.releaseYear) {
                console.log(`>>> 1`)
                throw new BadRequestException("Please ensure all fields have been provided.");
            }


            const userId = req.user ? req.user.sub : null;
            const name = req.user ? req.user.username : null;

            console.log(`>>>> user sub: ${JSON.stringify(req.user)}`)
            // console.log(`>>>> user name: ${JSON.stringify(req.user)}`)

            return this.videosService.handleVideoAction(dto.body, userId, name);
        } catch (e) {
            throw new BadRequestException(e)
        }
    }

    @Post('play')
    // @UseGuards(CognitoAuthGuard)
    async getVideo(@Body() dto: { body: VideoActionDto }, @Req() req): Promise<VideoResponse> {
        const userId = req.user ? req.user['sub'] : null;
        const name = req.user ? req.user['cognito:username'] : null;
        return this.videosService.handleVideoAction(dto.body, userId, name);
    }

    @Get()
    // @UseGuards(CognitoAuthGuard)
    async getAllVideos(@Query('order') order: string = 'dsc', @Query('limit') limit: string, @Query('page') page: string): Promise<any> {
        // const limitInt = parseInt(limit);
        const limitInt = limit ? parseInt(limit) : null;
        const pageInt = page ? parseInt(page) : 1;
        return this.videosService.getAllVideos(limitInt, pageInt);
    }

    @Get('recommended')
    // @UseGuards(CognitoAuthGuard)
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
    // @UseGuards(CognitoAuthGuard)
    async getVideoMetadata(@Param('id') id: string): Promise<any> {
        return this.videosService.getVideoMetadata(id);
    }

    @Put(':id')
    // @UseGuards(CognitoAuthGuard)
    async updateVideoMetadata(@Param('id') id: string, @Body() videoMetadata: any): Promise<any> {
        // console.log(`>>>>> videoId: ${id}`);
        // console.log(`>>>>> videoMetadata: ${JSON.stringify(videoMetadata)}`);
        return this.videosService.updateVideoMetadata(id, videoMetadata);
    }
}