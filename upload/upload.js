var fileInput = document.getElementById("file");
var preview = document.getElementById("preview");
var message = document.getElementById("upload-message");
var previewUrl = "";

document.getElementById("choose-file").addEventListener("click", function () {
  fileInput.click();
});

fileInput.addEventListener("change", function () {
  var file = fileInput.files[0];
  preview.hidden = true;
  preview.removeAttribute("src");
  message.textContent = "";
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  if (!file) return;

  if (file.type !== "image/jpeg" && file.type !== "image/png" && file.type !== "image/webp") {
    message.textContent = "Please choose a JPG, PNG or WEBP image.";
    fileInput.value = "";
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    message.textContent = "Please choose an image smaller than 5 MB.";
    fileInput.value = "";
    return;
  }
  // Show the file in the browser. It is not sent to the server.
  previewUrl = URL.createObjectURL(file);
  preview.src = previewUrl;
  preview.hidden = false;
  message.textContent = file.name + " — preview only. Matches below are demo examples.";
});

preview.addEventListener("error", function () {
  preview.hidden = true;
  fileInput.value = "";
  message.textContent = "This image could not be opened. Please choose another file.";
});
