import { Router } from "express";
import { requireAuth, requireRole } from "./middlewares/auth";
import { AuthController } from "./controllers/AuthController";
import { EventController } from "./controllers/EventController";
import { LogController } from "./controllers/LogController";
import { OrderController } from "./controllers/OrderController";
import { PhotoController } from "./controllers/PhotoController";
import { SelectionController } from "./controllers/SelectionController";
import { UserController } from "./controllers/UserController";
// Importe a config do multer
import { multerConfig } from "./config/multer";

const router = Router();

const authController = new AuthController();
const eventController = new EventController();
const logController = new LogController();
const orderController = new OrderController();
const photoController = new PhotoController();
const selectionController = new SelectionController();
const userController = new UserController();

/* ===== Rotas públicas ===== */
router.post("/auth/register", authController.register);
router.post("/auth/login", authController.login);
router.post("/auth/refresh", authController.refresh);
router.post("/auth/logout", authController.logout);

/* ===== Rotas privadas ===== */

// Events
router.get("/events", requireAuth, eventController.index);
router.get("/events/:id", requireAuth, eventController.read);
router.post("/events", requireAuth, requireRole("admin"), eventController.create);
router.put("/events/:id", requireAuth, requireRole("admin"), eventController.update);
router.delete("/events/:id", requireAuth, requireRole("admin"), eventController.delete);

// Logs
router.get("/logs", requireAuth, requireRole("admin"), logController.index);
router.get("/logs/:id", requireAuth, requireRole("admin"), logController.read);
router.post("/logs", requireAuth, requireRole("admin"), logController.create);
router.delete("/logs/:id", requireAuth, requireRole("admin"), logController.delete);

// Orders
router.get("/orders", requireAuth, orderController.index);
router.get("/orders/:id", requireAuth, orderController.read);
router.post("/orders", requireAuth, orderController.create);
router.put("/orders/:id", requireAuth, orderController.update);
router.delete("/orders/:id", requireAuth, orderController.delete);

// Photos
router.get("/photos", requireAuth, photoController.index);
router.get("/photos/:id", requireAuth, photoController.read);

// --- ROTA COM UPLOAD (Corrigida e Posicionada) ---
router.post(
  "/photos", 
  requireAuth, 
  requireRole("admin"), 
  multerConfig.single("file"), // Middleware de Upload
  photoController.create
);

router.put("/photos/:id", requireAuth, requireRole("admin"), photoController.update);
router.delete("/photos/:id", requireAuth, requireRole("admin"), photoController.delete);

// Selections
router.get("/selections", requireAuth, selectionController.index);
router.get("/selections/:id", requireAuth, selectionController.read);
router.post("/selections", requireAuth, selectionController.create);
router.put("/selections/:id", requireAuth, selectionController.update);
router.delete("/selections/:id", requireAuth, selectionController.delete);

// Selection items
router.get("/selections/:id/items", requireAuth, selectionController.listItems);
router.post("/selections/:id/items", requireAuth, selectionController.addItem);
router.delete("/selections/:id/items/:itemId", requireAuth, selectionController.removeItem);

// Users
router.get("/users", requireAuth, requireRole("admin"), userController.index);
router.post("/users", requireAuth, requireRole("admin"), userController.create);
router.get("/users/:id", requireAuth, userController.read);
router.put("/users/:id", requireAuth, requireRole("admin"), userController.update);
router.delete("/users/:id", requireAuth, requireRole("admin"), userController.delete);

export { router };