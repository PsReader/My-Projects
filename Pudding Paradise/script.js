// ==========================================
// PUDDING PARADISE — Shared Script
// ==========================================

// --- Toast Notification ---
function showToast(message, type) {
  type = type || "info";
  var toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = "toast " + type;
  requestAnimationFrame(function () {
    toast.classList.add("show");
  });
  setTimeout(function () {
    toast.classList.remove("show");
  }, 3000);
}

// --- Menu Toggle ---
function toggleMenu() {
  var dropdown = document.getElementById("dropdownMenu");
  if (dropdown) dropdown.classList.toggle("active");
}

document.addEventListener("click", function (event) {
  var dropdown = document.getElementById("dropdownMenu");
  var menuIcon = document.querySelector(".menu-icon");
  if (
    dropdown &&
    menuIcon &&
    !dropdown.contains(event.target) &&
    !menuIcon.contains(event.target)
  ) {
    dropdown.classList.remove("active");
  }
});

// --- Scroll to Section (Home) ---
function scrollToSection(sectionId) {
  var section = document.getElementById(sectionId);
  if (section) {
    section.scrollIntoView({ behavior: "smooth" });
    var dd = document.getElementById("dropdownMenu");
    if (dd) dd.classList.remove("active");
  }
}

// --- Cart System (Home + Menu) ---
if (document.querySelector(".menu-grid") || document.querySelector(".menu-items")) {
  var cart = { strawberry: 0, coklat: 0, mangga: 0, oreo: 0 };

  window.updateQty = function (flavor, change) {
    var newVal = cart[flavor] + change;
    if (newVal < 0) newVal = 0;
    cart[flavor] = newVal;
    var el = document.getElementById("qty-" + flavor);
    if (el) el.textContent = newVal;
  };

  window.processOrder = function () {
    var message =
      "Halo Admin Pudding Paradise, saya {isi nama} dari {isi kelas} mau pesan:\n\n";
    var totalItems = 0;
    var flavors = ["strawberry", "coklat", "mangga", "oreo"];

    for (var i = 0; i < flavors.length; i++) {
      var f = flavors[i];
      if (cart[f] > 0) {
        var name = f.charAt(0).toUpperCase() + f.slice(1);
        message += "- Puding " + name + ": " + cart[f] + " pcs\n";
        totalItems += cart[f];
      }
    }

    if (totalItems === 0) {
      showToast("Pilih jumlah pudingnya dulu ya! Minimal 1.", "error");
      return;
    }

    message += "\nTolong diantarkan ke {isi nama ruang} ya, terima kasih!";

    var phoneNumber = "6288290295374";
    var url =
      "https://wa.me/" + phoneNumber + "?text=" + encodeURIComponent(message);
    window.open(url, "_blank");
  };
}

// --- Review System (Review page only) ---
if (document.querySelector(".review-list")) {
  var STORAGE_KEY = "puddingParadiseReviews";
  var selectedFeedbackRating = 0;
  var reviews = [];
  var reviewFilter = 0;

  var initialReviews = [
    {
      name: "Made",
      avatar: "M",
      stars: 5,
      text: "Puddingnya sangat lembut dan teksturnya sempurna. Rasa vanilanya juga pas, tidak terlalu manis. Recommended banget!",
      date: "2 hari yang lalu",
    },
    {
      name: "Qaiser",
      avatar: "Q",
      stars: 5,
      text: "Puddingnya lezat dan customer servicenya bagus sekali. Pengiriman cepat dan packaging rapi. Udah order 3x dan puas setiap kalinya!",
      date: "1 minggu yang lalu",
    },
    {
      name: "Rheindaru",
      avatar: "R",
      stars: 5,
      text: "Puddingnya lumer di mulut, bikin nagih! Saya udah order buat teman-teman dan mereka semua suka. Harganya juga sangat terjangkau.",
      date: "2 minggu yang lalu",
    },
    {
      name: "Aditya",
      avatar: "A",
      stars: 5,
      text: "Pertama kali order pudding dari Pudding Paradise dan wow, ini enak banget! Pilihan rasa strawberry dan coklat nya sama-sama oke. Pasti order lagi!",
      date: "3 minggu yang lalu",
    },
    {
      name: "Sinta",
      avatar: "S",
      stars: 5,
      text: "Makasih ya Pudding Paradise! Puddingnya fresh dan enak. Cocok jadi cemilan di sore hari. Admin juga ramah dan responsif.",
      date: "1 bulan yang lalu",
    },
  ];

  window.selectFeedbackRating = function (value) {
    selectedFeedbackRating = value;
    var stars = document.querySelectorAll("#feedbackStars .star-btn");
    for (var i = 0; i < stars.length; i++) {
      if (i < value) {
        stars[i].classList.add("active");
      } else {
        stars[i].classList.remove("active");
      }
    }
  };

  window.updateReviewFilter = function (value) {
    reviewFilter = Number(value);
    renderReviews();
  };

  function saveReviews() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
  }

  function loadReviews() {
    var stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        reviews = JSON.parse(stored);
        if (!Array.isArray(reviews)) reviews = initialReviews.slice();
      } catch (e) {
        reviews = initialReviews.slice();
        saveReviews();
      }
    } else {
      reviews = initialReviews.slice();
      saveReviews();
    }
    renderReviews();
  }

  function renderReviews() {
    var reviewList = document.querySelector(".review-list");
    if (!reviewList) return;
    reviewList.innerHTML = "";

    var filtered =
      reviewFilter > 0
        ? reviews.filter(function (r) {
            return r.stars === reviewFilter;
          })
        : reviews;

    if (filtered.length === 0) {
      reviewList.innerHTML =
        '<div class="review-card"><div class="review-text">Belum ada review dengan rating tersebut.</div></div>';
      return;
    }

    for (var i = 0; i < filtered.length; i++) {
      var review = filtered[i];
      var ratingStars =
        "★".repeat(review.stars) + "☆".repeat(5 - review.stars);
      var initial = String(review.avatar || "P").replace(/[^a-zA-Z0-9]/g, "");

      var card = document.createElement("div");
      card.className = "review-card";
      card.innerHTML =
        '<div class="review-header">' +
        '<div class="avatar"><div class="avatar-circle">' +
        initial +
        "</div></div>" +
        '<div class="review-user-info">' +
        '<div class="user-badge">' +
        review.name +
        "</div>" +
        '<div class="stars">' +
        ratingStars +
        "</div>" +
        "</div>" +
        "</div>" +
        '<div class="review-text">\u201c' +
        review.text +
        "\u201d</div>" +
        '<div class="review-date">' +
        review.date +
        "</div>";
      reviewList.appendChild(card);
    }
  }

  window.submitFeedback = function () {
    if (selectedFeedbackRating === 0) {
      showToast("Pilih rating bintang dulu ya!", "error");
      return;
    }

    var nameInput = document.getElementById("feedbackName");
    var textInput = document.getElementById("feedbackText");
    var name = nameInput.value.trim() || "Pelanggan";
    var message = textInput.value.trim() || "Feedback dari pelanggan baru.";

    reviews.unshift({
      name: name,
      avatar: name.charAt(0).toUpperCase(),
      stars: selectedFeedbackRating,
      text: message,
      date: "Baru saja",
    });

    saveReviews();
    renderReviews();

    nameInput.value = "";
    textInput.value = "";
    selectedFeedbackRating = 0;
    selectFeedbackRating(0);

    showToast("Terima kasih! Feedback Anda telah dikirim.", "success");
  };

  document.addEventListener("DOMContentLoaded", loadReviews);
}
