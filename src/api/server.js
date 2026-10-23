import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { composeApp } from "./composition.js";
import { AppointmentController } from "./controllers/AppointmentController.js";
import { CatalogController } from "./controllers/CatalogController.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || "0.0.0.0";

const app = express();
const services = composeApp(rootDir);
const appointmentController = new AppointmentController(services);
const catalogController = new CatalogController(services);

app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));
app.use("/design-system", express.static(path.join(rootDir, "docs", "design-system")));
app.use("/readme-preview", express.static(path.join(rootDir, "docs", "readme-preview")));
app.use(express.static(path.join(rootDir, "public")));

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, service: "techroute" });
});

app.get("/api/technicians", catalogController.technicians);
app.get("/api/service-types", catalogController.serviceTypes);
app.get("/api/resources", catalogController.resources);
app.get("/api/appointments", appointmentController.list);
app.post("/api/appointments", appointmentController.create);
app.put("/api/appointments/:id", appointmentController.update);
app.put("/api/appointments/:id/resources", appointmentController.allocateResources);
app.post("/api/appointments/:id/cancel", appointmentController.cancel);
app.post("/api/appointments/:id/close", appointmentController.close);

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
