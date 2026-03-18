import { Request, Response } from "express";
import { R2Service } from "../services/R2Service";

const r2Service = new R2Service();

export class UploadController {
  async getPreSignedUrl(req: Request, res: Response) {
    try {
      const { fileName, fileType } = req.body;

      if (!fileName || !fileType) {
        return res.status(400).json({ error: "Nome e tipo do arquivo são obrigatórios" });
      }

      const urlData = await r2Service.generateUploadUrl(fileName, fileType);
      
      return res.json(urlData);
    } catch (error) {
      console.error("Erro ao gerar URL do R2:", error);
      return res.status(500).json({ error: "Erro interno ao gerar permissão de upload" });
    }
  }
}