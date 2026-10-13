import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import path from "path";

import { r2Client, R2_BUCKET_NAME } from "../../config/r2.js";

const COMPANY_LOGO_PREFIX = "company-settings/logos/";
const EMPLOYEE_AVATAR_PREFIX = "avatars/";

const IMAGE_EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export async function uploadDocumentFile(file) {
  const extension = path.extname(file.originalname);

  const fileName = `${crypto.randomUUID()}${extension}`;

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  const storageKey = `documents/${year}/${month}/${fileName}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: storageKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    }),
  );

  return {
    name: file.originalname,
    type: file.mimetype,
    size: file.size,
    url: storageKey,
  };
}

export function isCompanyLogoStorageKey(value) {
  return String(value ?? "").startsWith(COMPANY_LOGO_PREFIX);
}

export async function uploadCompanyLogo(file) {
  const extension = IMAGE_EXTENSIONS[file.mimetype];

  if (!extension) {
    throw new Error("Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.");
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const storageKey = `${COMPANY_LOGO_PREFIX}${year}/${month}/${crypto.randomUUID()}${extension}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: storageKey,
      Body: file.buffer,
      ContentType: file.mimetype,
      ContentDisposition: "inline",
    }),
  );

  return {
    name: file.originalname,
    type: file.mimetype,
    size: file.size,
    logo_url: storageKey,
  };
}

export async function getCompanyLogoDisplayUrl(storageKey) {
  if (!isCompanyLogoStorageKey(storageKey)) {
    return storageKey || null;
  }

  return getSignedUrl(
    r2Client,
    new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: storageKey,
    }),
    { expiresIn: 60 * 60 * 24 * 7 },
  );
}

export async function deleteCompanyLogo(storageKey) {
  if (!isCompanyLogoStorageKey(storageKey)) return;

  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: storageKey,
    }),
  );
}

export function isEmployeeAvatarStorageKey(value) {
  return String(value ?? "").startsWith(EMPLOYEE_AVATAR_PREFIX);
}

export async function uploadEmployeeAvatar(file, staffId) {
  const extension = IMAGE_EXTENSIONS[file.mimetype];

  if (!extension) {
    throw new Error("Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.");
  }

  const storageKey = `${EMPLOYEE_AVATAR_PREFIX}${String(staffId)}/${crypto.randomUUID()}${extension}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: storageKey,
      Body: file.buffer,
      ContentType: file.mimetype,
      ContentDisposition: "inline",
    }),
  );

  return {
    name: file.originalname,
    type: file.mimetype,
    size: file.size,
    avatar_url: storageKey,
  };
}

export async function getEmployeeAvatarDisplayUrl(storageKey) {
  if (!isEmployeeAvatarStorageKey(storageKey)) {
    return storageKey || null;
  }

  return getSignedUrl(
    r2Client,
    new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: storageKey,
    }),
    { expiresIn: 60 * 60 * 24 * 7 },
  );
}

export async function deleteEmployeeAvatar(storageKey) {
  if (!isEmployeeAvatarStorageKey(storageKey)) return;

  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: storageKey,
    }),
  );
}
