import { IsBoolean, IsIn, IsString } from "class-validator";

export class VideoActionDto {
    @IsIn(['download', 'upload'])
    action: string

    @IsString()
    key: string

    // @IsString()
    // uploaderId: string

    @IsBoolean()
    @IsString()
    contentType?: string

    @IsString()
    videoTitle: string
}