let upload = null;
let uploadIsRunning = false;

const fileInput = document.getElementById("fileInput");
const uploadButton = document.getElementById("upload-btn");
const uploadedSizeDiv = document.getElementById("uploadedSize");
const totalSizeDiv = document.getElementById("totalSize");
const progressBar = document.getElementById("progressBar");
const uploadList = document.getElementById("upload-list");

// function to start upload file using tus
function startUploadFile() {
  const file = fileInput.files[0];

  if (file) {
    uploadButton.textContent = "Pause upload";
    const options = {
      // Endpoint is the upload creation URL from your tus server
      endpoint: "/tus/upload/",
      chunkSize: 5242880, //chunk size to breakdown file into
      parallelUploads: 10, //no of parralel request Django is synchronous in nature so, parallel upload doesn't have advantage
      // Retry delays will enable tus-js-client to automatically retry on errors
      retryDelays: [0, 3000, 5000, 10000, 20000],
      // Attach additional meta data about the file for the server
      metadata: {
        filename: file.name,
        filetype: file.type,
      },
      // Callback for errors which cannot be fixed using retries
      onError(error) {
        if (error.originalRequest) {
          if (
            window.confirm(`Failed because: ${error}\nDo you want to retry?`)
          ) {
            upload.start();
            uploadIsRunning = true;
            return;
          }
        } else {
          window.alert(`Failed because: ${error}`);
        }

        reset();
      },
      // Callback for reporting upload progress
      onProgress: function (bytesUploaded, bytesTotal) {
        const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2);
        // Calculate sizes in MB
        const totalSizeMB = (bytesTotal / (1024 * 1024)).toFixed(2);
        const uploadedSizeMB = (bytesUploaded / (1024 * 1024)).toFixed(2);
        progressBar.style.width = `${percentage}%`;

        // Update size information
        uploadedSizeDiv.textContent = uploadedSizeMB + " MB";
        totalSizeDiv.textContent = totalSizeMB + " MB";
      },
      // Callback for once the upload is completed
      onSuccess: function () {
        console.log(upload);
        addUploadItem(upload.file.name, upload.file.size);
        reset();
      },
    };
    // Create a new tus upload
    upload = new tus.Upload(file, options);
    uploadIsRunning = true;

    // Check if there are any previous uploads to continue.
    upload.findPreviousUploads().then((previousUploads) => {
      askToResumeUpload(previousUploads, upload);

      upload.start();
      uploadIsRunning = true;
    });
  } else {
    alert("Please select a file to upload");
  }
}

function reset() {
  uploadButton.textContent = "Upload";
  upload = null;
  uploadIsRunning = false;
}

function askToResumeUpload(previousUploads, currentUpload) {
  if (previousUploads.length === 0) return;

  let text = "You tried to upload this file previously at these times:\n\n";
  previousUploads.forEach((previousUpload, index) => {
    text += `[${index}] ${previousUpload.creationTime}\n`;
  });
  text +=
    "\nEnter the corresponding number to resume an upload or press Cancel to start a new upload";

  const answer = prompt(text);
  const index = parseInt(answer, 10);

  if (!Number.isNaN(index) && previousUploads[index]) {
    currentUpload.resumeFromPreviousUpload(previousUploads[index]);
  }
}

// Function to add an upload item to the "uploads" div
function addUploadItem(fileName, fileSize) {
  const uploadsDiv = document.getElementById("uploads");

  // Create a new div for the upload item
  const uploadItemDiv = document.createElement("div");
  uploadItemDiv.classList.add("upload-item");

  // Create a link for the filename
  const fileNameLink = document.createElement("a");
  fileNameLink.href = "/media/uploads/" + fileName;
  fileNameLink.textContent = fileName;

  // Create a span for the file size
  const fileSizeSpan = document.createElement("span");
  fileSizeSpan.textContent = ` | Size: ${(fileSize / (1024 * 1024)).toFixed(
    2
  )} MB`;

  // Append the link and size span to the upload item div
  uploadItemDiv.appendChild(fileNameLink);
  uploadItemDiv.appendChild(fileSizeSpan);

  // Append the upload item div to the "uploads" div
  uploadsDiv.appendChild(uploadItemDiv);
}

uploadButton.addEventListener("click", (e) => {
  e.preventDefault();

  if (upload) {
    if (uploadIsRunning) {
      upload.abort();
      uploadButton.textContent = "Resume upload";
      uploadIsRunning = false;
    } else {
      upload.start();
      uploadButton.textContent = "Pause upload";
      uploadIsRunning = true;
    }
  } else {
    startUploadFile();
  }
});
