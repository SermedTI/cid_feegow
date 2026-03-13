import { z } from "zod";
import { createUser } from "../db/queries/auth.js";
import { hashPassword } from "../lib/password.js";
import { pool } from "../db/pool.js";

const cliSchema = z.object({
  name: z.string().trim().min(3),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["admin", "reader"])
});

async function main() {
  const args = cliSchema.parse({
    name: process.argv[2],
    email: process.argv[3],
    password: process.argv[4],
    role: process.argv[5]
  });

  const passwordHash = await hashPassword(args.password);
  const user = await createUser({
    name: args.name,
    email: args.email,
    passwordHash,
    role: args.role
  });

  console.log(`Usuario criado: ${user.email} (${user.role})`);
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
