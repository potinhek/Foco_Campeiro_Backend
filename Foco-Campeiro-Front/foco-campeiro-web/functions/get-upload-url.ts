 import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// 1. Tipagem das nossas Variáveis de Ambiente da Cloudflare
export interface Env {
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  VITE_R2_BUCKET_NAME: string;
}

// 2. Tipagem para o corpo da requisição
interface UploadRequest {
  filename: string;
  fileType: string;
}

// 3. A Função com as tipagens
export async function onRequestPost(context: { request: Request; env: Env }) {
  try {
    // Lendo o que o Frontend enviou com a tipagem correta
    const body = (await context.request.json()) as UploadRequest;
    const { filename, fileType } = body;

    // Configuramos o S3Client garantindo que o TypeScript sabe que as variáveis existem
    const S3 = new S3Client({
      region: "auto",
      endpoint: `https://${context.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      forcePathStyle: true, // Necessário para a compatibilidade com R2
      credentials: {
        accessKeyId: context.env.R2_ACCESS_KEY_ID,
        secretAccessKey: context.env.R2_SECRET_ACCESS_KEY,
      },
    });

    const command = new PutObjectCommand({
      Bucket: context.env.VITE_R2_BUCKET_NAME,
      Key: filename,
      ContentType: fileType,
    });

    // Geramos o link temporário (válido por 1 hora = 3600 segundos)
    const signedUrl = await getSignedUrl(S3, command, { expiresIn: 3600 });

    return new Response(JSON.stringify({ url: signedUrl }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}