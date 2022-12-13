import * as supernote from "supernote-cloud-api";
import path from "node:path";
import fs from "node:fs/promises";
import fetch from "node-fetch";

export async function syncFiles(token: string, localPath: string) {
  return syncSupernoteDirectory(token, localPath);
}

async function syncSupernoteDirectory(token: string, localPath: string, directoryId?: string) {
  let contents = await supernote.fileList(token, directoryId);
  for (const item of contents) {
    const itemPath = path.join(localPath, item.fileName);
    if (item.isFolder == "Y") {
      // Recurse folder
      console.log(`Recursing into ${itemPath}`);
      await syncSupernoteDirectory(token, itemPath, item.id);
    } else {
      await syncSupernoteFile(token, itemPath, item);
    }
  }
}

async function syncSupernoteFile(token: string, localPath: string, item: supernote.FileInfo) {
  console.log(`Checking: ${localPath}`);

  // Get details of localPath
  let localInfo;
  try { localInfo = await fs.stat(localPath); } catch (e: any) {
    if (e.code !== 'ENOENT') throw e;
    console.log(`  Not found: ${localPath}`);
  }

  // If newer than item, then do nothing
  if (localInfo) {
    if (!localInfo.isFile()) throw (`Not a file: ${localPath}`);
    let lastUpdated = new Date(item.updateTime);
    console.log(`  -- Local time:  ${localInfo.mtime}`);
    console.log(`  -- Remote time: ${lastUpdated}`);
    if (localInfo.mtime > lastUpdated) {
      console.log(`  Ignoring file (newer): ${localPath}`);
      return;
    }
    // Compute md5 of localPath
    let localMd5 = await computeFileMd5(localPath);
    if (localMd5 == item.md5) {
      console.log(`  Ignoring file (MD5 matches): ${localPath}`);
      return;
    }
  }

  // If different to item.md5 then download
  console.log(`  Downloading: ${localPath}`);
  let url = await supernote.fileUrl(token, item.id);
  await downloadFile(url, localPath, item.updateTime);
}

async function computeFileMd5(localPath: string) {
  // Compute md5 of file
  return "";
}

async function downloadFile(url: string, filePath: string, updateTime: number) {
  // Make sure folder exists
  let folder = path.dirname(filePath);
  try { await fs.mkdir(folder, { recursive: true }) } catch { };

  let res = await fetch(url);
  if (!res.ok) {
    console.log(`Error downloading [${res.status}: ${res.statusText}]: ${url}`);
    return;
  }

  const fd = await fs.open(filePath, "w");
  try {
    const fileStream = fd.createWriteStream({ autoClose: true });
    await new Promise((resolve, reject) => {
      if (res.body) {
        res.body.pipe(fileStream);
        res.body.on("error", reject);
        fileStream.on("finish", resolve);
      } else {
        reject("Missing body");
      }
    });
  } finally {
    await fd.close();
  }

  let update = new Date(updateTime);
  console.log(`  Update time: ${update}`);
  await fs.utimes(filePath, update, update);
}