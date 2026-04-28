import app from "./app";
import { env } from "./config/env";

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`
  ╔═════════════════════════════════════════════════════════╗
  ║                                                         ║
  ║   🚛  ES-WMS API Server                                 ║
  ║                                                         ║
  ║   Environment : ${env.NODE_ENV.padEnd(28)}            ║
  ║   Port        : ${String(PORT).padEnd(28)}            ║
  ║   Health      : http://localhost:${PORT}/api/v1/health     ║ 
  ║                                                         ║
  ╚═════════════════════════════════════════════════════════╝
  `);
});
