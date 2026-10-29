document.getElementById("logout-button").addEventListener("click", function () {
  try {
    sessionStorage.removeItem("fitfindName");
    sessionStorage.removeItem("fitfindEmail");
    document.getElementById("logout-title").textContent = "You are logged out";
    document.getElementById("logout-message").textContent = "Thanks for visiting FitFind. See you again soon!";
    this.hidden = true;
  } catch (error) {
    document.getElementById("logout-message").textContent = "Please allow browser storage, then try logging out again.";
  }
});
