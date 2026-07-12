FROM node:20-alpine
WORKDIR /app
COPY package.json server.js ./
ENV PORT=8080
ENV DID_ESIM_API_URL=https://esim-did-api.vercel.app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O /dev/null http://localhost:8080/1.0/identifiers/did:esim:test || exit 1
CMD ["node", "server.js"]
