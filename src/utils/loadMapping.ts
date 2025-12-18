// config.json → sua config

// import prisma from "../prisma";
// import { CreateItemInput } from "../schemas/item.schema";
// import { PrismaClient } from "@prisma/client";

// const prisma = new PrismaClient();

// export const mapRowByConfig = async (row: any[]): Promise<CreateItemInput> => {
//   const obj: any = {};
//     const mappingRecord = await prisma.fileMapping.findFirst();
//     if (!mappingRecord) throw new Error("Mapping not found");
  
//     const mappingConfig = mappingRecord.mapping as Record<string, string>; // Ex: { pedido: "A", lote: "C" }
  

//   for (const [fieldName, mapping] of Object.entries(mappingConfig)) {
//     let colIndex = mapping;

//     // Caso do tipo "1.1"
//     if (typeof colIndex === "string" && colIndex.includes(".")) {
//       const [col, part] = colIndex.split(".").map(Number);
//       const raw = row[col] ?? "";

//       // separa por espaço e pega o índice
//       const split = String(raw).split(" ");
//       obj[fieldName] = split[part] ?? null;
//       continue;
//     }

//     // Coluna simples
//     const index = Number(colIndex);
//     obj[fieldName] = row[index] ?? null;
//   }

//   return obj;
// }
