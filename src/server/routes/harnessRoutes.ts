import { Router } from 'express';
import { z } from 'zod';
import { HARNESS_IDS } from '../../adapters/mcp/harnessCatalog';
import {
  connectHarnessMcp,
  disconnectHarnessMcp,
  scanInstalledHarnesses,
} from '../../adapters/mcp/harnessDetector';

const harnessIdSchema = z.enum(HARNESS_IDS);
const modeSchema = z.enum(['stdio', 'sse']).default('stdio');

const connectBodySchema = z.object({
  mode: modeSchema,
  sseUrl: z.string().optional(),
});

export function createHarnessRoutes(): Router {
  const router = Router();

  router.get('/mcp/harnesses', (req, res) => {
    const parsedMode = modeSchema.safeParse(req.query.mode ?? 'stdio');
    const mode = parsedMode.success ? parsedMode.data : 'stdio';
    const sseUrl = typeof req.query.sseUrl === 'string' ? req.query.sseUrl : undefined;
    res.json(scanInstalledHarnesses({ mode, sseUrl }));
  });

  router.post('/mcp/harnesses/:id/connect', (req, res) => {
    const idParsed = harnessIdSchema.safeParse(req.params.id);
    if (!idParsed.success) {
      res.status(400).json({ error: 'Harness no reconocido en el catálogo.' });
      return;
    }
    const bodyParsed = connectBodySchema.safeParse(req.body ?? {});
    if (!bodyParsed.success) {
      res.status(400).json({ error: 'Parámetros de conexión MCP inválidos.' });
      return;
    }

    try {
      const updated = connectHarnessMcp({
        harnessId: idParsed.data,
        mode: bodyParsed.data.mode,
        sseUrl: bodyParsed.data.sseUrl,
      });
      res.json({ harness: updated });
    } catch (error) {
      res.status(422).json({
        error: error instanceof Error ? error.message : 'No se pudo escribir la configuración MCP.',
      });
    }
  });

  router.post('/mcp/harnesses/:id/disconnect', (req, res) => {
    const idParsed = harnessIdSchema.safeParse(req.params.id);
    if (!idParsed.success) {
      res.status(400).json({ error: 'Harness no reconocido en el catálogo.' });
      return;
    }
    const bodyParsed = connectBodySchema.safeParse(req.body ?? {});
    const mode = bodyParsed.success ? bodyParsed.data.mode : 'stdio';
    const sseUrl = bodyParsed.success ? bodyParsed.data.sseUrl : undefined;

    try {
      const updated = disconnectHarnessMcp({
        harnessId: idParsed.data,
        mode,
        sseUrl,
      });
      res.json({ harness: updated });
    } catch (error) {
      res.status(422).json({
        error: error instanceof Error ? error.message : 'No se pudo desconectar el servidor MCP.',
      });
    }
  });

  return router;
}
