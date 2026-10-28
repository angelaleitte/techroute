import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { composeApp } from "./composition.js";
import { AppointmentController } from "./controllers/AppointmentController.js";
import { AuthController } from "./controllers/AuthController.js";
import { CatalogController } from "./controllers/CatalogController.js";
import { UserController } from "./controllers/UserController.js";
import { createAuthMiddleware, requireRole } from "./middleware/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || "0.0.0.0";

const app = express();
const services = composeApp(rootDir);
const appointmentController = new AppointmentController(services);
const catalogController = new CatalogController(services);
const authController = new AuthController(services);
const userController = new UserController(services);
const requireAuth = createAuthMiddleware(services.getCurrentUserService);
const requireSupervisor = requireRole("supervisor");

app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));
app.use("/design-system", express.static(path.join(rootDir, "public", "design-system")));
app.use("/readme-preview", express.static(path.join(rootDir, "docs", "readme-preview")));
app.use(express.static(path.join(rootDir, "public")));

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, service: "techroute" });
});

app.post("/api/auth/login", authController.login);
app.post("/api/auth/logout", authController.logout);
app.get("/api/auth/me", authController.me);
app.put("/api/auth/profile", requireAuth, authController.updateProfile);
app.put("/api/auth/password", requireAuth, authController.changePassword);

app.get("/api/users", requireAuth, requireSupervisor, userController.list);
app.get(
  "/api/users/available-technicians",
  requireAuth,
  requireSupervisor,
  userController.availableTechnicians,
);
app.post("/api/users", requireAuth, requireSupervisor, userController.create);
app.put("/api/users/:id", requireAuth, requireSupervisor, userController.update);
app.post(
  "/api/users/:id/reset-password",
  requireAuth,
  requireSupervisor,
  userController.resetPassword,
);

app.get("/api/technicians", requireAuth, catalogController.technicians);
app.get("/api/service-types", requireAuth, catalogController.serviceTypes);
app.get("/api/resources", requireAuth, catalogController.resources);
app.get("/api/appointments", requireAuth, appointmentController.list);
app.post("/api/appointments", requireAuth, requireSupervisor, appointmentController.create);
app.put("/api/appointments/:id", requireAuth, requireSupervisor, appointmentController.update);
app.put(
  "/api/appointments/:id/resources",
  requireAuth,
  requireSupervisor,
  appointmentController.allocateResources,
);
app.post("/api/appointments/:id/cancel", requireAuth, requireSupervisor, appointmentController.cancel);
app.post("/api/appointments/:id/close", requireAuth, appointmentController.close);
app.post("/api/appointments/:id/attend", requireAuth, appointmentController.startAttendance);
app.post(
  "/api/appointments/:id/reschedule",
  requireAuth,
  requireSupervisor,
  appointmentController.reschedule,
);
app.post("/api/appointments/:id/reopen", requireAuth, requireSupervisor, appointmentController.reopen);
app.put("/api/appointments/:id/notes", requireAuth, appointmentController.updateNotes);

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({
    error: { code: "UNEXPECTED_ERROR", message: "Não foi possível concluir a operação." },
  });
});

const server = app.listen(port, host, () => {
  console.log(`TechRoute em http://localhost:${port}`);
});

function shutdown() {
  server.close(() => {
    services.db.close();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
