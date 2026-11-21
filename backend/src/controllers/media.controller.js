import fs from 'fs';
import { cloudinary, isCloudinaryConfigured } from '../config/storage.js';
import { getIceServers } from '../config/webrtc.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const uploadMedia = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError(400, 'No file uploaded');
    }

    const file = req.file;
    let url = '';
    let publicId = '';

    if (isCloudinaryConfigured) {
      let resourceType = 'auto';
      if (file.mimetype.startsWith('video/')) resourceType = 'video';
      else if (file.mimetype.startsWith('audio/')) resourceType = 'video'; // Cloudinary treats audio as video
      else if (file.mimetype.startsWith('image/')) resourceType = 'image';
      else resourceType = 'raw';

      const uploadResult = await cloudinary.uploader.upload(file.path, {
        folder: 'bakwas/media',
        resource_type: resourceType
      });

      url = uploadResult.secure_url;
      publicId = uploadResult.public_id;

      // Clean up temporary local file after successful cloud upload
      if (fs.existsSync(file.path)) {
        fs.unlink(file.path, () => {});
      }
    } else {
      url = `/uploads/${file.filename}`;
      publicId = file.filename;
    }

    return res.status(200).json(
      new ApiResponse(200, {
        url,
        publicId,
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size
      }, 'Media uploaded successfully')
    );
  } catch (error) {
    next(error);
  }
};

export const getIceServersConfig = async (req, res, next) => {
  try {
    const servers = getIceServers();
    return res.status(200).json(new ApiResponse(200, { iceServers: servers }));
  } catch (error) {
    next(error);
  }
};
