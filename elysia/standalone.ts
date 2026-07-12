import { app } from "./app"

const { swagger } = await import("@elysiajs/swagger")
app.use(
  swagger({
    documentation: {
      info: {
        title: "eSIM DID SDK API",
        description: "RESTful API for managing Decentralized Identifiers (DIDs) and eSIM profiles",
        version: "1.0.0",
      },
      tags: [
        { name: "DID Management", description: "Create, read, update, and delete DIDs" },
        { name: "eSIM Profiles", description: "Manage eSIM profiles associated with DIDs" },
        { name: "DID Resolution", description: "Resolve DIDs to their DID documents" },
      ],
    },
    path: "/docs",
  })
)

app.listen(3000)
console.log(`🚀 eSIM DID SDK API is running at http://localhost:${app.server?.port}`)
console.log(`📚 Swagger docs available at http://localhost:${app.server?.port}/docs`)
