import { createZip } from "minimal-zip-file-creator";
import { saveAs } from "file-saver";

async function createZipFile(filesToZip) {
  const fileEntries = await Promise.all(
    filesToZip.map(async (file) => ({
      name: file.name,
      content: await file.arrayBuffer(),
      date: file.lastModified,
    }))
  );
  const zip = createZip(fileEntries);
  saveAs(new Blob([zip]), "example.zip");
}

const dropzoneEl = document.getElementById("dropzone");
const placeholderEl = document.getElementById("placeholder");
const fileListEl = document.getElementById("filelist");
const downloadButtonEl = document.getElementById("download");

let addedFiles = [];

setupDropzone();
setupDownloadButton();

function setupDownloadButton() {
  downloadButtonEl.addEventListener("click", async () => {
    if (addedFiles.length === 0) {
      return;
    }

    const oldButtonContent = downloadButtonEl.textContent;
    downloadButtonEl.textContent = "Creating zip...";
    downloadButtonEl.disabled = true;

    const filesToZip = addedFiles;
    addedFiles = [];
    updateFileList();

    await createZipFile(filesToZip);

    downloadButtonEl.textContent = oldButtonContent;
    downloadButtonEl.disabled = false;
  });
}

function setupDropzone() {
  dropzoneEl.addEventListener("dragover", (event) => {
    event.preventDefault();
  });
  dropzoneEl.addEventListener("drop", (event) => {
    event.preventDefault();
    for (const file of event.dataTransfer.files) {
      addedFiles.push(file);
    }
    updateFileList();
  });
}

function updateFileList() {
  fileListEl.innerHTML = "";
  if (addedFiles.length > 0) {
    fileListEl.classList.remove("hidden");
    placeholderEl.classList.add("hidden");
    downloadButtonEl.disabled = false;
    for (const file of addedFiles) {
      const el = document.createElement("li");
      el.classList.add("file-list-item");
      el.textContent = file.name;
      fileListEl.appendChild(el);
    }
  } else {
    fileListEl.classList.add("hidden");
    placeholderEl.classList.remove("hidden");
    downloadButtonEl.disabled = true;
  }
}
