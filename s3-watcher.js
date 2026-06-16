import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Load .env file manually to avoid external dependencies
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    console.warn('\x1b[33m[Warning]\x1b[0m .env file not found. Creating a template .env file...');
    console.warn('\x1b[33m[Warning]\x1b[0m Please fill in your AWS credentials in .env and restart this script.\n');
    
    const templateContent = `AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=ap-northeast-1
S3_BUCKET_NAME=your-s3-bucket-name
`;
    fs.writeFileSync(envPath, templateContent, 'utf8');
    process.exit(0);
  }
  
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      process.env[key] = value;
    }
  });
}

loadEnv();

const bucketName = process.env.S3_BUCKET_NAME;
const region = process.env.AWS_REGION || 'ap-northeast-1';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

if (!bucketName || bucketName === 'your-s3-bucket-name') {
  console.error('\x1b[31m[Error]\x1b[0m Missing or default S3_BUCKET_NAME in .env file.');
  console.error('Please configure at least S3_BUCKET_NAME in your .env file.\n');
  process.exit(1);
}

// Initialize S3 client (IAM Role / SSO compatible)
const s3Config = { region };

// Only use explicit credentials if they are provided in .env
if (accessKeyId && secretAccessKey && accessKeyId !== 'your_aws_access_key_id') {
  s3Config.credentials = {
    accessKeyId,
    secretAccessKey
  };
}

const s3 = new S3Client(s3Config);

// Common MIME-types for web applications
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
};

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function getCacheControl(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const normalizedPath = filePath.replace(/\\/g, '/');

  if (ext === '.html') {
    return 'no-cache, no-store, must-revalidate';
  }

  if (normalizedPath.includes('/assets/')) {
    return 'public, max-age=31536000, immutable';
  }

  return 'public, max-age=300';
}

// Upload file to S3
async function uploadFile(localFilePath) {
  const relativePath = path.relative(path.resolve(process.cwd(), 'dist'), localFilePath);
  // Normalize Windows backslashes to S3 forward slashes
  const s3Key = relativePath.replace(/\\/g, '/');
  const contentType = getContentType(localFilePath);
  const cacheControl = getCacheControl(localFilePath);

  try {
    const fileContent = fs.readFileSync(localFilePath);
    await s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: fileContent,
      ContentType: contentType,
      CacheControl: cacheControl
    }));
    console.log(`\x1b[32m[S3 UPLOAD SUCCESS]\x1b[0m ${s3Key} \x1b[90m(${contentType}; ${cacheControl})\x1b[0m`);
  } catch (err) {
    console.error(`\x1b[31m[S3 UPLOAD FAILED]\x1b[0m ${s3Key}:`, err.message);
  }
}

// Delete file from S3
async function deleteFile(localFilePath) {
  const relativePath = path.relative(path.resolve(process.cwd(), 'dist'), localFilePath);
  const s3Key = relativePath.replace(/\\/g, '/');

  try {
    await s3.send(new DeleteObjectCommand({
      Bucket: bucketName,
      Key: s3Key
    }));
    console.log(`\x1b[33m[S3 DELETE SUCCESS]\x1b[0m ${s3Key}`);
  } catch (err) {
    console.error(`\x1b[31m[S3 DELETE FAILED]\x1b[0m ${s3Key}:`, err.message);
  }
}

// Ensure dist directory exists
const distDir = path.resolve(process.cwd(), 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Run initial full build to ensure dist is synced up-to-date
console.log('\x1b[36m[Builder]\x1b[0m Running initial Vite production build...');
const initialBuild = spawn('npx', ['vite', 'build'], { shell: true, stdio: 'inherit' });

initialBuild.on('close', async (code) => {
  if (code !== 0) {
    console.error('\x1b[31m[Builder]\x1b[0m Initial build failed. Will not start watcher.');
    process.exit(1);
  }
  
  console.log('\x1b[32m[Builder]\x1b[0m Initial build completed successfully. Performing initial sync to S3...');
  await syncDirectory(distDir);
  
  if (process.argv.includes('--once')) {
    console.log('\x1b[32m[Builder]\x1b[0m Deployment completed successfully. Exiting...');
    process.exit(0);
  }
  
  // Start watcher & Vite build --watch
  startWatcher();
});

// Helper to perform a full sync of a directory to S3
async function syncDirectory(dir) {
  const files = getFilesRecursive(dir);
  console.log(`\x1b[36m[S3 Sync]\x1b[0m Uploading all ${files.length} files in dist/ to S3...`);
  
  // Run uploads in parallel with a concurrency limit if needed, but for small sites simple Promise.all is fine
  await Promise.all(files.map(file => uploadFile(file)));
  console.log('\x1b[32m[S3 Sync]\x1b[0m Initial sync complete! Now listening for changes...\n');
}

// Helper to get all files recursively
function getFilesRecursive(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursive(fullPath));
    } else {
      results.push(fullPath);
    }
  });
  return results;
}

function startWatcher() {
  // Start Vite build in watch mode
  console.log('\x1b[36m[Vite]\x1b[0m Starting Vite build in watch mode...');
  const viteProcess = spawn('npx', ['vite', 'build', '--watch'], {
    shell: true,
    stdio: 'inherit'
  });

  console.log(`\x1b[36m[Watcher]\x1b[0m Watching ${distDir} for changes...`);

  // Queues for processing events in batches (debounced)
  const uploadQueue = new Set();
  const deleteQueue = new Set();
  let debounceTimeout = null;

  async function processQueues() {
    const toUpload = Array.from(uploadQueue);
    const toDelete = Array.from(deleteQueue);
    uploadQueue.clear();
    deleteQueue.clear();

    for (const filePath of toUpload) {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
          await uploadFile(filePath);
        }
      }
    }

    for (const filePath of toDelete) {
      // Confirm it really doesn't exist locally before deleting from S3
      if (!fs.existsSync(filePath)) {
        await deleteFile(filePath);
      }
    }
  }

  // Windows supports recursive file watching
  const watcher = fs.watch(distDir, { recursive: true }, (eventType, filename) => {
    if (!filename) return;
    const fullPath = path.join(distDir, filename);

    // Ignore temporary/backup files
    if (filename.includes('.tmp') || filename.includes('~') || filename.endsWith('.swp')) return;

    if (fs.existsSync(fullPath)) {
      uploadQueue.add(fullPath);
      deleteQueue.delete(fullPath); // Cancel pending delete if recreated
    } else {
      deleteQueue.add(fullPath);
      uploadQueue.delete(fullPath); // Cancel pending upload if deleted
    }

    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(processQueues, 300);
  });

  // Handle termination gracefully
  const cleanExit = () => {
    console.log('\n\x1b[36m[Watcher]\x1b[0m Stopping watcher and Vite watch process...');
    watcher.close();
    viteProcess.kill();
    process.exit();
  };

  process.on('SIGINT', cleanExit);
  process.on('SIGTERM', cleanExit);
}
