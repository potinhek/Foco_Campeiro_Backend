import { Handler } from "express";
import { prisma } from "../database";
import { HttpError } from "../errors/HttpsError";
import { PaymentStatus, Prisma } from "@prisma/client";
import { z } from "zod";

const CreateOrderSchema = z.object({
  userId: z.string().uuid(),
  selectionId: z.coerce.number(),
  totalAmount: z.coerce.number().nonnegative().optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
});

const UpdateOrderSchema = z.object({
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
}).strict();

async function sumSelectionTotal(selectionId: number): Promise<Prisma.Decimal> {
  const items = await prisma.selectionItems.findMany({
    where: { selectionId },
    include: { photo: true },
  });
  const total = items.reduce((acc, it) => acc + Number(it.photo?.price ?? 0), 0);
  return new Prisma.Decimal(total);
}

export class OrderController {
  // GET /api/orders
  index: Handler = async (req, res, next) => {
    try {
      const where: any = {};

      if (req.query.userId) {
        where.userId = z.string().uuid().parse(String(req.query.userId));
      }

      // 🔒 cliente SEMPRE só vê os próprios pedidos
      if (req.user?.role === "client") {
        where.userId = req.user.id;
      }

      const orders = await prisma.orders.findMany({
        where: Object.keys(where).length ? where : undefined,
        orderBy: { createdAt: "desc" },
      });

      res.json(orders);
    } catch (err) { next(err); }
  };

  // POST /api/orders
  create: Handler = async (req, res, next) => {
    try {
      const data = CreateOrderSchema.parse(req.body);

      const user = await prisma.users.findUnique({ where: { id: data.userId } });
      if (!user) throw new HttpError(404, "Usuário não encontrado");

      const selection = await prisma.selections.findUnique({ where: { id: data.selectionId } });
      if (!selection) throw new HttpError(404, "Seleção não encontrado");

      // 🔒 só exige pertencer quando quem está criando é CLIENTE
      if (req.user?.role === "client" && selection.userId !== data.userId) {
        throw new HttpError(403, "Seleção não pertence ao usuário");
      }

      const total = data.totalAmount !== undefined
        ? new Prisma.Decimal(data.totalAmount)
        : await sumSelectionTotal(data.selectionId);

      const created = await prisma.orders.create({
        data: {
          userId: data.userId,
          selectionId: data.selectionId,
          totalAmount: total,
          paymentStatus: data.paymentStatus ?? PaymentStatus.pending,
        },
      });

      res.status(201).json(created);
    } catch (err) { next(err); }
  };

  // GET /api/orders/:id
  read: Handler = async (req, res, next) => {
    try {
      const id = z.coerce.number().parse(req.params.id);
      const order = await prisma.orders.findUnique({ where: { id } });
      if (!order) throw new HttpError(404, "Pedido não encontrado");
      res.json(order);
    } catch (err) { next(err); }
  };

  // PUT /api/orders/:id
  update: Handler = async (req, res, next) => {
    try {
      const id = z.coerce.number().parse(req.params.id);
      const patch = UpdateOrderSchema.parse(req.body);

      const exists = await prisma.orders.findUnique({ where: { id } });
      if (!exists) throw new HttpError(404, "Pedido não encontrado");

      const updated = await prisma.orders.update({ where: { id }, data: patch });
      res.json(updated);
    } catch (err) { next(err); }
  };

  // DELETE /api/orders/:id
  delete: Handler = async (req, res, next) => {
    try {
      const id = z.coerce.number().parse(req.params.id);
      await prisma.orders.delete({ where: { id } });
      res.status(204).send();
    } catch (err) { next(err); }
  };
}
