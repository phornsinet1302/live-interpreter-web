import type { Request, Response } from "express";
import * as service from "./transcriptions.service";
import type { QuickTranscribeInput } from "./transcriptions.validator";

export async function quickTranscribe(req: Request, res: Response) {
  const { audio, mimeType, sourceLanguage, targetLanguage } = req.body as QuickTranscribeInput;
  const result = await service.transcribeAudio(audio, mimeType, sourceLanguage, targetLanguage);
  res.json(result);
}
