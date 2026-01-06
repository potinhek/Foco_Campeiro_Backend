// src/services/StorageService.ts
import fs from 'fs';
import path from 'path';

export const storageService = {
    // Hoje: Devolve apenas o caminho relativo onde o Multer salvou
    // Futuro: Aqui você enviaria para o S3 e devolveria a URL pública
    handleUpload(file: Express.Multer.File): string {
        // Simula a URL que seria salva no banco
        // Em produção, isso seria algo como: https://meu-bucket.s3.amazonaws.com/...
        return `/uploads/${file.filename}`;
    },

    // Método para deletar (útil para limpar arquivos antigos)
    deleteFile(filePath: string) {
        const localPath = path.resolve(__dirname, '..', '..', 'uploads', path.basename(filePath));
        if (fs.existsSync(localPath)) {
            fs.unlinkSync(localPath);
        }
    }
};