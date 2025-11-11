import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { BadRequestException, Injectable } from "@nestjs/common";
import { VideoActionDto } from "./dto/video-action.dto";
import { VideoResponse } from "./interfaces/video-response.interface";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { VideoMetadata } from "./entities/videoMetadata.entity";
import { uuid } from "uuidv4";
import { VideoStatus } from "./enum/videoStatus.enum";
import { DynamoDB } from "aws-sdk";

@Injectable()
export class VideosService {
    private s3 = new S3Client({ region: 'eu-west-2' });
    private readonly BUCKET_NAME = 'video-share-uploads';
    private readonly dynamoDbClient = new DynamoDB.DocumentClient({ region: 'eu-west-2' });

    async saveVideoMetadata(videoMetadata: VideoMetadata) {
        const params = {
            TableName: 'video_share_videos',
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

            // Create new S3 object
            command = new PutObjectCommand({
                Bucket: this.BUCKET_NAME,
                Key: fileName,
                ContentType: contentType
            })

            console.log(`command`, command);

            // Create new VideoMetadata entity
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

            console.log(`metadataObject`, metadataObject);

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
        const scanResult = await this.getAllVideos();
        const items = scanResult.Items || [];

        // Shuffle the items
        const shuffledItems = items.sort(() => Math.random() - 0.5);

        // Select the first 5 items
        const recommendedVideos = shuffledItems.slice(0, 5);

        return recommendedVideos;
    }

    async getAllVideos(order: string = 'dsc', limit: number | null = null): Promise<DynamoDB.DocumentClient.ScanOutput> {
        const params = {
            TableName: 'video_share_videos'
        }
        const scanResult = await this.dynamoDbClient.scan(params).promise();
        const items = scanResult.Items || [];
        const dateDescending = {
            ...scanResult,
            Items: items.sort((a: any, b: any) => {
                if (order === 'dsc') {
                    return new Date(b.uploadDate).getTime() -    new Date(a.uploadDate).getTime();
                }
                return new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime();
            }).slice(0, limit || items.length)
        }
        return dateDescending
    }

    async deleteVideo(videoId: string): Promise<DynamoDB.DocumentClient.DeleteItemOutput> {
        const command = new DeleteObjectCommand({
            Bucket: this.BUCKET_NAME,
            Key: `${videoId}.mp4`,
        })
        await getSignedUrl(this.s3, command);
        const params = {
            TableName: 'video_share_videos',
            Key: {
                videoId: videoId
            }
        }
        return this.dynamoDbClient.delete(params).promise();
    }
    async getVideoMetadata(videoId: string): Promise<DynamoDB.DocumentClient.GetItemOutput> {
        const params = {
            TableName: 'video_share_videos',
            Key: {
                videoId: videoId
            }
        }
        const result = await this.dynamoDbClient.get(params).promise();
        console.log(result);
        return result;
    }
}
