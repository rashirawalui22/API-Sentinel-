# API Sentinel

API Sentinel is a full-stack API monitoring dashboard built with React, Express, MongoDB, Mongoose, and scheduled health checks.

## Development

Requirements: Node.js 20+, optional MongoDB.

```bash
npm install
npm --prefix frontend install
npm --prefix server install
npm run dev
```

The frontend runs at `http://localhost:5173`. The API runs at `http://localhost:4000`.

Without `MONGODB_URI`, the API uses in-process memory for a usable local demo. Set `server/.env` using `server/.env.example` to enable MongoDB, authentication, and persistent monitoring.

## Commands

- `npm run dev` - start frontend and API together
- `npm run build` - create a production frontend build
- `npm start` - start the API

## Security

Monitor URLs are limited to public HTTP(S) destinations. DNS resolution and IP addresses are checked to reject localhost, private, loopback, link-local, and reserved network targets.