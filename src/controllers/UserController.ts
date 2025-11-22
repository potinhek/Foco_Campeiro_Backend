import { Handler } from "express";
import { prisma } from "../database";
import { CreateUserRequestSchema, UpdateUserRequestSchema } from "./schemas/UserRequestSchema";
import { UserRole } from "@prisma/client";
import { HttpError } from "../errors/HttpsError";
import bcrypt from "bcryptjs";

function toPublicUser(u: any) {
    // Remova qualquer campo sensível
    const { passwordHash, password, ...rest } = u;
    return rest;
}


export class UserController {
    index: Handler = async (req, res, next) => {
        try {
            const user = await prisma.users.findMany()
            res.json(user.map(toPublicUser))
        } catch (error) {
            next(error)
        }
    }
    create: Handler = async (req, res, next) => {
        try {
            const validatedData = CreateUserRequestSchema.parse(req.body)

            const passwordHash = await bcrypt.hash(validatedData.password, 10);

            const dataForPrisma = {
                ...validatedData,
                password: passwordHash,
                role: validatedData.role as UserRole,
            };

            const newUser = await prisma.users.create({
                data: dataForPrisma
            })

            res.status(201).json(toPublicUser(newUser))
        } catch (error: any) {
            if (error?.code === "P2002" && error?.meta?.target?.includes("email")) {
                return next(new HttpError(409, "E-mail já cadastrado"));
            }
            next(error)
        }
    }
    read: Handler = async (req, res, next) => {
        try {
            const user = await prisma.users.findUnique({
                where: { id: String(req.params.id) }
            })
            if (!user) throw new HttpError(404, "Usuário não encontrado")
            res.json(toPublicUser(user))
        } catch (error) {
            next(error)
        }
    }
    update: Handler = async (req, res, next) => {
        try {
            const id = String(req.params.id);

            // --- autorização: admin pode tudo; usuário só a si mesmo
            const auth = req.user as { id: string; role: UserRole } | undefined;
            if (!auth) throw new HttpError(401, "Não autenticado");

            const isAdmin = auth.role === "admin";
            const isSelf = auth.id === id;
            if (!isAdmin && !isSelf) {
                throw new HttpError(403, "Você não pode alterar outro usuário");
            }

            // --- valida entrada
            const input = UpdateUserRequestSchema.parse(req.body);

            // --- garante que o usuário existe
            const userExists = await prisma.users.findUnique({ where: { id } });
            if (!userExists) throw new HttpError(404, "Usuário não encontrado");

            // --- monta o payload permitidos (role só se admin)
            const data: any = {
                name: input.name ?? undefined,
                email: input.email ?? undefined,
                cpf: input.cpf ?? undefined,
                phone: input.phone ?? undefined,
                updatedAt: new Date(),
            };

            if (input.password) {
                data.password = await bcrypt.hash(input.password, 10);
            }

            if (isAdmin && input.role) {
                data.role = input.role as UserRole;
            }
            // se não for admin, ignoramos qualquer "role" que venha no body

            const updatedUser = await prisma.users.update({
                where: { id },
                data,
            });

            res.status(200).json(toPublicUser(updatedUser));
        } catch (error: any) {
            if (error?.code === "P2002" && error?.meta?.target?.includes("email")) {
                return next(new HttpError(409, "E-mail já cadastrado"));
            }
            next(error);
        }
    };

    delete: Handler = async (req, res, next) => {
        try {
            const result = await prisma.users.delete({
                where: { id: String(req.params.id) }
            })
            res.status(204).json({ message: "Usuário deletado com sucesso" })
        } catch (error) {
            next(error)
        }
    }
}