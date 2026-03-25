import { defineConfig } from '@prisma/config'
import * as dotenv from 'dotenv'

dotenv.config()

let dbUrl = process.env.DATABASE_URL || '';
if (dbUrl.startsWith('"') && dbUrl.endsWith('"')) {
  dbUrl = dbUrl.slice(1, -1);
} else if (dbUrl.startsWith("'") && dbUrl.endsWith("'")) {
  dbUrl = dbUrl.slice(1, -1);
}

export default defineConfig({
  datasource: {
    url: dbUrl,
  },
})
