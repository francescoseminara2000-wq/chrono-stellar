import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure uploads/backgrounds directory exists
const bgUploadDir = path.join(__dirname, '../../uploads/backgrounds');
if (!fs.existsSync(bgUploadDir)) {
    fs.mkdirSync(bgUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, bgUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `bg-${uniqueSuffix}${ext}`);
    }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Sono consentite solo immagini (JPG, PNG, WEBP)'));
    }
};

export const backgroundUpload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 8 * 1024 * 1024 // 8MB limit for high-res backgrounds
    }
});
