import { Request, Response } from 'express';

export class UploadController {
    upload(req: Request, res: Response) {
        if (!req.file) {
            return res.status(400).json({ error: 'Nessun file caricato' });
        }
        res.status(200).json({ url: `/uploads/${req.file.filename}` });
    }
}
