// Animations
AOS.init({
  anchorPlacement: 'top-left',
  duration: 1000
});


document.getElementById("toggleExperience").addEventListener("click", function() {
  var content = document.getElementById("experienceContent");
  var icon = document.getElementById("toggleIcon");
  if (content.style.display === "none" || content.style.display === "") {
      content.style.display = "block";
      icon.style.transform = "rotate(180deg)";
  } else {
      content.style.display = "none";
      icon.style.transform = "rotate(0deg)";
  }
});

document.getElementById("toggleExperience1").addEventListener("click", function() {
  var content = document.getElementById("experienceContent1");
  var icon = document.getElementById("toggleIcon1");
  if (content.style.display === "none" || content.style.display === "") {
      content.style.display = "block";
      icon.style.transform = "rotate(180deg)";
  } else {
      content.style.display = "none";
      icon.style.transform = "rotate(0deg)";
  }
});

document.getElementById("toggleExperience2").addEventListener("click", function() {
  var content = document.getElementById("experienceContent2");
  var icon = document.getElementById("toggleIcon2");
  if (content.style.display === "none" || content.style.display === "") {
      content.style.display = "block";
      icon.style.transform = "rotate(180deg)";
  } else {
      content.style.display = "none";
      icon.style.transform = "rotate(0deg)";
  }
});

document.getElementById("toggleExperience3").addEventListener("click", function() {
  var content = document.getElementById("experienceContent3");
  var icon = document.getElementById("toggleIcon3");
  if (content.style.display === "none" || content.style.display === "") {
      content.style.display = "block";
      icon.style.transform = "rotate(180deg)";
  } else {
      content.style.display = "none";
      icon.style.transform = "rotate(0deg)";
  }
});

document.getElementById("toggleExperience4").addEventListener("click", function() {
  var content = document.getElementById("experienceContent4");
  var icon = document.getElementById("toggleIcon4");
  if (content.style.display === "none" || content.style.display === "") {
      content.style.display = "block";
      icon.style.transform = "rotate(180deg)";
  } else {
      content.style.display = "none";
      icon.style.transform = "rotate(0deg)";
  }
});