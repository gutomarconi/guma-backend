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
import swaggerSpec from './swagger';
import swaggerUi from 'swagger-ui-express';
import itemRoutes from './routes/item.routes';
import itemHistoryRoutes from './routes/itemHistory.routes';
import orderRoutes from './routes/orders.routes';

dotenv.config();

const app = express();

const environment = process.env.NODE_ENV || 'development';
app.use(cors({
  origin: environment === 'development' ? 'http://localhost:3001' : 'https://app.prodplan.com.br',
  credentials: true,
}));

app.use(express.json());


app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
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
