import { IsIn, IsNumber, IsOptional, IsString } from "class-validator";

export class VideoActionDto {
    @IsIn(['download', 'upload'])
    action: string

    @IsString()
    key: string

    @IsString()
    contentType: string

    @IsString()
    videoTitle: string

    @IsString()
    @IsOptional()
    videoDescription: string

    @IsNumber()
    releaseYear: string
}