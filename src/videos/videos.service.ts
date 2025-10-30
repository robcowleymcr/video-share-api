import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { BadRequestException, Injectable } from "@nestjs/common";
import { VideoActionDto } from "./dto/video-action.dto";
import { VideoResponse } from "./interfaces/video-response.interface";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

@Injectable()
export class VideosService {
    private s3 = new S3Client({ region: 'eu-west-2' });
    private readonly BUCKET_NAME = 'video-share-uploads';

    async handleVideoAction(dto: VideoActionDto): Promise<VideoResponse> {
        const { action, name, contentType } = dto;
        const expiresIn = 3600;

        let command;

        if (action === 'upload') {
            command = new PutObjectCommand({
                Bucket: this.BUCKET_NAME,
                Key: name,
                ContentType: contentType
            })
        } else if (action === 'download') {
            command = new GetObjectCommand({
                Bucket: this.BUCKET_NAME,
                Key: name
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
