import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand, S3Client, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { VideoActionDto } from "./dto/video-action.dto";
import { VideoResponse } from "./interfaces/video-response.interface";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { VideoMetadata } from "./entities/videoMetadata.entity";
import { uuid } from "uuidv4";
import { VideoStatus } from "./enum/videoStatus.enum";
import { DynamoDB } from "aws-sdk";
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from "@nestjs/typeorm";
import { Video } from "./entities/video.entity";
import { Repository } from "typeorm";

@Injectable()
export class VideosService {
    private s3 = new S3Client({ region: 'eu-west-2' });
    private readonly BUCKET_NAME = 'video-share-uploads';
    private readonly dynamoDbClient = new DynamoDB.DocumentClient({ region: 'eu-west-2' });
    private TableName;

    constructor(
        private readonly config: ConfigService,
        @InjectRepository(Video)
        private readonly videoRepo: Repository<Video>
    ) {
        this.TableName = this.config.get<string>('TABLE_NAME');
    }

    async saveVideoMetadata(videoMetadata: VideoMetadata): Promise<any> {
        const params = {
            TableName: this.TableName,
            Item: videoMetadata
        }
        return this.dynamoDbClient.put(params).promise();
    }

    async handleVideoAction(dto: VideoActionDto, uploaderId: string, uploaderName: string): Promise<VideoResponse> {
        const { action, key, contentType, videoTitle, videoDescription, releaseYear, platform } = dto;
        const expiresIn = 3600;

        let command;

        if (action === 'upload') {
            const videoId = uuid();
            const fileName = `${videoId}.mp4`;
            let s3Key = `${uploaderId}/${videoId}`;

            command = new PutObjectCommand({
                Bucket: this.BUCKET_NAME,
                Key: fileName,
                ContentType: contentType
            })

            const metadataObject = new VideoMetadata(
                videoId,
                uploaderId,
                uploaderName,
                s3Key,
                videoTitle,
                dto.contentType,
                VideoStatus.PENDING,
                videoDescription,
                parseInt(releaseYear),
                platform
            );

            await this.saveVideoMetadata(metadataObject);
        } else if (action === 'download') {
            command = new GetObjectCommand({
                Bucket: this.BUCKET_NAME,
                Key: key
            })
        } else {
            throw new BadRequestException('Invalid action');
        }

        const url = await getSignedUrl(this.s3, command, { expiresIn });

        return {
            url,
            expiresIn
        }
    }

    async getRecommendedVideos(): Promise<any> {
        const scanResult = await this.getAllVideos(null, 1);
        const items = scanResult.Items || [];
        const shuffledItems = items.sort(() => Math.random() - 0.5);
        const recommendedVideos = shuffledItems.slice(0, 5);

        return recommendedVideos;
    }

    async getAllVideos(limit: number | null, page: number): Promise<DynamoDB.DocumentClient.ScanOutput> {
        const videosData = await this.videoRepo.find({
            where: {
                status: VideoStatus.UPLOADED,
            },
            order: {
                title: 'ASC'
            }
        });

        const items = videosData.map((item: any, index: number) => {
            return {
                ...item,
                index: index + 1
            }
        });

        let slicedArray = items.slice(0, limit || items.length);
        let totalPages: number | null = null

        if (limit) {
            totalPages = Math.ceil(items.length / limit);
            const StartIndex = (page - 1) * limit;
            const EndIndex = StartIndex + limit > items.length ? items.length : StartIndex + limit;
            slicedArray = items.slice(StartIndex, EndIndex);
        }

        const object = {
            ...videosData,
            Count: items.length,
            Items: slicedArray,
            StartIndex: slicedArray[0].index,
            EndIndex: slicedArray[slicedArray.length - 1].index,
            TotalPages: totalPages
        }
        return object;
    }

    async deleteVideo(videoId: string, userId: string): Promise<any> {
        const video = await this.videoRepo.findOne({ where: { videoId } });

        if (!video) {
            throw new NotFoundException(`Video with id ${videoId} not found`);
        }

        if (video.uploaderId !== userId) {
            throw new BadRequestException('You can only delete your own videos');
        }

        const command = new DeleteObjectsCommand({
            Bucket: this.BUCKET_NAME,
            Delete: {
                Objects: [
                    { Key: `${videoId}.mp4` },
                    { Key: `thumbnails/${videoId}.jpg` },
                ],
            },
        });

        const s3DeleteResponse = await this.s3.send(command);
        console.log('S3 delete response:', s3DeleteResponse);

        await this.videoRepo.update(
            { videoId },
            { status: VideoStatus.DELETED },
        );

        const updatedVideo = await this.videoRepo.findOne({ where: { videoId } });
        if (!updatedVideo) {
            throw new NotFoundException(
                `Video with id ${videoId} not found after update`,
            );
        }

        return { video: updatedVideo };
    }

    async getVideoMetadata(videoId: string): Promise<Video | null> {
        const result = await this.videoRepo.findOne({
            where: { videoId }
        })
        console.log(result);
        return result;
    }

    async updateVideoMetadata(videoId: string, videoMetadata: any): Promise<any> {
        if (!videoId || !videoMetadata) {
            throw new BadRequestException('Missing videoId or metadata');
        }

        const updatableFields = ['title', 'videoDescription', 'platform', 'releaseYear'];

        const updatePayload: Partial<Video> = {};

        for (const field of updatableFields) {
            if (field in videoMetadata) {
                if (field === 'releaseYear' && videoMetadata[field] != null) {
                    updatePayload[field] = Number(videoMetadata[field]) as any;
                } else {
                    updatePayload[field] = videoMetadata[field];
                }
            }
        }

        if (Object.keys(updatePayload).length === 0) {
            throw new BadRequestException('No valid fields to update');
        }

        const updateResult = await this.videoRepo.update(
            { videoId },
            updatePayload
        );

        if (updateResult.affected === 0) {
            throw new NotFoundException(`Video with id ${videoId} not found`);
        }

        const updatedVideo = await this.videoRepo.findOne({ where: { videoId } });
        if (!updatedVideo) {
            throw new NotFoundException(`Video with id ${videoId} not found after update`);
        }

        let signedUrl: string | null = null;

        if (videoMetadata.fileName) {
            const s3FilePath = `thumbnails/${videoId}.jpg`;
            console.log(`>>>>> file upload required: ${s3FilePath}`);


            const command = new PutObjectCommand({
                Bucket: this.BUCKET_NAME,
                Key: s3FilePath,
                ContentType: 'jpg',
            });

            signedUrl = await getSignedUrl(this.s3, command, { expiresIn: 3600 });
        }
        try {
            // const result = await this.dynamoDbClient.update(params).promise();
            return {
                video: updatedVideo,
                ...(signedUrl ? { signedUrl } : {}),
            };
        } catch (err) {
            console.error('❌ Failed to update video metadata:', err);
            throw new BadRequestException('Failed to update video metadata');
        }

    }
}
