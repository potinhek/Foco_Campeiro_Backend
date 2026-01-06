// src/tests/PhotoUpload.test.ts
import request from "supertest";
import { makeApp } from "./helpers/app";
import { prisma } from "../database";
import { storageService } from "../services/StorageService";

// 1. Mock do Banco de Dados
jest.mock("../database", () => require("./mocks/prisma"));

// 2. Mock do Serviço de Storage
// Isso impede que o teste tente salvar arquivos reais ou dependa de pastas
jest.mock("../services/StorageService", () => ({
  storageService: {
    // Quando o controller chamar handleUpload, retornamos um caminho fixo
    handleUpload: jest.fn().mockReturnValue("/uploads/mocked-file.jpg"),
    deleteFile: jest.fn(),
  },
}));

// Cria o app simulando um usuário ADMIN logado
const app = makeApp({
  user: { id: "admin-uuid", role: "admin" },
});

describe("Photo Upload & Management", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reinicia os mocks do prisma antes de cada teste
    (prisma as any).events = { findUnique: jest.fn() };
    (prisma as any).photos = { create: jest.fn(), delete: jest.fn(), findUnique: jest.fn() };
  });

  it("POST /api/photos -> Sucesso (201) com arquivo e dados válidos", async () => {
    // Cenário: O evento ID 1 existe
    (prisma as any).events.findUnique.mockResolvedValueOnce({ id: 1 });
    
    // Cenário: O banco confirma a criação
    (prisma as any).photos.create.mockResolvedValueOnce({
      id: 100,
      eventId: 1,
      filePathOriginal: "/uploads/mocked-file.jpg",
    });

    // Ação: Enviar requisição multipart (simulando um formulário com arquivo)
    const res = await request(app)
      .post("/api/photos")
      // Campos de texto (vêm no req.body)
      .field("eventId", 1)
      .field("price", 15.90)
      .field("name", "Foto do Casamento")
      // Arquivo (vem no req.file) - Criamos uma imagem falsa em memória
      .attach("file", Buffer.from("conteudo-fake-da-imagem"), "teste.jpg");

    // Asserções (O que esperamos que aconteça)
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(100);

    // Verifica se o controller chamou nosso serviço de storage
    expect(storageService.handleUpload).toHaveBeenCalled();

    // Verifica se o controller salvou no banco com o caminho que o serviço devolveu
    expect((prisma as any).photos.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventId: 1,
          filePathOriginal: "/uploads/mocked-file.jpg", // O caminho mockado
          filePathWatermark: "/uploads/mocked-file.jpg",
        }),
      })
    );
  });

  it("POST /api/photos -> Erro 400 se não enviar arquivo", async () => {
    const res = await request(app)
      .post("/api/photos")
      .field("eventId", 1)
      .field("price", 10);

    // Deve falhar porque o req.file estará vazio
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/arquivo/i);
  });

  it("DELETE /api/photos/:id -> Sucesso (204) e apaga arquivo físico", async () => {
    // Cenário: A foto existe e tem um caminho salvo
    (prisma as any).photos.findUnique.mockResolvedValueOnce({
      id: 50,
      filePathOriginal: "/uploads/foto-antiga.jpg"
    });
    (prisma as any).photos.delete.mockResolvedValueOnce({});

    const res = await request(app).delete("/api/photos/50");

    expect(res.status).toBe(204);
    
    // Verifica se o método de deletar arquivo foi chamado com o caminho certo
    expect(storageService.deleteFile).toHaveBeenCalledWith("/uploads/foto-antiga.jpg");
  });
});