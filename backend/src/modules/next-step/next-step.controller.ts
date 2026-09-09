import type { Request, Response } from "express";
import * as service from "./next-step.service";
import type { QuickNextStepInput } from "./next-step.validator";

export async function quickNextStep(req: Request, res: Response) {
  const input = req.body as QuickNextStepInput;
  const result = await service.generateNextStep(input);
  res.json(result);
}
