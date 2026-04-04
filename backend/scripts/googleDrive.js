import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DRIVE_FOLDER_MIME = 'application/vnd.google-apps.folder';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true';
const GOOGLE_DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files?supportsAllDrives=true';

function toBase64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function normalizePrivateKey(privateKey) {
  return privateKey.replace(/\\n/g, '\n');
}

function parseServiceAccountFromFile(jsonPath) {
  const raw = fs.readFileSync(path.resolve(jsonPath), 'utf8');
  const parsed = JSON.parse(raw);
  return {
    clientEmail: parsed.client_email,
    privateKey: parsed.private_key
  };
}

function getServiceAccountCredentials(env) {
  if (env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return parseServiceAccountFromFile(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  }

  return {
    clientEmail: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    privateKey: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  };
}

async function getAccessToken(env) {
  const credentials = getServiceAccountCredentials(env);
  const clientEmail = credentials.clientEmail;
  const privateKey = credentials.privateKey ? normalizePrivateKey(credentials.privateKey) : null;

  if (!clientEmail || !privateKey) {
    throw new Error(
      'Credenciais do Google ausentes. Configure GOOGLE_SERVICE_ACCOUNT_JSON ou GOOGLE_SERVICE_ACCOUNT_EMAIL/GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.'
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/drive.file',
    aud: GOOGLE_TOKEN_URL,
    exp: now + 3600,
    iat: now
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .sign('RSA-SHA256', Buffer.from(unsignedToken), privateKey)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  const assertion = `${unsignedToken}.${signature}`;
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Falha ao obter token do Google: ${response.status} ${body}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function createFolder(name, parentId, accessToken) {
  const response = await fetch(GOOGLE_DRIVE_FILES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name,
      mimeType: DRIVE_FOLDER_MIME,
      parents: parentId ? [parentId] : undefined
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Falha ao criar pasta no Google Drive: ${response.status} ${body}`);
  }

  const data = await response.json();
  return data.id;
}

async function uploadFile(filePath, parentId, accessToken) {
  const filename = path.basename(filePath);
  const boundary = `mini-erp-${crypto.randomUUID()}`;
  const metadata = {
    name: filename,
    parents: parentId ? [parentId] : undefined
  };
  const fileBuffer = fs.readFileSync(filePath);
  const preamble = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`
  );
  const epilogue = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([preamble, fileBuffer, epilogue]);

  const response = await fetch(GOOGLE_DRIVE_UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
      'Content-Length': String(body.length)
    },
    body
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(`Falha ao enviar arquivo para o Google Drive: ${response.status} ${bodyText}`);
  }
}

async function uploadDirectoryRecursive(localDir, parentId, accessToken) {
  const entries = fs.readdirSync(localDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const entryPath = path.join(localDir, entry.name);

    if (entry.isDirectory()) {
      const folderId = await createFolder(entry.name, parentId, accessToken);
      await uploadDirectoryRecursive(entryPath, folderId, accessToken);
      continue;
    }

    await uploadFile(entryPath, parentId, accessToken);
  }
}

export async function uploadBackupDirectoryToDrive({ backupDir, driveFolderId, env = process.env, logger = console }) {
  if (!driveFolderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID não configurado.');
  }

  const accessToken = await getAccessToken(env);
  const rootFolderName = path.basename(backupDir);
  const timestampFolderId = await createFolder(rootFolderName, driveFolderId, accessToken);

  logger.log(`Enviando backup ${rootFolderName} para Google Drive...`);
  await uploadDirectoryRecursive(backupDir, timestampFolderId, accessToken);
  logger.log(`Backup enviado ao Google Drive na pasta ${rootFolderName}`);

  return {
    uploaded: true,
    folderName: rootFolderName,
    folderId: timestampFolderId
  };
}
