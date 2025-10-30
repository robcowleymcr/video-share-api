import { IsBoolean, IsIn, IsString } from "class-validator";

export class VideoActionDto {
    @IsIn(['download', 'upload'])
    action: string

    @IsString()
    name: string

    @IsBoolean()
    @IsString()
    contentType?: string
}