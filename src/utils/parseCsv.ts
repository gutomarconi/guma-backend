import fs from "fs";

export function parseCsv(filePath: string) {
  return new Promise((resolve, reject) => {
    const data = fs.readFileSync(filePath, "latin1");

    const rows = data
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => line.split(";"));

    resolve(rows);
  });
}
