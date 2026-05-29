/* =========================================================
   ACADMEFORGE CLEAN APP JS
   - No duplicate function names
   - No dead Supabase/Razorpay calls
   - LocalStorage powered demo data
========================================================= */

(() => {
  "use strict";

  /* =========================================================
     STATE / DATA
  ========================================================== */
  const STORE = {
    student: "af_clean_student",
    courses: "af_clean_courses",
    posts: "af_clean_posts",
    requests: "af_clean_requests",
    activity: "af_clean_activity",
    theme: "af_clean_theme",
    notificationsSeen: "af_clean_notifications_seen"
  };

  const courses = [
    { id: "video-editing", icon: "🎬", title: "Video & Media Editing Mastery", desc: "Editing, storytelling, reels, shorts, and content creation." },
    { id: "graphic-design", icon: "🎨", title: "Creative & Graphic Design Mastery", desc: "Posters, thumbnails, banners, brand creatives, and visual content." },
    { id: "ai-coding", icon: "💻", title: "AI Coding & Logic Foundation", desc: "Coding logic, AI basics, prompts, and programming thinking." },
    { id: "freelancing", icon: "💼", title: "Freelancing & Monetization Roadmap", desc: "Client work, service packaging, pricing, and digital earning." },
    { id: "prompt-engineering", icon: "🤖", title: "AI & Prompt Engineering", desc: "AI tools, prompt structure, workflows, and productivity." }
  ];

  const notifications = [
    { type: "General", title: "Beta update", message: "AF Nexus is being updated with cleaner sections and faster navigation.", date: "2026-05-29" },
    { type: "Batch", title: "Skill batches", message: "Five skill batches are available in the Batches section.", date: "2026-05-29" },
    { type: "Test", title: "Test Arena", message: "A local sample quiz is available after login.", date: "2026-05-29" }
  ];

  const testQuestions = [
    { q: "What does HTML mainly define?", options: ["Page structure", "Database rules", "Payment gateway", "Server hosting"], answer: 0 },
    { q: "Which skill is useful for clear AI output?", options: ["Prompt writing", "Random clicking", "Slow typing", "Closing tabs"], answer: 0 },
    { q: "CSS is mainly used for what?", options: ["Styling pages", "Charging phones", "Sending OTP", "Buying domains"], answer: 0 },
    { q: "A good learner should be", options: ["Consistent", "Always distracted", "Careless", "Inactive"], answer: 0 },
    { q: "AF Nexus is the app's", options: ["Community space", "Battery saver", "Keyboard", "Camera"], answer: 0 }
  ];

  let bannerIndex = 0;
  let bannerTimer = null;
  let activeFeed = "all";
  let activeTestQuestion = 0;
  let testAnswers = {};

  /* =========================================================
     DOM HELPERS
  ========================================================== */
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function words(value) {
    const text = String(value || "").trim();
    return text ? text.split(/\s+/).filter(Boolean).length : 0;
  }

  function toast(message) {
    const node = $("#toast");
    if (!node) return;
    node.textContent = message;
    node.classList.add("show");
    window.clearTimeout(window.__afToast);
    window.__afToast = window.setTimeout(() => node.classList.remove("show"), 2400);
  }

  function message(node, text, type) {
    if (!node) return;
    node.textContent = text || "";
    node.className = text ? `message show ${type || "ok"}` : "message";
  }

  function getStudent() {
    return readJson(STORE.student, null);
  }

  function setStudent(student) {
    if (student) {
      writeJson(STORE.student, student);
    } else {
      localStorage.removeItem(STORE.student);
    }
    syncStudentUI();
  }

  function isLoggedIn() {
    return Boolean(getStudent());
  }

  /* =========================================================
     NAVIGATION
  ========================================================== */
  function showSection(id) {
    const target = document.getElementById(id);
    if (!target) return;

    $$(".section").forEach(section => section.classList.remove("active"));
    target.classList.add("active");

    $$(".nav-btn").forEach(button => {
      button.classList.toggle("active", button.dataset.sectionLink === id);
    });

    if (id === "community") renderCommunity();
    if (id === "batches") renderBatches();
    if (id === "notifications") renderNotifications(true);
    if (id === "profile") renderProfile();
    if (id === "testArena") renderTestGate();
    if (id === "learningHeatmap") renderHeatmap();
    if (id === "requestStatus") renderRequests();

    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function bindNavigation() {
    document.addEventListener("click", event => {
      const link = event.target.closest("[data-section-link]");
      if (!link) return;
      event.preventDefault();
      showSection(link.dataset.sectionLink);
    });

    $("#profileCardBtn")?.addEventListener("click", () => {
      showSection(isLoggedIn() ? "profile" : "student");
    });

    $("#settingsProfileBtn")?.addEventListener("click", () => {
      showSection(isLoggedIn() ? "profile" : "student");
    });

    $("#contactBtn")?.addEventListener("click", () => showSection("contact"));
    $("#bugStatusBtn")?.addEventListener("click", () => showSection("requestStatus"));
  }

  /* =========================================================
     SPLASH / THEME
  ========================================================== */
  function initSplash() {
    window.setTimeout(() => $("#splashScreen")?.classList.add("hide"), 900);
  }

  function initTheme() {
    const saved = localStorage.getItem(STORE.theme) || "light";
    document.documentElement.dataset.theme = saved;
    const toggle = $("#themeToggle");
    if (toggle) toggle.checked = saved === "dark";

    toggle?.addEventListener("change", () => {
      const next = toggle.checked ? "dark" : "light";
      document.documentElement.dataset.theme = next;
      localStorage.setItem(STORE.theme, next);
    });
  }

  /* =========================================================
     BANNER
  ========================================================== */
  function initBanner() {
    const slides = $$(".banner-slide");
    const dots = $("#bannerDots");
    if (!slides.length || !dots) return;

    dots.innerHTML = slides.map((_, index) => `<button type="button" aria-label="Banner ${index + 1}"></button>`).join("");
    const dotButtons = $$("button", dots);

    function show(index) {
      bannerIndex = (index + slides.length) % slides.length;
      slides.forEach((slide, i) => slide.classList.toggle("active", i === bannerIndex));
      dotButtons.forEach((dot, i) => dot.classList.toggle("active", i === bannerIndex));
    }

    dotButtons.forEach((dot, index) => dot.addEventListener("click", () => {
      show(index);
      restart();
    }));

    function restart() {
      window.clearInterval(bannerTimer);
      bannerTimer = window.setInterval(() => show(bannerIndex + 1), 3600);
    }

    show(0);
    restart();
  }

  /* =========================================================
     AUTH / STUDENT DASHBOARD
  ========================================================== */
  function initAuth() {
    $("[data-auth-tab='login']")?.addEventListener("click", () => switchAuth("login"));
    $("[data-auth-tab='create']")?.addEventListener("click", () => switchAuth("create"));

    $("#loginForm")?.addEventListener("submit", event => {
      event.preventDefault();
      const id = $("#loginId").value.trim();
      const password = $("#loginPassword").value.trim();
      const saved = readJson(`af_clean_account_${id}`, null);
      const msg = $("#authMessage");

      if (!id || !password) {
        message(msg, "Enter Student ID and password.", "err");
        return;
      }

      if (!saved || saved.password !== password) {
        message(msg, "Invalid Student ID or password.", "err");
        return;
      }

      setStudent(saved.student);
      message(msg, "Login successful.", "ok");
      renderCourseDashboard();
    });

    $("#createForm")?.addEventListener("submit", event => {
      event.preventDefault();
      const name = $("#createName").value.trim();
      const phone = $("#createPhone").value.replace(/\D/g, "");
      const email = $("#createEmail").value.trim().toLowerCase();
      const password = $("#createPassword").value.trim();
      const msg = $("#authMessage");

      if (name.length < 2 || phone.length < 10 || !email.includes("@") || password.length < 4) {
        message(msg, "Fill valid name, phone, email, and a 4+ character password.", "err");
        return;
      }

      const student = { id: `stu_${Date.now()}`, studentId: phone, name, phone, email };
      writeJson(`af_clean_account_${phone}`, { student, password });
      setStudent(student);
      message(msg, "Student ID created successfully.", "ok");
      renderCourseDashboard();
    });

    $("#logoutBtn")?.addEventListener("click", logout);
    $("#settingsLogoutBtn")?.addEventListener("click", logout);
  }

  function switchAuth(mode) {
    $("#loginTab")?.classList.toggle("active", mode === "login");
    $("#createTab")?.classList.toggle("active", mode === "create");
    $("#loginForm")?.classList.toggle("hidden", mode !== "login");
    $("#createForm")?.classList.toggle("hidden", mode !== "create");
    message($("#authMessage"), "", "ok");
  }

  function renderCourseDashboard() {
    const student = getStudent();
    $("#authCard")?.classList.toggle("hidden", Boolean(student));
    $("#courseDashboard")?.classList.toggle("hidden", !student);

    if (!student) return;

    $("#studentWelcome").textContent = `Welcome ${student.name}`;
    const enrolled = readJson(STORE.courses, ["prompt-engineering"]);
    $("#courseGrid").innerHTML = courses
      .filter(course => enrolled.includes(course.id))
      .map(course => `
        <button class="course-card" type="button">
          <span class="card-icon">${course.icon}</span>
          <span><strong>${escapeHtml(course.title)}</strong><small>${escapeHtml(course.desc)}</small></span>
        </button>
      `).join("") || `<div class="mini-card"><strong>Oops!</strong><small>You are not enrolled in any batch. Enroll from the Batches section.</small></div>`;
  }

  function logout() {
    setStudent(null);
    renderCourseDashboard();
    renderCommunity();
    renderTestGate();
    showSection("home");
    toast("Logged out successfully.");
  }

  function syncStudentUI() {
    const student = getStudent();
    const name = student?.name || "Student";
    const logged = Boolean(student);

    $("#homeProfileName").textContent = logged ? `Hi, ${name}` : "Hi, Student";
    $("#homeProfileSub").textContent = logged ? "View Profile" : "Login to view profile";
    $("#settingsName").textContent = logged ? `Hi, ${name}` : "Hi, Student";
  }

  /* =========================================================
     PROFILE / NAME EDIT / DELETE REQUEST
  ========================================================== */
  function renderProfile() {
    const student = getStudent();
    if (!student) {
      showSection("student");
      return;
    }

    $("#profileAvatar").textContent = student.name.charAt(0).toUpperCase();
    $("#profileName").textContent = student.name;
    $("#infoName").textContent = student.name;
    $("#infoEmail").textContent = student.email;
    $("#infoPhone").textContent = student.phone;

    const enrolled = readJson(STORE.courses, ["prompt-engineering"]);
    $("#profileBatchList").innerHTML = courses
      .filter(course => enrolled.includes(course.id))
      .map(course => `<div class="mini-card"><strong>${course.icon} ${escapeHtml(course.title)}</strong><small>Active</small></div>`)
      .join("") || `<p class="mini-card">No enrolled course found.</p>`;
  }

  function initProfile() {
    $("#editNameBtn")?.addEventListener("click", () => {
      const student = getStudent();
      if (!student) return;
      $("#nameInput").value = student.name;
      $("#nameModal").showModal();
    });

    $("#nameForm")?.addEventListener("submit", event => {
      event.preventDefault();
      const student = getStudent();
      const name = $("#nameInput").value.trim().replace(/\s+/g, " ");
      if (!student || name.length < 2) return;
      setStudent({ ...student, name });
      $("#nameModal").close();
      renderProfile();
      toast("Name updated successfully.");
    });

    $("#extraSettingsToggle")?.addEventListener("click", () => {
      $("#extraSettingsBody")?.classList.toggle("hidden");
    });

    $("#deleteAccountBtn")?.addEventListener("click", () => {
      openModal("Account Deletion Request", "Your deletion request has been recorded locally. In production, connect this button to your secure backend review workflow.");
    });
  }

  /* =========================================================
     BATCHES
  ========================================================== */
  function initBatches() {
    $("#batchSearch")?.addEventListener("input", renderBatches);
  }

  function renderBatches() {
    const query = ($("#batchSearch")?.value || "").trim().toLowerCase();
    const enrolled = readJson(STORE.courses, ["prompt-engineering"]);
    const list = courses.filter(course => `${course.title} ${course.desc}`.toLowerCase().includes(query));
    $("#batchCount").textContent = `${list.length} batches available`;
    $("#batchGrid").innerHTML = list.map(course => {
      const isEnrolled = enrolled.includes(course.id);
      return `
        <article class="batch-card">
          <div class="batch-art">${course.icon}</div>
          <div class="batch-body">
            <h3>${escapeHtml(course.title)}</h3>
            <p>${escapeHtml(course.desc)}</p>
            <div class="price-row"><strong>₹499</strong><del>₹999</del><span>50% OFF</span></div>
            <button class="${isEnrolled ? "secondary-btn" : "primary-btn"} full" type="button" data-enroll="${course.id}" ${isEnrolled ? "disabled" : ""}>
              ${isEnrolled ? "Already Enrolled" : "Enroll Now"}
            </button>
          </div>
        </article>
      `;
    }).join("");

    $$("[data-enroll]").forEach(button => {
      button.addEventListener("click", () => enrollCourse(button.dataset.enroll));
    });
  }

  function enrollCourse(courseId) {
    if (!isLoggedIn()) {
      toast("Please login first.");
      showSection("student");
      return;
    }
    const enrolled = new Set(readJson(STORE.courses, ["prompt-engineering"]));
    enrolled.add(courseId);
    writeJson(STORE.courses, Array.from(enrolled));
    renderBatches();
    renderCourseDashboard();
    toast("Batch access added.");
  }

  /* =========================================================
     COMMUNITY
  ========================================================== */
  function initCommunity() {
    $("#postInput")?.addEventListener("input", () => {
      $("#postCount").textContent = `${words($("#postInput").value)} / 80 words`;
    });

    $("#postForm")?.addEventListener("submit", event => {
      event.preventDefault();
      const student = getStudent();
      const input = $("#postInput");
      const content = input.value.trim();
      if (!student) return;
      if (!content || words(content) > 80) {
        toast("Post must be between 1 and 80 words.");
        return;
      }
      const posts = readJson(STORE.posts, []);
      posts.unshift({ id: Date.now(), studentId: student.id, name: student.name, content, likes: 0, createdAt: new Date().toISOString() });
      writeJson(STORE.posts, posts);
      input.value = "";
      $("#postCount").textContent = "0 / 80 words";
      renderCommunity();
    });

    $$("[data-feed]").forEach(button => {
      button.addEventListener("click", () => {
        activeFeed = button.dataset.feed;
        $$("[data-feed]").forEach(btn => btn.classList.toggle("active", btn === button));
        renderPosts();
      });
    });
  }

  function renderCommunity() {
    const logged = isLoggedIn();
    $("#communityLocked")?.classList.toggle("hidden", logged);
    $("#communityMain")?.classList.toggle("hidden", !logged);
    if (logged) renderPosts();
  }

  function renderPosts() {
    const student = getStudent();
    const all = readJson(STORE.posts, []);
    const posts = activeFeed === "mine" ? all.filter(post => post.studentId === student?.id) : all;
    $("#postsList").innerHTML = posts.map(post => `
      <article class="post-card">
        <div class="post-top">
          <div><strong>${escapeHtml(post.name)}</strong><small>${new Date(post.createdAt).toLocaleString()}</small></div>
          ${post.studentId === student?.id ? `<button class="small-btn" type="button" data-delete-post="${post.id}">Delete</button>` : ""}
        </div>
        <p>${escapeHtml(post.content)}</p>
        <div class="post-actions"><button type="button" data-like-post="${post.id}">❤️ ${post.likes || 0}</button></div>
      </article>
    `).join("") || `<div class="mini-card"><strong>No posts yet.</strong><small>Start the first discussion.</small></div>`;

    $$("[data-like-post]").forEach(button => button.addEventListener("click", () => {
      const posts = readJson(STORE.posts, []);
      const post = posts.find(item => String(item.id) === String(button.dataset.likePost));
      if (post) post.likes = Number(post.likes || 0) + 1;
      writeJson(STORE.posts, posts);
      renderPosts();
    }));

    $$("[data-delete-post]").forEach(button => button.addEventListener("click", () => {
      const posts = readJson(STORE.posts, []).filter(item => String(item.id) !== String(button.dataset.deletePost));
      writeJson(STORE.posts, posts);
      renderPosts();
    }));
  }

  /* =========================================================
     TEST ARENA
  ========================================================== */
  function renderTestGate() {
    const logged = isLoggedIn();
    $("#testLocked")?.classList.toggle("hidden", logged);
    $("#testMain")?.classList.toggle("hidden", !logged);
    if (logged) startTestPreview();
  }

  function startTestPreview() {
    activeTestQuestion = 0;
    testAnswers = {};
    renderQuestion();
  }

  function renderQuestion() {
    const q = testQuestions[activeTestQuestion];
    if (!q) return renderTestResult();

    $("#testArea").innerHTML = `
      <div class="question-card">
        <strong>Question ${activeTestQuestion + 1} of ${testQuestions.length}</strong>
        <h3>${escapeHtml(q.q)}</h3>
        <div class="option-grid">
          ${q.options.map((option, index) => `<button type="button" data-option="${index}" class="${testAnswers[activeTestQuestion] === index ? "active" : ""}">${escapeHtml(option)}</button>`).join("")}
        </div>
        <div class="modal-actions" style="margin-top:12px">
          <button class="secondary-btn" type="button" id="prevQuestion" ${activeTestQuestion === 0 ? "disabled" : ""}>Previous</button>
          <button class="primary-btn" type="button" id="nextQuestion">${activeTestQuestion === testQuestions.length - 1 ? "Submit" : "Next"}</button>
        </div>
      </div>
    `;

    $$("[data-option]").forEach(button => button.addEventListener("click", () => {
      testAnswers[activeTestQuestion] = Number(button.dataset.option);
      renderQuestion();
    }));
    $("#prevQuestion")?.addEventListener("click", () => {
      activeTestQuestion = Math.max(0, activeTestQuestion - 1);
      renderQuestion();
    });
    $("#nextQuestion")?.addEventListener("click", () => {
      activeTestQuestion += 1;
      renderQuestion();
    });
  }

  function renderTestResult() {
    const score = testQuestions.reduce((total, q, index) => total + (testAnswers[index] === q.answer ? 1 : 0), 0);
    $("#testArea").innerHTML = `
      <div class="question-card">
        <h3>Test Submitted</h3>
        <p>Your score is <strong>${score}/${testQuestions.length}</strong>.</p>
        <button class="primary-btn full" type="button" id="restartTest">Try Again</button>
      </div>
    `;
    $("#restartTest")?.addEventListener("click", startTestPreview);
  }

  /* =========================================================
     NOTIFICATIONS / HEATMAP / REQUESTS
  ========================================================== */
  function renderNotifications(markSeen = false) {
    $("#notificationsList").innerHTML = notifications.map(item => `
      <div class="mini-card">
        <strong>${escapeHtml(item.title)}</strong>
        <small>${escapeHtml(item.type)} · ${escapeHtml(item.date)}</small>
        <p>${escapeHtml(item.message)}</p>
      </div>
    `).join("");

    if (markSeen) {
      localStorage.setItem(STORE.notificationsSeen, "yes");
      $("#notificationDot")?.classList.add("hidden");
    }
  }

  function initHeatmap() {
    $("#refreshHeatmap")?.addEventListener("click", renderHeatmap);
    window.setTimeout(markActivity, 10000);
  }

  function markActivity() {
    if (!isLoggedIn()) return;
    const activity = readJson(STORE.activity, {});
    const today = new Date().toISOString().slice(0, 10);
    activity[today] = true;
    writeJson(STORE.activity, activity);
    renderHeatmap();
  }

  function renderHeatmap() {
    const activity = readJson(STORE.activity, {});
    const days = getCurrentWeekDays();
    const streak = calculateStreak(activity);
    $("#headerStreak").textContent = streak;
    $("#heatmapStreak").textContent = streak;
    $("#heatmapStatus").textContent = streak ? `Current streak: ${streak} day(s).` : "Use the app for 10 seconds today.";
    $("#weekGrid").innerHTML = days.map(day => `
      <div class="day-box ${activity[day.key] ? "active" : ""}">
        <span>${day.label}</span>
        <strong>${activity[day.key] ? "✓" : "-"}</strong>
      </div>
    `).join("");
  }

  function getCurrentWeekDays() {
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const now = new Date();
    const monday = new Date(now);
    const day = (now.getDay() + 6) % 7;
    monday.setDate(now.getDate() - day);
    return labels.map((label, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return { label, key: date.toISOString().slice(0, 10) };
    });
  }

  function calculateStreak(activity) {
    let streak = 0;
    const cursor = new Date();
    for (let i = 0; i < 365; i += 1) {
      const key = cursor.toISOString().slice(0, 10);
      if (!activity[key]) break;
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  function initRequests() {
    $("#bugReportBtn")?.addEventListener("click", () => {
      const requests = readJson(STORE.requests, []);
      requests.unshift({ type: "Bug Report", title: "Bug report", message: "Bug report opened from settings.", status: "Pending", date: new Date().toISOString() });
      writeJson(STORE.requests, requests);
      toast("Bug report recorded locally.");
    });

    $("#contactForm")?.addEventListener("submit", event => {
      event.preventDefault();
      const requests = readJson(STORE.requests, []);
      requests.unshift({
        type: "Contact",
        title: $("#contactReason").value,
        message: $("#contactProblem").value.trim(),
        status: "Pending",
        date: new Date().toISOString()
      });
      writeJson(STORE.requests, requests);
      event.target.reset();
      toast("Contact request submitted locally.");
      showSection("requestStatus");
    });
  }

  function renderRequests() {
    const requests = readJson(STORE.requests, []);
    $("#requestStatusList").innerHTML = requests.map(req => `
      <div class="mini-card">
        <strong>${escapeHtml(req.title)}</strong>
        <small>${escapeHtml(req.type)} · ${new Date(req.date).toLocaleString()}</small>
        <p>${escapeHtml(req.message)}</p>
        <small>Status: ${escapeHtml(req.status)}</small>
      </div>
    `).join("") || `<div class="mini-card"><strong>No request found.</strong><small>Your bug/contact requests will appear here.</small></div>`;
  }

  function openModal(title, text) {
    $("#genericTitle").textContent = title;
    $("#genericText").textContent = text;
    $("#genericModal").showModal();
  }

  function initModal() {
    $("#genericClose")?.addEventListener("click", () => $("#genericModal").close());
  }

  /* =========================================================
     INIT
  ========================================================== */
  document.addEventListener("DOMContentLoaded", () => {
    initSplash();
    initTheme();
    initBanner();
    bindNavigation();
    initAuth();
    initProfile();
    initBatches();
    initCommunity();
    initHeatmap();
    initRequests();
    initModal();

    if (!localStorage.getItem(STORE.notificationsSeen)) {
      $("#notificationDot")?.classList.remove("hidden");
    }

    syncStudentUI();
    renderCourseDashboard();
    renderBatches();
    renderHeatmap();
    renderNotifications(false);

    const hash = location.hash.replace("#", "");
    if (hash && document.getElementById(hash)) showSection(hash);
  });
})();
