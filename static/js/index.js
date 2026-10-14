const subjects = ["biologie", "chemie", "fysica", "informatica", "nederlands", "wiskunde"];

/* =========================
   Random subject
========================= */

const randomSubjectBtn = document.getElementById("random-subject-btn");

if (randomSubjectBtn) {
  randomSubjectBtn.addEventListener("click", () => {
    const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
    const icon = document.querySelector("#random-subject-btn i");

    if (icon) icon.classList.add("fa-spin");

    setTimeout(() => {
      window.location.href = `/${randomSubject}`;
    }, 400);
  });
}

async function loadTopics() {
}

/* =========================
   Mobile menu
========================= */

const hamburgerBtn = document.getElementById("hamburger-btn");
const mobileMenu = document.getElementById("mobile-menu");

if (hamburgerBtn && mobileMenu) {
  hamburgerBtn.addEventListener("click", () => {
    const open = mobileMenu.classList.toggle("open");
    hamburgerBtn.classList.toggle("open", open);
    hamburgerBtn.setAttribute("aria-expanded", open);
  });
}

/* =========================
   Active navigation
========================= */

document.querySelectorAll(".nav-links a, .mobile-menu a").forEach(link => {
  const href = link.getAttribute("href");
  if (!href) return;

  const cleanHref = href.replace("./", "/").replace(".html", "");

  const active = cleanHref === "/index"
    ? location.pathname === "/" || location.pathname === "/index" || location.pathname === "/index.html"
    : location.pathname.startsWith(cleanHref);

  if (active) link.classList.add("active");
});

/* =========================
   Auth system
========================= */

function setLoggedIn(state, username = "") {
  const guest = document.getElementById("auth-guest");
  const user = document.getElementById("auth-user");
  const usernameOutput = document.getElementById("auth-username");

  if (guest) guest.style.display = state ? "none" : "flex";
  if (user) user.style.display = state ? "flex" : "none";
  if (usernameOutput) usernameOutput.textContent = username;
}

// Resets all coin/stats localStorage keys to zero.
// Called on every login, register, and logout so the badge
// always reflects the correct server-side state (coins start at 0).
function resetLocalStats() {
  const clean = { coins: 0, level: 1, completedLeaves: {}, subjectProgress: {} };
  localStorage.setItem('skalor_user_stats', JSON.stringify(clean));
  localStorage.removeItem('skalor_vakken');

  // Update any coin badge that's already visible on the page
  const coinEl = document.getElementById('coin-count');
  if (coinEl) coinEl.textContent = '0';
  document.querySelectorAll('.player-level-display').forEach(el => el.textContent = '1');
}

function getAuthInputs(button) {
  const authBar = button?.closest(".auth-bar") || document.querySelector(".auth-bar");

  if (!authBar) {
    alert("Auth bar niet gevonden.");
    return null;
  }

  const usernameInput = authBar.querySelector("#login-username");
  const passwordInput = authBar.querySelector("#login-password");

  if (!usernameInput || !passwordInput) {
    alert("Gebruikersnaam- of wachtwoordveld niet gevonden.");
    return null;
  }

  return {
    usernameInput,
    passwordInput,
    username: usernameInput.value.trim(),
    password: passwordInput.value
  };
}

async function checkAuthStatus() {
  try {
    const response = await fetch("/api/auth/me");
    const data = await response.json();

    if (!data.authenticated) {
      setLoggedIn(false);
      return;
    }

    setLoggedIn(true, data.user.username);

  } catch (error) {
    console.error(error);
    setLoggedIn(false);
  }
}

async function loginInline(button) {
  const inputs = getAuthInputs(button);
  if (!inputs) return;

  const { usernameInput, passwordInput, username, password } = inputs;

  if (!username || !password) {
    alert("Vul gebruikersnaam en wachtwoord in.");
    return;
  }

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.detail || "Login mislukt");
      return;
    }

    usernameInput.value = "";
    passwordInput.value = "";

    resetLocalStats();
    setLoggedIn(true, data.user.username);
    // Load server-side progress into localStorage
    if (window.ProgressSync) await ProgressSync.onLogin();

  } catch (err) {
    console.error(err);
    alert("Server fout bij login.");
  }
}

/* =========================
   Registration Modal
========================= */

function openRegisterModal() {
  const modal = document.getElementById("register-modal");
  if (modal) modal.style.display = "flex";
}

function closeRegisterModal() {
  const modal = document.getElementById("register-modal");
  if (modal) modal.style.display = "none";
}

async function registerModalSubmit() {
  const username = document.getElementById("reg-username").value.trim();
  const password = document.getElementById("reg-password").value;
  const confirmPassword = document.getElementById("reg-confirm-password").value;

  if (!username || !password) {
    alert("Vul alle velden in.");
    return;
  }

  if (password !== confirmPassword) {
    alert("Wachtwoorden komen niet overeen.");
    return;
  }

  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.detail || "Registreren mislukt");
      return;
    }

    // Succes!
    closeRegisterModal();
    resetLocalStats();
    setLoggedIn(true, data.user.username);
    alert("Welkom bij Skalor, " + data.user.username + "!");

  } catch (error) {
    console.error(error);
    alert("Server fout bij registreren.");
  }
}

async function logout() {
  try {
    await fetch("/api/auth/logout", {
      method: "POST"
    });

    if (window.ProgressSync) ProgressSync.onLogout();
    resetLocalStats();
    setLoggedIn(false);

  } catch (error) {
    console.error(error);
    alert("Server fout bij uitloggen.");
  }
}

checkAuthStatus();

/* =========================
   Document upload quiz
========================= */

async function uploadDocument() {
  const fileInput = document.getElementById("document-upload");
  const output = document.getElementById("generated-quiz");

  if (!fileInput || !output) return;

  if (!fileInput.files.length) {
    output.innerHTML = `<p class="upload-message">Kies eerst een bestand.</p>`;
    return;
  }

  const file = fileInput.files[0];
  const allowedExtensions = [".txt", ".docx"];

  const isAllowed = allowedExtensions.some(extension =>
    file.name.toLowerCase().endsWith(extension)
  );

  if (!isAllowed) {
    output.innerHTML = `<p class="upload-message">Alleen .txt en .docx bestanden zijn toegestaan.</p>`;
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  output.innerHTML = `<p class="upload-message">Quiz wordt gegenereerd...</p>`;

  try {
    const response = await fetch("/api/upload/generate-quiz", {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      output.innerHTML = `<p class="upload-message">${data.detail || "Er ging iets mis."}</p>`;
      return;
    }

    output.innerHTML = `
      <div class="generated-quiz-header">
        <h3>Quiz gegenereerd uit: ${data.filename}</h3>
        <p>${data.question_count} vragen gemaakt.</p>
      </div>
    `;

    data.questions.forEach((question, index) => {
      const questionCard = document.createElement("div");
      questionCard.className = "generated-question";

      questionCard.innerHTML = `
        <h4>Vraag ${index + 1}</h4>
        <p class="generated-question-text">${question.question}</p>
        <div class="generated-options">
          ${question.options.map((option, optionIndex) => `
            <button
              class="generated-option"
              onclick="checkGeneratedAnswer(this, ${optionIndex}, ${question.answer})"
            >
              ${String.fromCharCode(65 + optionIndex)}. ${option}
            </button>
          `).join("")}
        </div>
        <p class="generated-feedback"></p>
      `;

      output.appendChild(questionCard);
    });

  } catch (error) {
    console.error(error);
    output.innerHTML = `<p class="upload-message">Fout bij uploaden.</p>`;
  }
}

function checkGeneratedAnswer(button, selectedIndex, correctIndex) {
  const card = button.closest(".generated-question");
  const buttons = card.querySelectorAll(".generated-option");
  const feedback = card.querySelector(".generated-feedback");

  buttons.forEach((btn, index) => {
    btn.disabled = true;

    if (index === correctIndex) btn.classList.add("correct");
    if (index === selectedIndex && selectedIndex !== correctIndex) btn.classList.add("wrong");
  });

  if (selectedIndex === correctIndex) {
    feedback.textContent = "Correct!";
    feedback.className = "generated-feedback correct-text";
  } else {
    feedback.textContent = `Fout. Het juiste antwoord is: ${buttons[correctIndex].textContent}`;
    feedback.className = "generated-feedback wrong-text";
  }
}

/* =========================
   Expose functions
========================= */

window.loginInline = loginInline;
window.openRegisterModal = openRegisterModal;
window.closeRegisterModal = closeRegisterModal;
window.registerModalSubmit = registerModalSubmit;
window.logout = logout;
window.uploadDocument = uploadDocument;
window.checkGeneratedAnswer = checkGeneratedAnswer;
window.setLoggedIn = setLoggedIn;
window.resetLocalStats = resetLocalStats;