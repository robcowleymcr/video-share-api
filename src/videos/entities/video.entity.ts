import {
  Column,
  Entity,
  PrimaryColumn,
} from 'typeorm';

@Entity({ name: 'videos' })
export class Video {
  @PrimaryColumn({ name: 'video_id', type: 'text' })
  videoId: string;

  @Column({ name: 'content_type', type: 'text', nullable: true })
  contentType: string | null;

  @Column({ name: 'key', type: 'text', nullable: true })
  key: string | null;

  @Column({ name: 'platform', type: 'text', nullable: true })
  platform: string | null;

  @Column({ name: 'release_year', type: 'int', nullable: true })
  releaseYear: number | null;

  @Column({ name: 'short_title', type: 'text', nullable: true })
  shortTitle: string | null;

  @Column({ name: 'status', type: 'text', nullable: true })
  status: string | null;

  @Column({ name: 'title', type: 'text', nullable: true })
  title: string | null;

  @Column({ name: 'upload_date', type: 'timestamptz', nullable: true })
  uploadDate: Date | null;

  @Column({ name: 'uploader_id', type: 'text', nullable: true })
  uploaderId: string | null;

  @Column({ name: 'uploader_name', type: 'text', nullable: true })
  uploaderName: string | null;

  @Column({ name: 'video_description', type: 'text', nullable: true })
  videoDescription: string | null;
}
