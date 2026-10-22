import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure uploads/loaders directory exists
const loaderUploadDir = path.join(__dirname, '../../uploads/loaders');
if (!fs.existsSync(loaderUploadDir)) {
    fs.mkdirSync(loaderUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, loaderUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase() || '.mp4';
        cb(null, `loader-${uniqueSuffix}${ext}`);
    }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'];
    const allowedExts = ['.mp4', '.webm', '.mov', '.ogg'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Sono consentiti solo file video (MP4, WEBM, MOV)'));
    }
};

export const loaderVideoUpload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 60 * 1024 * 1024 // 60MB limit
    }
});
