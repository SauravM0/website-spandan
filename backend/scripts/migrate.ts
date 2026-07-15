import { migrateMain } from '../src/migrate';

migrateMain().catch((error) => {
  console.error('Migration failed:', (error as Error).message);
  process.exitCode = 1;
});
