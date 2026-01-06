import { z } from 'zod';

export const CreateUserRequestSchema = z.object({
    name: z
        .string()
        .trim()
        .nonempty('O nome é obrigatório.')
        .min(3, 'O nome deve ter no mínimo 3 caracteres.'),

    email: z
        .string()
        .trim()
        .nonempty('O e-mail é obrigatório.')
        .email('O formato do e-mail é inválido.'),

    cpf: z
        .string()
        .trim()
        .nonempty('O CPF é obrigatório.')
        .regex(/^\d{11}$/, 'O CPF deve conter exatamente 11 dígitos numéricos.'),

    phone: z
        .string()
        .trim()
        .nonempty('O telefone é obrigatório.')
        .regex(/^\d{10,11}$/, 'O telefone deve conter 10 ou 11 dígitos numéricos.'),

    password: z
        .string()
        .nonempty('A senha é obrigatória.')
        .min(6, 'A senha deve conter no mínimo 6 caracteres.'),

    role: z
        .string()
        .nonempty('O perfil de usuário é obrigatório.')
        .refine((value) => value === 'admin' || value === 'client', {
            message: 'O perfil de usuário deve ser "admin" ou "client".',
        }),
});

export const UpdateUserRequestSchema = z.object({
    name: z
        .string()
        .trim()
        .nonempty('O nome é obrigatório.')
        .min(3, 'O nome deve ter no mínimo 3 caracteres.')
        .optional(),

    email: z
        .string()
        .trim()
        .nonempty('O e-mail é obrigatório.')
        .email('O formato do e-mail é inválido.')
        .optional(),

    cpf: z
        .string()
        .trim()
        .nonempty('O CPF é obrigatório.')
        .regex(/^\d{11}$/, 'O CPF deve conter exatamente 11 dígitos numéricos.')
        .optional(),

    phone: z
        .string()
        .trim()
        .nonempty('O telefone é obrigatório.')
        .regex(/^\d{10,11}$/, 'O telefone deve conter 10 ou 11 dígitos numéricos.')
        .optional(),

    password: z
        .string()
        .nonempty('A senha é obrigatória.')
        .min(6, 'A senha deve conter no mínimo 6 caracteres.')
        .optional(),

    role: z
        .string()
        .nonempty('O perfil de usuário é obrigatório.')
        .refine((value) => value === 'admin' || value === 'client', {
            message: 'O perfil de usuário deve ser "admin" ou "client".',
        })
        .optional(),
});