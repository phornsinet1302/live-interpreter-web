// Controller -> parse/validate req, call service, shape HTTP response. No DB, no rules.
import type { Request, Response } from "express";

export async function register(_req: Request, _res: Response) {}
export async function login(_req: Request, _res: Response) {}
export async function refresh(_req: Request, _res: Response) {}
