import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
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


    async handleVideoAction(dto: VideoActionDto, uploaderId: string): Promise<VideoResponse> {
        const { action, key, contentType } = dto;
        const expiresIn = 3600;

        let command;

        if (action === 'upload') {
            command = new PutObjectCommand({
                Bucket: this.BUCKET_NAME,
                Key: key,
                ContentType: contentType
            })

            const videoId = uuid();

            console.log(`>>>>> videoId: ${videoId} ${typeof videoId}`);

            // TODO create new VideoMetadata entity
            const metadataObject = new VideoMetadata(
                videoId, 
                uploaderId,
                key,
                undefined,
                dto.contentType,
                VideoStatus.PENDING
            );

            console.log(`>>>>> data: ${JSON.stringify(metadataObject)}`);
            
            // TODO save to DynamoDB with status = "UPLOADING"
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

}
