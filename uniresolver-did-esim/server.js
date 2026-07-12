const http = require("http");
const https = require("https");

const PORT = process.env.PORT || 8080;
const API_BASE = process.env.DID_ESIM_API_URL || "https://esim-did-api.vercel.app";

function fetchJSON(urlPath) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, API_BASE);
    const client = url.protocol === "https:" ? https : http;
    client
      .get(url, { headers: { Accept: "application/did+json,application/ld+json,application/json" } }, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch {
            reject(new Error("Invalid JSON from API"));
          }
        });
      })
      .on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const match = req.url.match(/^\/1\.0\/identifiers\/(.+)$/);

  if (!match) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found. Use /1.0/identifiers/{did}" }));
    return;
  }

  const did = decodeURIComponent(match[1]);

  if (!did.startsWith("did:esim:")) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        didResolutionMetadata: { error: "unsupportedDidMethod" },
      })
    );
    return;
  }

  try {
    const result = await fetchJSON(`/api/resolve/${encodeURIComponent(did)}`);

    if (result.status === 404) {
      res.writeHead(404, { "Content-Type": "application/did+json" });
      res.end(
        JSON.stringify({
          didResolutionMetadata: { error: "notFound", did },
          didDocument: null,
          didDocumentMetadata: {},
        })
      );
      return;
    }

    res.writeHead(200, { "Content-Type": "application/did+json" });
    res.end(JSON.stringify(result.data));
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        didResolutionMetadata: { error: "internalError", errorMessage: err.message },
        didDocument: null,
        didDocumentMetadata: {},
      })
    );
  }
});

server.listen(PORT, () => {
  console.log(`Uni-Resolver driver did:esim listening on port ${PORT}`);
  console.log(`Proxying to: ${API_BASE}`);
});
