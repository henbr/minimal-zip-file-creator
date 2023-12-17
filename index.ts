// Minimal ZIP file creator library
// Copyright (C) 2023 Henrik Brandt
//
// The CRC32 implementation in this file is a port of the "Slicing-by-4"
// implementation by Stephan Brumme. Copyright of original code:
// Copyright (C) 2011-2016 Stephan Brumme. All rights reserved.
//
// See LICENSE file for license details.

export type FileData = {
  readonly name: string;
  readonly content: string | Uint8Array | ArrayBuffer;
  readonly date?: number | Date;
};

export function createZip(files: ReadonlyArray<FileData>): ArrayBuffer {
  // Collect all data related to the files
  const today = Date.now();
  const fileData = files.map((f) => {
    const content =
      f.content instanceof Uint8Array
        ? f.content
        : typeof f.content === "string"
        ? new TextEncoder().encode(f.content)
        : new Uint8Array(f.content);
    const crc32 = calculateCrc32(content);
    return {
      fileName: f.name,
      fileSize: content.length,
      lastModified: f.date ?? today,
      content,
      crc32,
    };
  });

  // Create all necessary parts of the zip file, headers and file content
  const fileParts = [];
  let filePartSize = 0;
  let totalCentralHeaderSize = 0;
  for (const fd of fileData) {
    const localHeader = createFileHeader({ ...fd, type: "local" });
    const centralHeader = createFileHeader({
      ...fd,
      type: "central",
      localHeaderOffset: filePartSize,
    });
    fileParts.push({
      localHeader,
      centralHeader,
      content: fd.content,
    });
    filePartSize += localHeader.byteLength + fd.fileSize;
    totalCentralHeaderSize += centralHeader.byteLength;
  }

  const endDirectoryPart = createEndOfDirectoryRecord(
    files.length,
    totalCentralHeaderSize,
    filePartSize
  );

  // Create the zip file
  const allParts = [];
  let totalSize = 0;
  for (const { localHeader, content } of fileParts) {
    allParts.push(localHeader);
    allParts.push(content);
    totalSize += localHeader.byteLength + content.byteLength;
  }
  for (const { centralHeader } of fileParts) {
    allParts.push(centralHeader);
    totalSize += centralHeader.byteLength;
  }
  allParts.push(endDirectoryPart);
  totalSize += endDirectoryPart.byteLength;

  const zipData = new Uint8Array(totalSize);
  let zipOffset = 0;
  for (const part of allParts) {
    zipData.set(part, zipOffset);
    zipOffset += part.length;
  }

  return zipData.buffer;
}

function createFileHeader(
  data: (
    | { readonly type: "central"; readonly localHeaderOffset: number }
    | { readonly type: "local" }
  ) & {
    readonly fileName: string;
    readonly fileSize: number;
    readonly lastModified: Date | number;
    readonly crc32: number;
  }
): Uint8Array {
  const fileNameUtf8 = new TextEncoder().encode(data.fileName).slice(0, 0xffff);
  const isFileNameAscii = fileNameUtf8.every((b) => b <= 127);
  const header: Array<number> = [];

  // local file header signature     4 bytes  (0x04034b50)
  if (data.type === "local") {
    push32(header, 0x04034b50);
  } else {
    push32(header, 0x02014b50);
  }

  // version made by                 2 bytes
  if (data.type === "central") {
    if (isFileNameAscii) {
      // ntfs + version 1.0
      push16(header, 0x0a0a);
    } else {
      // ntfs + version 6.3 (6.3 added utf-8 support)
      push16(header, 0x0a3f);
    }
  }

  // version needed to extract       2 bytes
  push16(header, 0x0a0a); // ntfs + version 1.0

  // general purpose bit flag        2 bytes
  // UTF-8 storage mode
  const utf8Flag = isFileNameAscii
    ? 0b0000_0000_0000_0000
    : 0b0000_1000_0000_0000;
  push16(header, utf8Flag);

  // compression method              2 bytes
  // 0 - The file is stored (no compression)
  push16(header, 0);

  // last mod file time              2 bytes
  push16(header, createZipTime(data.lastModified));

  // last mod file date              2 bytes
  push16(header, createZipDate(data.lastModified));

  // crc-32                          4 bytes
  push32(header, data.crc32);

  // compressed size                 4 bytes
  push32(header, data.fileSize);

  // uncompressed size               4 bytes
  push32(header, data.fileSize);

  // file name length                2 bytes
  push16(header, fileNameUtf8.length);

  // extra field length              2 bytes
  // Not used
  push16(header, 0);

  if (data.type === "central") {
    // file comment length             2 bytes
    push16(header, 0);

    // disk number start               2 bytes
    push16(header, 0);

    // internal file attributes        2 bytes
    push16(header, 0);

    // external file attributes        4 bytes
    push32(header, 0);

    // relative offset of local header 4 bytes
    push32(header, data.localHeaderOffset);
  }

  // file name (variable size)
  header.push(...fileNameUtf8);

  // extra field (variable size)
  // Not used

  // file comment (variable size)
  // Not used

  return Uint8Array.from(header);
}

function createEndOfDirectoryRecord(
  numFiles: number,
  centralDirectorySize: number,
  centralDirectorySizeOffset: number
): Uint8Array {
  const header: Array<number> = [];
  // end of central dir signature    4 bytes  (0x06054b50)
  push32(header, 0x06054b50);

  // number of this disk             2 bytes
  push16(header, 0);

  // number of the disk with the
  // start of the central directory  2 bytes
  push16(header, 0);

  // total number of entries in the
  // central directory on this disk  2 bytes
  push16(header, numFiles);

  // total number of entries in
  // the central directory           2 bytes
  push16(header, numFiles);

  // size of the central directory   4 bytes
  push32(header, centralDirectorySize);

  // offset of start of central directory with respect to  the starting disk number        4 bytes
  push32(header, centralDirectorySizeOffset);

  // .ZIP file comment length        2 bytes
  push16(header, 0);

  // .ZIP file comment       (variable size)
  // Not used

  return Uint8Array.from(header);
}

function createZipDate(time: Date | number): number {
  const d = new Date(time);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return (
    ((year < 1980 ? 0 : year > 2107 ? 0x7f : year - 1980) << 9) |
    (month << 5) |
    day
  );
}

function createZipTime(time: Date | number): number {
  const d = new Date(time);
  const hour = d.getHours();
  const minute = d.getMinutes();
  const second = d.getSeconds();
  return (hour << 11) | (minute << 5) | (second >>> 1);
}

function push16(buffer: Array<number>, u16: number): void {
  buffer.push(u16 & 0xff);
  buffer.push((u16 >>> 8) & 0xff);
}

function push32(buffer: Array<number>, u16: number): void {
  buffer.push(u16 & 0xff);
  buffer.push((u16 >>> 8) & 0xff);
  buffer.push((u16 >>> 16) & 0xff);
  buffer.push((u16 >>> 24) & 0xff);
}

let crc32Lookup: ReadonlyArray<Uint32Array> | undefined = undefined;
function calculateCrc32Lookup(): ReadonlyArray<Uint32Array> {
  if (crc32Lookup) {
    return crc32Lookup;
  }
  crc32Lookup = Array.from({ length: 8 }, () => new Uint32Array(256));
  const [lut0, lut1, lut2, lut3, lut4, lut5, lut6, lut7] = crc32Lookup;
  for (let i = 0; i <= 0xff; i++) {
    let crc = i;
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ ((crc & 1) * 0xedb88320);
    }
    lut0[i] = crc;
  }
  for (let i = 0; i <= 0xff; i++) {
    lut1[i] = (lut0[i] >>> 8) ^ lut0[lut0[i] & 0xff];
    lut2[i] = (lut1[i] >>> 8) ^ lut0[lut1[i] & 0xff];
    lut3[i] = (lut2[i] >>> 8) ^ lut0[lut2[i] & 0xff];
    lut4[i] = (lut3[i] >>> 8) ^ lut0[lut3[i] & 0xff];
    lut5[i] = (lut4[i] >>> 8) ^ lut0[lut4[i] & 0xff];
    lut6[i] = (lut5[i] >>> 8) ^ lut0[lut5[i] & 0xff];
    lut7[i] = (lut6[i] >>> 8) ^ lut0[lut6[i] & 0xff];
  }
  return crc32Lookup;
}

function calculateCrc32(data: Uint8Array, previousCrc32 = 0): number {
  const [lut0, lut1, lut2, lut3, lut4, lut5, lut6, lut7] =
    calculateCrc32Lookup();
  let crc = ~previousCrc32;
  let offset32 = 0;
  const data32 = new Uint32Array(data.buffer, 0, data.buffer.byteLength >>> 2);
  const len8bytes = data32.length & 0xfffffffe;
  let one = 0;
  let two = 0;
  while (offset32 < len8bytes) {
    one = data32[offset32++] ^ crc;
    two = data32[offset32++];
    crc =
      lut7[one & 0xff] ^
      lut6[(one >>> 8) & 0xff] ^
      lut5[(one >>> 16) & 0xff] ^
      lut4[one >>> 24] ^
      lut3[two & 0xff] ^
      lut2[(two >>> 8) & 0xff] ^
      lut1[(two >>> 16) & 0xff] ^
      lut0[two >>> 24];
  }
  let offset = offset32 * 4;
  while (offset < data.length) {
    crc = (crc >>> 8) ^ lut0[(crc & 0xff) ^ data[offset++]];
  }
  return ~crc;
}
