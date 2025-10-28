import { Router } from "express";
import prisma from "../prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "change_me";

// register (create user)
router.post("/register", async (req, res) => {
  const { name, email, senha, companyId, role } = req.body;
  if (!email || !senha || !companyId) return res.status(400).json({ error: "email, senha and empresaId required" });
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(400).json({ error: "email already in use" });
  const hash = await bcrypt.hash(senha, 10);
  const user = await prisma.user.create({ data: { name, email, senha: hash, companyId, role: role || "user" } });
  res.status(201).json({ id: user.id, email: user.email });
});

// login
router.post("/login", async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ error: "email and senha required" });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const ok = await bcrypt.compare(senha, user.senha);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });
  const token = jwt.sign({ userId: user.id, companyId: user.companyId }, JWT_SECRET, { expiresIn: "1h" });
  res.json({ token });
});

// register superadmin - só se ainda não existir nenhum superadmin
router.post("/register-superadmin", async (req, res) => {
  const { name, email, senha } = req.body;
  if (!email || !senha || !name) return res.status(400).json({ error: "nome, email e senha required" });

  const existingSuperadmin = await prisma.user.findFirst({ where: { role: "superadmin" } });
  if (existingSuperadmin) return res.status(403).json({ error: "Superadmin já existe" });

  const hash = await bcrypt.hash(senha, 10);
  const superadmin = await prisma.user.create({
    data: { name, email, senha: hash, role: "superadmin" }
  });

  const token = jwt.sign({ userId: superadmin.id, role: superadmin.role }, JWT_SECRET, { expiresIn: "1h" });
  res.status(201).json({ token });
});
export default router;
