import { Handler } from "express";
import { prisma } from "../database";
import { HttpError } from "../errors/HttpsError";
import { z } from "zod";

const CreateEventSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  date: z.coerce.date().optional(),
  location: z.string().optional(),
  userId: z.string().uuid(),
});

const UpdateEventSchema = CreateEventSchema.partial();

export class EventController {
  index: Handler = async (_req, res, next) => {
    try {
      const events = await prisma.events.findMany({
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      });
      res.json(events);
    } catch (err) { next(err); }
  };

  create: Handler = async (req, res, next) => {
    try {
      const data = CreateEventSchema.parse(req.body);

      const user = await prisma.users.findUnique({ where: { id: data.userId } });
      if (!user) throw new HttpError(404, "Usuário do evento não encontrado");

      const created = await prisma.events.create({ data });
      res.status(201).json(created);
    } catch (err) { next(err); }
  };

  read: Handler = async (req, res, next) => {
    try {
      const id = z.coerce.number().parse(req.params.id);
      const event = await prisma.events.findUnique({ where: { id } });
      if (!event) throw new HttpError(404, "Evento não encontrado");
      res.json(event);
    } catch (err) { next(err); }
  };

  update: Handler = async (req, res, next) => {
    try {
      const id = z.coerce.number().parse(req.params.id);
      const patch = UpdateEventSchema.parse(req.body);

      const exists = await prisma.events.findUnique({ where: { id } });
      if (!exists) throw new HttpError(404, "Evento não encontrado");

      if (patch.userId) {
        const user = await prisma.users.findUnique({ where: { id: patch.userId } });
        if (!user) throw new HttpError(404, "Usuário do evento não encontrado");
      }

      const updated = await prisma.events.update({ where: { id }, data: patch });
      res.json(updated);
    } catch (err) { next(err); }
  };

  delete: Handler = async (req, res, next) => {
    try {
      const id = z.coerce.number().parse(req.params.id);
      await prisma.events.delete({ where: { id } });
      res.status(204).send();
    } catch (err) { next(err); }
  };
}
