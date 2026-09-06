import { Injectable } from '@nestjs/common';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

// Wrapper generico sobre cualquier storage S3-compatible: AWS real (dejar
// S3_ENDPOINT vacio) o self-hosted como MinIO (S3_ENDPOINT +
// S3_FORCE_PATH_STYLE=true). Asume que el bucket esta configurado como
// publico de lectura — no se generan URLs firmadas, se arma la URL publica
// directamente con S3_PUBLIC_BASE_URL. Ver README.md para como levantar
// MinIO local con docker-compose.
@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET ?? 'chosica-photos';
    this.publicBaseUrl = (process.env.S3_PUBLIC_BASE_URL ?? '').replace(
      /\/$/,
      '',
    );
    this.client = new S3Client({
      region: process.env.S3_REGION ?? 'us-east-1',
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
      },
    });
  }

  async upload(file: Express.Multer.File): Promise<string> {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const key = `${randomUUID()}-${safeName}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );
    return `${this.publicBaseUrl}/${key}`;
  }

  async delete(url: string): Promise<void> {
    const key = url.startsWith(`${this.publicBaseUrl}/`)
      ? url.slice(this.publicBaseUrl.length + 1)
      : url;
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
