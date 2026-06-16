import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const AVATAR_DIR = path.join(__dirname, '../../uploads/avatars');

// Ensure directory exists
if (!fs.existsSync(AVATAR_DIR)) {
    fs.mkdirSync(AVATAR_DIR, { recursive: true });
}

export class AvatarController {

    // List all available avatars
    async list(req: Request, res: Response) {
        try {
            if (!fs.existsSync(AVATAR_DIR)) {
                return res.json([]);
            }

            const files = fs.readdirSync(AVATAR_DIR);

            // Filter only images and create full URLs
            // Assuming the server serves /uploads static route mapping to ../uploads
            // We need to ensure app.ts routes /uploads correctly. 
            // Currently app.ts: app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
            // So a file in uploads/avatars/foo.png is accessible via /uploads/avatars/foo.png

            const avatarUrls = files
                .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
                .map(file => `/uploads/avatars/${file}`);

            res.json(avatarUrls);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // Upload a new avatar
    async upload(req: Request, res: Response) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            // File is already saved by multer middleware
            // Return the public URL
            const publicUrl = `/uploads/avatars/${req.file.filename}`;

            res.status(201).json({
                message: 'Avatar uploaded successfully',
                url: publicUrl,
                filename: req.file.filename
            });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // Delete an avatar
    async delete(req: Request, res: Response) {
        try {
            const { filename } = req.params;

            // Prevent directory traversal
            const safeFilename = path.basename(filename);
            const filePath = path.join(AVATAR_DIR, safeFilename);

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                res.json({ message: 'Avatar deleted successfully' });
            } else {
                res.status(404).json({ error: 'File not found' });
            }
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
}
