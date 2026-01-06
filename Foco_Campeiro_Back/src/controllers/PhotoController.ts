import { Handler } from "express";
import { prisma } from "../database";
import { HttpError } from "../errors/HttpsError";
import { Prisma } from "@prisma/client";
import { z } from "zod";
// Importamos o serviço que criamos para lidar com o arquivo físico
import { storageService } from "../services/StorageService";

// Schema atualizado: Removemos filePathOriginal/Watermark pois não vêm mais pelo JSON
const CreatePhotoSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  eventId: z.coerce.number(), // 'coerce' converte a string do form-data para número
  price: z.coerce.number().nonnegative(),
});

const UpdatePhotoSchema = CreatePhotoSchema.partial();

export class PhotoController {
  index: Handler = async (req, res, next) => {
    try {
      const eventId = req.query.eventId ? z.coerce.number().parse(req.query.eventId) : undefined;
      const photos = await prisma.photos.findMany({
        where: eventId ? { eventId } : undefined,
        orderBy: { createdAt: "desc" },
      });
      res.json(photos);
    } catch (err) { next(err); }
  };

  // --- MÉTODO CREATE ATUALIZADO ---
  create: Handler = async (req, res, next) => {
    try {
      // 1. Validação do Arquivo (O middleware Multer coloca o arquivo em req.file)
      if (!req.file) {
        throw new HttpError(400, "Nenhum arquivo de imagem foi enviado.");
      }

      // 2. Validação dos Campos de Texto (req.body)
      // O Multer processa o body, mas tudo vem como texto. O z.coerce cuida da conversão.
      const data = CreatePhotoSchema.parse(req.body);

      // 3. Verificar se o evento existe
      const ev = await prisma.events.findUnique({ where: { id: data.eventId } });
      if (!ev) throw new HttpError(404, "Evento não encontrado");

      // 4. Salvar o arquivo físico (Abstração)
      // O serviço salva no disco e retorna o caminho (ex: /uploads/hash-foto.jpg)
      const savedPath = storageService.handleUpload(req.file);

      // 5. Criar o registro no banco com o caminho do arquivo
      const created = await prisma.photos.create({
        data: {
          name: data.name,
          description: data.description,
          eventId: data.eventId,
          price: new Prisma.Decimal(data.price),
          // Salvamos o caminho gerado pelo serviço
          filePathOriginal: savedPath,
          // Por enquanto, salvamos o mesmo caminho para watermark
          // (Quando tiver o App Desktop, ele mandará 2 arquivos e mudaremos isso)
          filePathWatermark: savedPath, 
        },
      });
      res.status(201).json(created);
    } catch (err) { next(err); }
  };

  read: Handler = async (req, res, next) => {
    try {
      const id = z.coerce.number().parse(req.params.id);
      const photo = await prisma.photos.findUnique({ where: { id } });
      if (!photo) throw new HttpError(404, "Foto não encontrada");
      res.json(photo);
    } catch (err) { next(err); }
  };

  update: Handler = async (req, res, next) => {
    try {
      const id = z.coerce.number().parse(req.params.id);
      const patch = UpdatePhotoSchema.parse(req.body);

      const exists = await prisma.photos.findUnique({ where: { id } });
      if (!exists) throw new HttpError(404, "Foto não encontrada");

      if (patch.eventId) {
        const ev = await prisma.events.findUnique({ where: { id: patch.eventId } });
        if (!ev) throw new HttpError(404, "Evento não encontrado");
      }

      const updated = await prisma.photos.update({
        where: { id },
        data: {
          ...patch,
          price: patch.price !== undefined ? new Prisma.Decimal(patch.price) : undefined,
        },
      });
      res.json(updated);
    } catch (err) { next(err); }
  };

  // --- MÉTODO DELETE ATUALIZADO ---
  delete: Handler = async (req, res, next) => {
    try {
      const id = z.coerce.number().parse(req.params.id);
      
      // 1. Buscar a foto antes de deletar para saber o caminho do arquivo
      const photo = await prisma.photos.findUnique({ where: { id } });
      if (!photo) throw new HttpError(404, "Foto não encontrada");

      // 2. Deletar do Banco de Dados
      await prisma.photos.delete({ where: { id } });

      // 3. Deletar o arquivo físico da pasta (limpeza)
      if (photo.filePathOriginal) {
        storageService.deleteFile(photo.filePathOriginal);
      }
      
      res.status(204).send();
    } catch (err) { next(err); }
  };
}