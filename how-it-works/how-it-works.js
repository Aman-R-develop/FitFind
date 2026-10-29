var questions = document.querySelectorAll(".faq-question");

for (var i = 0; i < questions.length; i++) {
  questions[i].addEventListener("click", function () {
    var answer = document.getElementById(this.getAttribute("aria-controls"));
    answer.hidden = !answer.hidden;
    this.setAttribute("aria-expanded", String(!answer.hidden));
  });
}
