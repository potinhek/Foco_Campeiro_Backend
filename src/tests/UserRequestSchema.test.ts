import { ZodError } from "zod";
import {
  CreateUserRequestSchema,
  UpdateUserRequestSchema,
} from "../controllers/schemas/UserRequestSchema";

const validCreate = {
  name: "Vinícius",
  email: "vini@mail.com",
  cpf: "12345678901",
  phone: "47999999999",
  password: "123456",
  role: "client" as const,
};

describe("CreateUserRequestSchema", () => {
  test("aceita payload válido", () => {
    const parsed = CreateUserRequestSchema.parse(validCreate);
    expect(parsed).toEqual(validCreate);
  });

  test("rejeita nome vazio ou muito curto", () => {
    expect(() =>
      CreateUserRequestSchema.parse({ ...validCreate, name: "" })
    ).toThrow(ZodError);

    expect(() =>
      CreateUserRequestSchema.parse({ ...validCreate, name: "ab" }) // < 3
    ).toThrow(ZodError);
  });

  test("rejeita email inválido", () => {
    expect(() =>
      CreateUserRequestSchema.parse({ ...validCreate, email: "invalido" })
    ).toThrow(ZodError);
  });

  test("rejeita cpf com formato inválido", () => {
    expect(() =>
      CreateUserRequestSchema.parse({ ...validCreate, cpf: "123" })
    ).toThrow(ZodError);

    // 11 dígitos mas com letra
    expect(() =>
      CreateUserRequestSchema.parse({ ...validCreate, cpf: "1234567890a" })
    ).toThrow(ZodError);
  });

  test("rejeita phone inválido (não 10-11 dígitos)", () => {
    expect(() =>
      CreateUserRequestSchema.parse({ ...validCreate, phone: "123" })
    ).toThrow(ZodError);

    expect(() =>
      CreateUserRequestSchema.parse({ ...validCreate, phone: "abcdefghijk" })
    ).toThrow(ZodError);
  });

  test("rejeita password curto (< 6)", () => {
    expect(() =>
      CreateUserRequestSchema.parse({ ...validCreate, password: "12345" })
    ).toThrow(ZodError);
  });

  test("rejeita role diferente de 'admin' ou 'client'", () => {
    expect(() =>
      CreateUserRequestSchema.parse({ ...validCreate, role: "user" })
    ).toThrow(ZodError);
  });

  test("trim funciona (nome com espaços vira vazio e falha nonempty)", () => {
    expect(() =>
      CreateUserRequestSchema.parse({ ...validCreate, name: "   " })
    ).toThrow(ZodError);
  });
});

describe("UpdateUserRequestSchema", () => {
  test("aceita objeto vazio (todos opcionais)", () => {
    const parsed = UpdateUserRequestSchema.parse({});
    expect(parsed).toEqual({});
  });

  test("aceita atualização parcial (nome)", () => {
    const parsed = UpdateUserRequestSchema.parse({ name: "Novo Nome" });
    expect(parsed).toEqual({ name: "Novo Nome" });
  });

  test("rejeita nome curto", () => {
    expect(() =>
      UpdateUserRequestSchema.parse({ name: "ab" })
    ).toThrow(ZodError);
  });

  test("valida email quando presente", () => {
    const ok = UpdateUserRequestSchema.parse({ email: "ok@mail.com" });
    expect(ok.email).toBe("ok@mail.com");

    expect(() =>
      UpdateUserRequestSchema.parse({ email: "ruim" })
    ).toThrow(ZodError);
  });

  test("valida cpf quando presente (11 dígitos)", () => {
    const ok = UpdateUserRequestSchema.parse({ cpf: "12345678901" });
    expect(ok.cpf).toBe("12345678901");

    expect(() =>
      UpdateUserRequestSchema.parse({ cpf: "123" })
    ).toThrow(ZodError);
  });

  test("valida phone quando presente (10-11 dígitos)", () => {
    const ok = UpdateUserRequestSchema.parse({ phone: "4799999999" });
    expect(ok.phone).toBe("4799999999");

    expect(() =>
      UpdateUserRequestSchema.parse({ phone: "abc" })
    ).toThrow(ZodError);
  });

  test("valida password quando presente (>= 6)", () => {
    const ok = UpdateUserRequestSchema.parse({ password: "123456" });
    expect(ok.password).toBe("123456");

    expect(() =>
      UpdateUserRequestSchema.parse({ password: "12345" })
    ).toThrow(ZodError);
  });

  test("valida role quando presente ('admin'|'client')", () => {
    const ok = UpdateUserRequestSchema.parse({ role: "admin" });
    expect(ok.role).toBe("admin");

    expect(() =>
      UpdateUserRequestSchema.parse({ role: "user" })
    ).toThrow(ZodError);
  });
});
