import { run, bench } from "mitata";
import { createZip } from "minimal-zip-file-creator";
const archiver =
  typeof window === "undefined" ? require("archiver") : undefined;
import jszip from "jszip";

const largeFile = new Uint8Array(1024 * 1024 * 100);
for (let i = 0; i < largeFile.length; i++) {
  largeFile[i] = Math.floor(Math.random() * 256);
}

bench("minimal-zip-file-creator", () => {
  createZip([
    {
      name: "small_image.gif",
      content: new Uint8Array([
        71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 0, 255, 0, 44, 0, 0, 0, 0, 1, 0, 1,
        0, 0, 2, 0, 59,
      ]),
    },
    {
      name: "folder/hello.txt",
      content: "Hello world!",
    },
    {
      name: "folder/old_hello.txt",
      content: "Hello world!",
      date: new Date("1980-01-01"),
    },
    {
      name: "largefile.bin",
      content: largeFile,
    },
  ]);
});

bench("jzip", async () => {
  const zip = new jszip();
  zip.file(
    "small_image.gif",
    new Uint8Array([
      71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 0, 255, 0, 44, 0, 0, 0, 0, 1, 0, 1, 0,
      0, 2, 0, 59,
    ])
  );
  zip.file("folder/hello.txt", "Hello world!");
  zip.file("folder/old_hello.txt", "Hello world!", {
    date: new Date("1980-01-01"),
  });
  zip.file("largefile.bin", largeFile);
  await zip.generateAsync({ type: "uint8array", compression: "STORE" });
});

if (archiver) {
  bench("archiver", async () => {
    const archive = archiver("zip", {
      store: true, // Disables compression
    });
    archive.append(
      Buffer.from(
        new Uint8Array([
          71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 0, 255, 0, 44, 0, 0, 0, 0, 1, 0,
          1, 0, 0, 2, 0, 59,
        ])
      ),
      { name: "small_image.gif" }
    );
    archive.append("Hello world!", { name: "folder/hello.txt" });
    archive.append("Hello world!", {
      name: "folder/old_hello.txt",
      date: new Date("1980-01-01"),
    });
    archive.append(Buffer.from(largeFile), { name: "largefile.bin" });
    archive.finalize();
    await new Promise<Buffer>((resolve, reject) => {
      const buffers: Array<Buffer> = [];
      archive.on("data", (data) => buffers.push(data));
      archive.on("end", () => resolve(Buffer.concat(buffers)));
      archive.on("error", reject);
    });
  });
}

export async function runBenchmark() {
  // Seems to require a few runs to get a stable result
  for (let i = 0; i < 3; i++) {
    await run({
      avg: true, // enable/disable avg column (default: true)
      json: false, // enable/disable json output (default: false)
      colors: typeof window === "undefined", // enable/disable colors (default: true)
      min_max: true, // enable/disable min/max column (default: true)
      collect: false, // enable/disable collecting returned values into an array during the benchmark (default: false)
      percentiles: false, // enable/disable percentiles column (default: true)
    });
  }
}

if (typeof window === "undefined") {
  runBenchmark();
}
