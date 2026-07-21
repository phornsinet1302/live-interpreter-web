// Single point of indirection for the generated Prisma client. Every module
// imports types/enums/the Prisma namespace from here instead of directly
// from "../generated/prisma" (or the "@prisma/client" package, which pnpm
// resolves inconsistently in this workspace — see schema.prisma).
export * from "../generated/prisma";
