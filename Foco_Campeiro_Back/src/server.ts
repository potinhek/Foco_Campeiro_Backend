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
app.use(cors())
app.use(express.json())
app.use("/uploads", express.static(path.resolve(__dirname, "..", "uploads")));
app.use(requestContext);
app.use(auditHttp);
app.use("/api", router)
app.use(errorHandlerMiddleware)


const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Servidor iniciado em http://localhost:${PORT}`))

export { app }