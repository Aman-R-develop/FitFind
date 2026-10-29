// Update navigation and profile text when the user logs in or out.
function showUser() {
  var name = "";
  var email = "";
  try {
    name = sessionStorage.getItem("fitfindName") || "";
    email = sessionStorage.getItem("fitfindEmail") || "";
  } catch (error) {
    // The pages can still be browsed when browser storage is blocked.
  }
  var link = document.getElementById("account-link");
  if (link) {
    link.textContent = name ? "Logout" : "Login";
    link.href = name ? "../logout/logout.html" : "../login/login.html";
  }
  if (document.getElementById("profile-name")) {
    document.getElementById("profile-name").textContent = name || "Style Explorer";
    document.getElementById("profile-email").textContent = email || "Log in to see your details here.";
  }
}
// pageshow also runs when someone uses the browser's Back button.
window.addEventListener("pageshow", showUser);
