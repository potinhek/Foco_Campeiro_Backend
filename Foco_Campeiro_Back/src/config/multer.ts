// src/config/multer.ts
import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";

// Garante que a pasta existe (opcional, ou crie a pasta 'uploads' na raiz manualmente)
const uploadFolder = path.resolve(__dirname, "..", "..", "uploads");

export const multerConfig = multer({
  storage: multer.diskStorage({
    destination: uploadFolder,
    filename: (req, file, callback) => {
      // Gera um nome único para não sobrescrever arquivos com mesmo nome
      const fileHash = randomUUID();
      const fileName = `${fileHash}-${file.originalname}`;
      return callback(null, fileName);
    },
  }),
  // Filtro para aceitar apenas imagens
  fileFilter: (req, file, callback) => {
    const allowedMimes = ["image/jpeg", "image/pjpeg", "image/png", "image/gif"];
    if (allowedMimes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new Error("Formato de arquivo inválido."));
    }
  },
});