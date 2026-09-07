import { Injectable } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

const SIGNED_URL_EXPIRES_SECONDS = 60 * 60; // 1 hora

// Wrapper generico sobre cualquier storage S3-compatible: AWS real (dejar
// S3_ENDPOINT vacio) o self-hosted como MinIO (S3_ENDPOINT +
// S3_FORCE_PATH_STYLE=true). El bucket es PRIVADO (sin policy de lectura
// publica): la unica forma de leer un objeto es con una URL firmada de
// corta duracion generada por este servicio, nunca con una URL fija
// permanente. Ver README.md para como levantar MinIO local con
// docker-compose.
@Injectable()
export class StorageService {
  private readonly client: S3Client;
  // Cliente separado solo para FIRMAR urls de lectura. El host que queda
  // firmado tiene que ser el que el CELULAR puede alcanzar (la IP LAN del
  // servidor) -- "localhost" en S3_ENDPOINT es correcto para que el
  // backend hable con MinIO en la misma maquina, pero para el celular
  // "localhost" apunta al propio celular. Mismo error de raiz que ya se
  // vio con S3_PUBLIC_BASE_URL/EXPO_PUBLIC_API_URL: el host de una URL
  // firmada no se puede cambiar despues sin invalidar la firma (el host
  // es parte de lo firmado), asi que hay que firmar directo con el host
  // correcto.
  private readonly publicClient: S3Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET ?? 'chosica-photos';
    const common = {
      region: process.env.S3_REGION ?? 'us-east-1',
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
      },
    };
    this.client = new S3Client({
      ...common,
      endpoint: process.env.S3_ENDPOINT || undefined,
    });
    this.publicClient = new S3Client({
      ...common,
      endpoint:
        process.env.S3_PUBLIC_ENDPOINT || process.env.S3_ENDPOINT || undefined,
    });
  }

  // Devuelve solo la key (ruta dentro del bucket) -- eso es lo que se
  // guarda en Photo.key, nunca una URL fija.
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
    return key;
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  getSignedUrl(key: string): Promise<string> {
    return getSignedUrl(
      this.publicClient,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: SIGNED_URL_EXPIRES_SECONDS },
    );
  }

  // Reemplaza "key" por una URL firmada en cada foto de la lista, para la
  // respuesta al cliente (que nunca debe ver la key cruda). Se usa en
  // todos lados donde se devuelven fotos: posts, businesses, products.
  async signPhotos<T extends { key: string }>(
    photos: T[],
  ): Promise<(Omit<T, 'key'> & { url: string })[]> {
    return Promise.all(
      photos.map(async ({ key, ...rest }) => ({
        ...rest,
        url: await this.getSignedUrl(key),
      })),
    );
  }
}
