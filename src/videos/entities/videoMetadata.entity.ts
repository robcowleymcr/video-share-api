export class VideoMetadata {
    videoId: string;
    uploaderId: string;
    key: string;
    title: string;
    contentType?: string;
    uploadDate: string;
    status: string;
    uploaderName: string;
    videoDescription: string;
    releaseYear: number;
    platform: string

    constructor(
        videoId: string,
        uploaderId: string,
        uploaderName: string,
        key: string,
        title: string,
        contentType: string,
        status: string,
        videoDescription: string,
        releaseYear: number,
        platform:string) {
            this.videoId = videoId;
            this.uploaderId = uploaderId;
            this.uploaderName = uploaderName;
            this.key = key;
            this.title = title || key;
            this.contentType = contentType;
            this.uploadDate = new Date().toISOString();
            this.status = status || 'pending';
            this.videoDescription = videoDescription;
            this.releaseYear = releaseYear;
            this.platform = platform;
        }

    // convert object to DynamoDB compatible item
    toDynamoDBItem() {
        return {
            videoId: { S: this.videoId },
            uploaderId: { S: this.uploaderId },
            uploaderName: { S: this.uploaderName },
            key: { S: this.key },
            title: { S: this.title },
            contentType: { S: this.contentType },
            uploadDate: { S: this.uploadDate },
            status: { S: this.status }
        };
    }
}