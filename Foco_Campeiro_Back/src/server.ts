import "dotenv/config"; // ⚠️ SEMPRE A PRIMEIRA LINHA!
import cors from 'cors'
import express from 'express'
import path from 'path'
import { router } from './router'
import { errorHandlerMiddleware } from './middlewares/erro-handler'
import cookieParser from "cookie-parser";
import { requestContext } from "./middlewares/requestContext";
import { auditHttp } from "./middlewares/auditHttp";

const app = express()

app.use(cookieParser());

// 🛡️ CORS BLINDADO PARA PRODUÇÃO
app.use(cors({
  origin: [
    'http://localhost:5173', // Porta padrão do Vite (Front-end local)
    'http://localhost:3000', // Caso seu front rode na 3000
    'https://vasion.com.br', // Seu site oficial!
    'https://www.vasion.com.br'
  ],
  credentials: true // Permite que os cookies de login passem
}))

app.use(express.json())
app.use("/uploads", express.static(path.resolve(__dirname, "..", "uploads")));
app.use(requestContext);
app.use(auditHttp);

// AQUI ESTAVA O SEGUNDO MISTÉRIO! O prefixo /api que achamos no Insomnia!
app.use("/api", router) 

app.use(errorHandlerMiddleware)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Servidor iniciado em http://localhost:${PORT}`))

export { app }