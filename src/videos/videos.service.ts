import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand, S3Client, DeleteObjectsCommand } from "@aws-sdk/client-s3";
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
        const items = scanResult.Items?.filter((item: any) => item.status === VideoStatus.UPLOADED) || [];
        const dateDescending = {
            ...scanResult,
            Items: items.sort((a: any, b: any) => {
                if (order === 'dsc') {
                    return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
                }
                return new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime();
            }).slice(0, limit || items.length)
        }
        return dateDescending
    }

    async deleteVideo(videoId: string, userId: string): Promise<any> {
        const params = {
            TableName: 'video_share_videos',
            Key: {
                videoId
            }
        }

        const getDbItem: any = await this.dynamoDbClient.get(params).promise();
        console.log(`getDbItem`, getDbItem);
        if (getDbItem.Item.uploaderId === userId) {
            console.log(`>>>>> you uploaded this video`)

            // delete the the thumbnail jpg and the mp4 objects from s3
            const command = new DeleteObjectsCommand({
                Bucket: this.BUCKET_NAME,
                Delete: {
                    Objects: [
                        {
                            Key: `${videoId}.mp4`,
                        },
                        {
                            Key: `thumbnails/${videoId}.jpg`,
                        }
                    ],
                }
            })

            const s3DeleteResponse = await this.s3.send(command);

            console.log("✅ S3 delete success:", s3DeleteResponse);

            // update the item status in dynamodb
            const params = {
                TableName: 'video_share_videos',
                Key: {
                    videoId: videoId,
                },
                UpdateExpression: 'SET #status = :status',
                ExpressionAttributeNames: {
                    '#status': 'status',
                },
                ExpressionAttributeValues: {
                    ':status': VideoStatus.DELETED,
                },
                ReturnValues: 'ALL_NEW',
            };
            return await this.dynamoDbClient.update(params).promise();
        }
        else {
            throw new BadRequestException('You can only delete your own videos');
        }
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

    async updateVideoMetadata(videoId: string, videoMetadata: any): Promise<any> {
        // Validate required input
        if (!videoId || !videoMetadata) {
            throw new BadRequestException('Missing videoId or metadata');
        }

        // Define which fields you want to allow updating
        const updatableFields = ['title', 'videoDescription', 'platform', 'releaseYear'];

        // Build the update expression dynamically
        let updateExpression = 'SET';
        const expressionAttributeNames: Record<string, string> = {};
        const expressionAttributeValues: Record<string, any> = {};

        updatableFields.forEach((field, index) => {
            if (field in videoMetadata) {
                const prefix = index === 0 ? ' ' : ', ';
                updateExpression += `${prefix}#${field} = :${field}`;
                expressionAttributeNames[`#${field}`] = field;
                expressionAttributeValues[`:${field}`] = videoMetadata[field];
            }
        });

        if (Object.keys(expressionAttributeValues).length === 0) {
            throw new BadRequestException('No valid fields to update');
        }

        const params: DynamoDB.DocumentClient.UpdateItemInput = {
            TableName: 'video_share_videos',
            Key: { videoId },
            UpdateExpression: updateExpression,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW',
        };

        try {
            const result = await this.dynamoDbClient.update(params).promise();
            console.log('✅ Video metadata updated:', result.Attributes);
            return result.Attributes;
        } catch (err) {
            console.error('❌ Failed to update video metadata:', err);
            throw new BadRequestException('Failed to update video metadata');
        }
    }


}
