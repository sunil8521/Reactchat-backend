import multer from "multer";
import { ErrorHandling } from "../error/error.js";
import { v2 as cloudinary } from "cloudinary";
import { v4 as uuid } from "uuid";
import dotenv from "dotenv";
dotenv.config();

const multerUpload = multer({ limits: { fileSize: 1024 * 1024 * 8 } });

export const avtarMentUpload = multerUpload.single("avtar");
export const attachMentUpload = multerUpload.array("files", 5);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});


export const deleteFromCloudnary = async (public_id = []) => {
  const deletePromises = public_id.map((id) => {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(
        id,
        { invalidate: true,resource_type: `${id.split('_')[1]}` },
        function (error, result) {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
    });
  });

  try {
    const result = await Promise.all(deletePromises);
    return result;
  } catch (error) {
    throw new ErrorHandling(error.message, 500);
  }
};

export const UploadToCloudnary = async (file = []) => {
  const filePromise = file.map((file) => {
    let resourceType;
    
    if (file.mimetype.startsWith('image/')||file.mimetype.endsWith('pdf')) {
      resourceType = "image";
    } else if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')) {
      resourceType = "video";
    } else {
      resourceType = "raw";
    }
    
    return new Promise((resolve, reject) => {

      cloudinary.uploader.upload(
        `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
        // file.path,
        {
          resource_type: "auto",
          public_id: `${uuid()}_${resourceType}`,
        },
        function (error, result) {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
    });
  });

  try {
    const result = await Promise.all(filePromise);
    return result;
  } catch (er) {
    throw new ErrorHandling(er.message, 500);
  }
};