import { Handler } from "express";
import { prisma } from "../database";
import { HttpError } from "../errors/HttpsError";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const CreatePhotoSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  eventId: z.coerce.number(),
  price: z.coerce.number().nonnegative(),
  filePathOriginal: z.string().max(500).optional(),
  filePathWatermark: z.string().max(500).optional(),
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

  create: Handler = async (req, res, next) => {
    try {
      const data = CreatePhotoSchema.parse(req.body);

      const ev = await prisma.events.findUnique({ where: { id: data.eventId } });
      if (!ev) throw new HttpError(404, "Evento não encontrado");

      const created = await prisma.photos.create({
        data: {
          ...data,
          price: new Prisma.Decimal(data.price),
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

  delete: Handler = async (req, res, next) => {
    try {
      const id = z.coerce.number().parse(req.params.id);
      await prisma.photos.delete({ where: { id } });
      res.status(204).send();
    } catch (err) { next(err); }
  };
}
