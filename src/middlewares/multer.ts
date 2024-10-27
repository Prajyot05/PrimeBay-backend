import multer from 'multer'
import {v4 as uuid} from 'uuid'

const storage = multer.diskStorage({
    destination(req, file, callback){
        callback(null, "uploads");
    },
    filename(req, file, callback){
        const id = uuid();
        const extName = file.originalname.split(".").pop(); // this is better than using index [1] as a dumb user might have multiple dots in the name
        callback(null, `${id}.${extName}`);
    }
});

export const singleUpload = multer({storage}).single("photo");