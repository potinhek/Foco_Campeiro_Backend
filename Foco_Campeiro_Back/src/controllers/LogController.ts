import { Handler } from "express";
import { prisma } from "../database";
import { HttpError } from "../errors/HttpsError";
import { z } from "zod";

const CreateLogSchema = z.object({
  logLevel: z.string().min(1),
  message: z.string().min(1),
  userId: z.string().uuid(),
  ipAddress: z.string().min(1),
});

export class LogController {
  index: Handler = async (req, res, next) => {
    try {
      const userId = req.query.userId ? z.string().uuid().parse(req.query.userId) : undefined;
      const level = req.query.level ? z.string().parse(req.query.level) : undefined;

      const logs = await prisma.logs.findMany({
        where: {
          userId: userId ?? undefined,
          logLevel: level ?? undefined,
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      res.json(logs);
    } catch (err) { next(err); }
  };

  create: Handler = async (req, res, next) => {
    try {
      const data = CreateLogSchema.parse(req.body);

      const user = await prisma.users.findUnique({ where: { id: data.userId } });
      if (!user) throw new HttpError(404, "Usuário do log não encontrado");

      const created = await prisma.logs.create({ data });
      res.status(201).json(created);
    } catch (err) { next(err); }
  };

  read: Handler = async (req, res, next) => {
    try {
      const id = z.coerce.number().parse(req.params.id);
      const log = await prisma.logs.findUnique({ where: { id } });
      if (!log) throw new HttpError(404, "Log não encontrado");
      res.json(log);
    } catch (err) { next(err); }
  };

  delete: Handler = async (req, res, next) => {
    try {
      const id = z.coerce.number().parse(req.params.id);
      await prisma.logs.delete({ where: { id } });
      res.status(204).send();
    } catch (err) { next(err); }
  };
}
