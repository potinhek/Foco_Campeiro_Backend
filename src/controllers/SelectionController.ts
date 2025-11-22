import { Handler } from "express";
import { prisma } from "../database";
import { HttpError } from "../errors/HttpsError";
import { SelectionStatus } from "@prisma/client";
import { z } from "zod";

const CreateSelectionSchema = z.object({
  userId: z.string().uuid(),
  status: z.nativeEnum(SelectionStatus).optional(), // default é pending no schema
});

const UpdateSelectionSchema = CreateSelectionSchema.partial();

const AddItemSchema = z.object({
  photoId: z.coerce.number(),
});

export class SelectionController {
  // GET /api/selections
  index: Handler = async (req, res, next) => {
    try {
      // 🔒 cliente sem ?userId= NÃO pode listar tudo (teste espera 403/401)
      if (req.user?.role === "client" && !req.query.userId) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const userId = req.query.userId
        ? z.string().uuid().parse(String(req.query.userId))
        : undefined;

      const selections = await prisma.selections.findMany({
        where: userId ? { userId } : undefined,
        orderBy: { createdAt: "desc" },
      });
      res.json(selections);
    } catch (err) {
      next(err);
    }
  };

  // POST /api/selections
  create: Handler = async (req, res, next) => {
    try {
      const data = CreateSelectionSchema.parse(req.body);

      const user = await prisma.users.findUnique({ where: { id: data.userId } });
      if (!user) throw new HttpError(404, "Usuário não encontrado");

      const created = await prisma.selections.create({ data });
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  };

  // GET /api/selections/:id
  read: Handler = async (req, res, next) => {
    try {
      const id = z.coerce.number().parse(req.params.id);
      const selection = await prisma.selections.findUnique({ where: { id } });
      if (!selection) throw new HttpError(404, "Seleção não encontrada");
      res.json(selection);
    } catch (err) {
      next(err);
    }
  };

  // PUT /api/selections/:id
  update: Handler = async (req, res, next) => {
    try {
      const id = z.coerce.number().parse(req.params.id);
      const patch = UpdateSelectionSchema.parse(req.body);

      const exists = await prisma.selections.findUnique({ where: { id } });
      if (!exists) throw new HttpError(404, "Seleção não encontrada");

      if (patch.userId) {
        const user = await prisma.users.findUnique({ where: { id: patch.userId } });
        if (!user) throw new HttpError(404, "Usuário não encontrado");
      }

      const updated = await prisma.selections.update({ where: { id }, data: patch });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  };

  // DELETE /api/selections/:id
  delete: Handler = async (req, res, next) => {
    try {
      const id = z.coerce.number().parse(req.params.id);
      await prisma.selectionItems.deleteMany({ where: { selectionId: id } });
      await prisma.selections.delete({ where: { id } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  // ---------- Itens ----------
  // GET /api/selections/:id/items
  listItems: Handler = async (req, res, next) => {
    try {
      const selectionId = z.coerce.number().parse(req.params.id);

      const selection = await prisma.selections.findUnique({ where: { id: selectionId } });
      if (!selection) throw new HttpError(404, "Seleção não encontrada");

      const items = await prisma.selectionItems.findMany({
        where: { selectionId },
        include: { photo: true },
        orderBy: { createdAt: "desc" },
      });
      res.json(items);
    } catch (err) {
      next(err);
    }
  };

  // POST /api/selections/:id/items
  addItem: Handler = async (req, res, next) => {
    try {
      const selectionId = z.coerce.number().parse(req.params.id);
      const { photoId } = AddItemSchema.parse(req.body);

      const selection = await prisma.selections.findUnique({ where: { id: selectionId } });
      if (!selection) throw new HttpError(404, "Seleção não encontrada");

      const photo = await prisma.photos.findUnique({ where: { id: photoId } });
      if (!photo) throw new HttpError(404, "Foto não encontrada");

      const already = await prisma.selectionItems.findFirst({ where: { selectionId, photoId } });
      if (already) return res.status(200).json(already);

      const created = await prisma.selectionItems.create({
        data: { selectionId, photoId },
      });
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  };

  // DELETE /api/selections/:id/items/:itemId
  removeItem: Handler = async (req, res, next) => {
    try {
      const selectionId = z.coerce.number().parse(req.params.id);
      const itemId = z.coerce.number().parse(req.params.itemId);

      const item = await prisma.selectionItems.findUnique({ where: { id: itemId } });
      if (!item || item.selectionId !== selectionId) {
        throw new HttpError(404, "Item não encontrado na seleção");
      }

      await prisma.selectionItems.delete({ where: { id: itemId } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}
