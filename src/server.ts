import express from "express";
import dotenv from "dotenv";
import cors from 'cors';
import empresaRoutes from "./routes/company.routes";
import userRoutes from "./routes/user.routes";
import authRoutes from "./routes/auth.routes";
import apikeyRoutes from "./routes/apikey.routes";
import poRoutes from "./routes/po.routes";
import machineRoutes from "./routes/machine.routes";
import machineFingerprintRoutes from "./routes/machineFingerprint.routes";
import authMiddleware from "./middleware/auth.middleware";
import { tenantMiddleware } from "./middleware/tenant.middleware";
import itemRoutes from './routes/OrderItems.routes';
import itemHistoryRoutes from './routes/OrderItemHistory.routes';
import orderRoutes from './routes/orders.routes';
import { memoryUsage } from 'process';

// Log de memória a cada 5 segundos
// setInterval(() => {
//   const m = memoryUsage();

//   console.log(`[MEMORY] ${new Date().toISOString()} | ` +
//     `RSS: ${(m.rss / 1024 / 1024).toFixed(1)} MB | ` +
//     `Heap Used: ${(m.heapUsed / 1024 / 1024).toFixed(1)} MB | ` +
//     `Heap Total: ${(m.heapTotal / 1024 / 1024).toFixed(1)} MB | ` +
//     `External: ${(m.external / 1024 / 1024).toFixed(1)} MB`
//   );
// }, 5000);

// Opcional: log quando o Node avisa de memória alta
// process.on('warning', (warning) => {
//   if (warning.name === 'MemoryWarning') {
//     console.error('[MEMORY WARNING]', warning.message);
//   }
// });

dotenv.config();

const app = express();

const environment = process.env.NODE_ENV || 'development';
app.use(cors({
  origin: environment === 'development' ? 'http://localhost:3001' : 'https://app.prodplan.com.br',
  credentials: true,
}));

app.use(express.json());

// app.get('/debug/memory', (req, res) => {
//   // Força o GC antes de medir (melhor precisão)
//   if (global.gc) {
//     console.log('→ Forçando Garbage Collection...');
//     global.gc();           // GC normal
//     global.gc();           // roda novamente (ajuda a limpar finalizers)
//   }

//   const used = process.memoryUsage();

//   res.json({
//     timestamp: new Date().toISOString(),
//     rss: `${(used.rss / 1024 / 1024).toFixed(2)} MB`,
//     heapTotal: `${(used.heapTotal / 1024 / 1024).toFixed(2)} MB`,
//     heapUsed: `${(used.heapUsed / 1024 / 1024).toFixed(2)} MB`,
//     external: `${(used.external / 1024 / 1024).toFixed(2)} MB`,
//     arrayBuffers: `${(used.arrayBuffers / 1024 / 1024).toFixed(2)} MB`,
//     gcExposed: !!global.gc
//   });
// });

// app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/apikeys", apikeyRoutes);

app.use("/auth", authRoutes);

// protected endpoints
app.use("/api", authMiddleware);


app.use("/api/companies", empresaRoutes);
app.use("/api", tenantMiddleware);
app.use("/api/users", userRoutes);

app.use("/api/po", poRoutes);
app.use("/api/machine", machineRoutes);
app.use("/api/machine-fingerprint", machineFingerprintRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/item-history", itemHistoryRoutes);
app.use("/api/orders", orderRoutes);



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
