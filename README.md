# My API - Template

Template Express + TypeScript + Prisma (PostgreSQL) with multi-tenant setup and hybrid auth (JWT + API Keys).

## Quick start

1. Start PostgreSQL:
   ```bash
   docker-compose up -d
   ```
2. Install deps:
   ```bash
   npm install
   ```
3. Generate Prisma client & run migration:
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```
4. Run dev server:
   ```bash
   npm run dev
   ```

# Local BD

After running the docker-compose up -d, access http://localhost:5050/

# Migration

1. Update prisma/schema.prisma
2. Generate migration npx prisma migrate dev --name 'migration name is what the chagne is doing'
3. Update primsa npx prisma generate
