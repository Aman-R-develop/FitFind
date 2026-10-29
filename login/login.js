var form = document.getElementById("login-form");
var message = document.getElementById("message");
var button = document.getElementById("login-button");

form.addEventListener("submit", async function (event) {
  // Stop the page refreshing when the form is submitted.
  event.preventDefault();
  if (button.disabled) return;
  document.getElementById("continue-link").hidden = true;
  var name = document.getElementById("name");
  var email = document.getElementById("email");
  name.value = name.value.trim();
  email.value = email.value.trim();

  if (name.value.length < 2 || name.value.length > 60) {
    message.textContent = "Please enter a name between 2 and 60 characters.";
    name.focus();
    return;
  }
  if (!email.validity.valid || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    message.textContent = "Please enter a valid email, like you@example.com.";
    email.focus();
    return;
  }

  if (!window.showOpenFilePicker) {
    message.textContent = "This browser cannot edit local files. Open this page in desktop Chrome or Edge.";
    return;
  }

  button.disabled = true;
  message.textContent = "Choose data/logins.json and allow editing when asked.";
  try {
    // The browser needs you to select the existing file before it can edit it.
    var files = await window.showOpenFilePicker({
      multiple: false,
      types: [{ description: "JSON file", accept: { "application/json": [".json"] } }]
    });
    var fileHandle = files[0];
    if (fileHandle.name !== "logins.json") {
      message.textContent = "Please submit again and choose logins.json inside the data folder.";
      return;
    }

    // Read old entries first, so they are not lost.
    var file = await fileHandle.getFile();
    var logins = JSON.parse(await file.text());
    if (!Array.isArray(logins)) {
      message.textContent = "The file must contain a JSON array, like []. Nothing was changed.";
      return;
    }
    var login = {
      name: name.value,
      email: email.value,
      submittedAt: new Date().toISOString()
    };
    logins.push(login);

    // Write back to the SAME file. This does not download or create a new file.
    var writer = await fileHandle.createWritable();
    await writer.write(JSON.stringify(logins, null, 2) + "\n");
    await writer.close();
    message.textContent = "Your details were saved in the selected logins.json file.";

    // Remember the demo user for the profile and logout pages.
    try {
      sessionStorage.setItem("fitfindName", login.name);
      sessionStorage.setItem("fitfindEmail", login.email);
      document.getElementById("continue-link").hidden = false;
    } catch (error) {
      message.textContent += " Browser storage is blocked, so your profile cannot remember this login.";
    }
  } catch (error) {
    if (error.name === "AbortError") {
      message.textContent = "Saving was cancelled. Submit again to choose the file.";
    } else if (error.name === "SyntaxError") {
      message.textContent = "The file contains invalid JSON. Nothing was changed.";
    } else {
      message.textContent = "Could not save. Submit again, choose data/logins.json and allow editing.";
    }
  } finally {
    button.disabled = false;
  }
});
