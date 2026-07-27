// Single import indirection for the generated Prisma client.
//
// pnpm's virtual store was resolving two different physical copies of
// "@prisma/client" for this workspace, leaving the backend permanently on
// a stale client no matter where `prisma generate` wrote its output. The
// schema's generator now writes straight into this repo
// (backend/src/generated/prisma) instead of node_modules/@prisma/client,
// which sidesteps that resolution ambiguity. Every other file should import
// the client and its types from here, not from "@prisma/client" or the
// generated folder directly, so there is one place to change if the
// output path ever moves again.
export * from "../generated/prisma";
