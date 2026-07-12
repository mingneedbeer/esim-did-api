import { Elysia } from "elysia"
import { didRoutes } from "./routes/did"
import { esimRoutes } from "./routes/esim"
import { resolverRoutes } from "./routes/resolver"

export const app = new Elysia()
  .onError(({ code, error, set }) => {
    if (code === "VALIDATION") {
      set.status = 400
      return { error: "Bad Request", message: error.message, statusCode: 400 }
    }
    set.status = 500
    return {
      error: "Internal Server Error",
      message: error instanceof Error ? error.message : "Unknown error",
      statusCode: 500,
    }
  })
  .get("/", () => ({
    name: "eSIM DID SDK API",
    version: "1.0.0",
    docs: "/docs",
    health: "/health",
    endpoints: { dids: "/dids", profiles: "/profiles", resolve: "/resolve" },
  }))
  .get("/health", () => ({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }))
  .use(didRoutes)
  .use(esimRoutes)
  .use(resolverRoutes)
