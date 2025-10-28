import express from "express";
import dotenv from "dotenv";
import empresaRoutes from "./routes/company.routes";
import userRoutes from "./routes/user.routes";
import authRoutes from "./routes/auth.routes";
import apikeyRoutes from "./routes/apikey.routes";
import poRoutes from "./routes/po.routes";
import machineRoutes from "./routes/machine.routes";
import authMiddleware from "./middleware/auth.middleware";
import { tenantMiddleware } from "./middleware/tenant.middleware";
import swaggerSpec from './swagger';
import swaggerUi from 'swagger-ui-express';

dotenv.config();

const app = express();
app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/auth", authRoutes);

// protected endpoints
app.use(authMiddleware);
app.use(tenantMiddleware);

app.use("/empresas", empresaRoutes);
app.use("/users", userRoutes);
app.use("/apikeys", apikeyRoutes);
app.use("/po", poRoutes);
app.use("/machine", machineRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
