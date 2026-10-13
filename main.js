import { initializeHomeSchedule } from "./home-schedule.js";
import { hidePastScheduleCards } from "./schedule-events.js";
import { addPastScheduleToHistory } from "./performance-archive.js";

document.addEventListener("DOMContentLoaded", () => {
  const homeScheduleList = document.querySelector("#schedule .schedule-list");
  if (homeScheduleList) initializeHomeSchedule(homeScheduleList);

  // 公演予定ページ：日付が過ぎた公演は一覧から外す（公演実績ページに自動で載る）
  const scheduleList = document.querySelector(".detailed-schedule-list");
  if (scheduleList) hidePastScheduleCards(scheduleList);

  // Loader（オープニング）
  // 筆文字ロゴを見せてから幕を上げる。同じ訪問の中では2回目以降は出さない（head 内のスクリプトで判定）
  const root = document.documentElement;
  const loader = document.getElementById("loader");
  const finishLoading = () => {
    loader?.classList.add("done");
    root.classList.add("loaded");
    try {
      sessionStorage.setItem("buten-opening", "1");
    } catch {
      // 保存できない環境では毎回表示されるだけなので無視する
    }
  };
  const skipLoader = !loader || root.classList.contains("no-loader") || matchMedia("(prefers-reduced-motion: reduce)").matches;
  setTimeout(finishLoading, skipLoader ? 0 : 1700);

  // Header：トップページではメイン写真を過ぎたら生成りの背景にする
  const header = document.getElementById("site-header");
  const bgWords = document.querySelectorAll(".bg-word");
  const onScroll = () => {
    header?.classList.toggle("scrolled", window.scrollY > 40);
    // 背景の大きな英字をスクロールより少し遅れて動かす
    bgWords.forEach((word) => {
      const top = word.parentElement.getBoundingClientRect().top;
      word.style.setProperty("--shift", `${Math.round(top * -0.12)}px`);
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Mobile Menu Toggle
  const menuBtn = document.getElementById("menu-btn");
  const mainNav = document.getElementById("main-nav");
  const setMenu = (open) => {
    mainNav.classList.toggle("open", open);
    header?.classList.toggle("menu-open", open);
    menuBtn.setAttribute("aria-expanded", open);
    menuBtn.textContent = open ? "CLOSE" : "MENU";
  };
  if (menuBtn && mainNav) {
    menuBtn.addEventListener("click", () => setMenu(!mainNav.classList.contains("open")));
    mainNav.addEventListener("click", (e) => {
      if (e.target.closest("a")) setMenu(false);
    });
  }

  // Slideshow：スライドと下部の進行バーを連動させる
  const slides = document.querySelectorAll(".hero-slide");
  const progress = document.getElementById("hero-progress");

  // 2枚目以降の画像は data-src に置き、表示の1つ前に読み込む
  const loadSlide = (slide) => {
    if (!slide?.dataset.src) return;
    if (slide.dataset.srcset) {
      slide.sizes = "(max-aspect-ratio: 4/3) 140vh, 100vw";
      slide.srcset = slide.dataset.srcset;
    }
    slide.src = slide.dataset.src;
    delete slide.dataset.src;
    delete slide.dataset.srcset;
  };

  if (slides.length > 0 && progress) {
    slides.forEach(() => {
      const bar = document.createElement("span");
      bar.append(document.createElement("i"));
      progress.append(bar);
    });
    const bars = progress.children;
    let currentSlide = 0;
    const showSlide = (index) => {
      slides[currentSlide].classList.remove("active");
      [...bars].forEach((bar, n) => {
        bar.classList.toggle("done", n < index);
        bar.classList.remove("active");
      });
      currentSlide = index;
      slides[currentSlide].classList.add("active");
      loadSlide(slides[(currentSlide + 1) % slides.length]);
      // 幅0の状態を一度描画してから伸ばす
      requestAnimationFrame(() => requestAnimationFrame(() => bars[currentSlide].classList.add("active")));
    };

    if (document.readyState === "complete") {
      loadSlide(slides[1]);
    } else {
      window.addEventListener("load", () => loadSlide(slides[1]));
    }
    showSlide(0);
    setInterval(() => showSlide((currentSlide + 1) % slides.length), 6000);
  }

  // スクロールで現れる動き（.reveal / .curtain）と数字のカウントアップ
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const countUp = (el) => {
    if (reduceMotion) return;
    const target = Number(el.dataset.count);
    const from = target > 1000 ? target - 30 : 0;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / 1400, 1);
      el.textContent = Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const revealTargets = document.querySelectorAll(".reveal, .curtain");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("in");
          entry.target.querySelectorAll("[data-count]").forEach(countUp);
          observer.unobserve(entry.target);
        }),
      { threshold: 0.15 },
    );
    revealTargets.forEach((el) => observer.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add("in"));
  }

  // Schedule Filter Logic
  const filterBtns = document.querySelectorAll(".filter-btn");
  const scheduleCards = document.querySelectorAll(".schedule-card");

  if (filterBtns.length > 0 && scheduleCards.length > 0) {
    filterBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        // Update active button
        filterBtns.forEach((b) => {
          b.classList.toggle("active", b === btn);
          b.setAttribute("aria-pressed", b === btn);
        });

        const filterValue = btn.textContent.trim();

        scheduleCards.forEach((card) => {
          if (filterValue === "すべて") {
            card.style.display = ""; // Reset to CSS default (flex)
          } else {
            // Extract year from button text (e.g., "2025年" -> "2025")
            const targetYear = filterValue.replace("年", "");
            const cardYear = card.querySelector(".year")?.textContent.trim();

            if (cardYear === targetYear) {
              card.style.display = "";
            } else {
              card.style.display = "none";
            }
          }
        });
      });
    });
  }

  // チラシ・写真の拡大表示（あとから足される公演実績のチラシにも効くよう、クリックをまとめて受ける）
  if (typeof HTMLDialogElement === "function") {
    let lightbox;
    const openLightbox = (link) => {
      if (!lightbox) {
        lightbox = document.createElement("dialog");
        lightbox.className = "flyer-lightbox";
        lightbox.innerHTML =
          '<button class="flyer-lightbox-close" aria-label="閉じる">&times;</button><img alt="">';
        document.body.appendChild(lightbox);
        lightbox.querySelector(".flyer-lightbox-close").addEventListener("click", () => lightbox.close());
        // 画像の外側を押したら閉じる
        lightbox.addEventListener("click", (e) => {
          if (e.target === lightbox) lightbox.close();
        });
      }
      const img = lightbox.querySelector("img");
      img.src = link.href;
      img.alt = link.querySelector("img")?.alt || "";
      lightbox.showModal();
    };
    document.addEventListener("click", (e) => {
      const link = e.target.closest(".schedule-flyer, .flyer-link, .photo-link");
      if (!link) return;
      e.preventDefault();
      openLightbox(link);
    });
  }

  // 公演実績：年の切り替え（公演予定から年が足されることがあるので、毎回ページから探す）
  const perfHistory = document.querySelector(".perf-history");
  if (perfHistory) {
    const filterPerformances = (year) => {
      perfHistory.querySelectorAll(".year-section").forEach((section) => {
        const sectionYear = section.dataset.year;
        // 2022年以前は「それ以前」にまとめる
        const yearNum = parseInt(sectionYear, 10);
        const isOlder = sectionYear === "older" || (!isNaN(yearNum) && yearNum <= 2022);
        const show = year === "all" ? !isOlder : year === "older" ? isOlder : sectionYear === year;
        section.classList.toggle("active", show);
      });
    };
    const currentYear = () => perfHistory.querySelector(".year-btn.active")?.dataset.year || "all";

    filterPerformances(currentYear());

    perfHistory.querySelector(".year-filters")?.addEventListener("click", (e) => {
      const btn = e.target.closest(".year-btn");
      if (!btn) return;
      perfHistory.querySelectorAll(".year-btn").forEach((b) => {
        b.classList.toggle("active", b === btn);
        b.setAttribute("aria-pressed", b === btn);
      });
      filterPerformances(btn.dataset.year);
    });

    // 公演予定ページで日付が過ぎた公演を足し、表示し直す
    addPastScheduleToHistory(perfHistory).then((added) => {
      if (added) filterPerformances(currentYear());
    });
  }

  // Workshop Schedule Status Logic
  const workshopItems = document.querySelectorAll(".section-news .news-item");
  if (workshopItems.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    workshopItems.forEach((item) => {
      const dateElement = item.querySelector(".news-date");
      const applyBtn = item.querySelector(".apply-btn");
      if (!dateElement || !applyBtn) return;

      const dateText = dateElement.textContent.trim();
      const matched = dateText.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/);
      if (!matched) return;

      const year = Number(matched[1]);
      const month = Number(matched[2]) - 1;
      const day = Number(matched[3]);
      const eventDate = new Date(year, month, day);

      if (eventDate < today) {
        item.classList.add("is-ended");
        applyBtn.classList.add("is-ended");
        applyBtn.textContent = "終了";
        applyBtn.setAttribute("aria-disabled", "true");
        applyBtn.setAttribute("tabindex", "-1");
        applyBtn.removeAttribute("href");
      }
    });
  }


  // Contact Form Submission Handler
  // Contact Form Submission Handler
  const contactForm = document.getElementById("contact-form"); // Changed from querySelector to getElementById to match HTML
  if (contactForm) {
    const subjectSelect = document.getElementById("subject");
    const subjectParam = new URLSearchParams(window.location.search).get("subject");
    if (
      subjectSelect &&
      subjectParam &&
      Array.from(subjectSelect.options).some((option) => option.value === subjectParam)
    ) {
      subjectSelect.value = subjectParam;
    }

    // API Endpoint - Read from HTML data attribute or fallback to placeholder
    const API_ENDPOINT = contactForm.dataset.apiEndpoint || "https://18vkro0bm3.execute-api.ap-northeast-1.amazonaws.com/prod";

    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.textContent;

      // Get or create message container
      let messageContainer = contactForm.querySelector(".form-message");
      if (!messageContainer) {
        messageContainer = document.createElement("div");
        messageContainer.className = "form-message";
        // Insert after the form actions/button
        contactForm
          .querySelector(".form-actions")
          .insertAdjacentElement("beforebegin", messageContainer);
      }

      // Clear previous messages and show loading state
      messageContainer.style.display = "block";
      messageContainer.className = "form-message";
      messageContainer.textContent = "";

      if (!contactForm.reportValidity()) {
        messageContainer.style.display = "none";
        return;
      }

      // Disable form and show loading
      submitBtn.disabled = true;
      submitBtn.textContent = "送信中...";
      contactForm.classList.add("submitting");

      // Collect form data
      const formData = {
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        tel: document.getElementById("tel").value,
        subject: document.getElementById("subject").value,
        message: document.getElementById("message").value,
        privacyConsent: document.getElementById("privacy-consent").checked,
      };

      try {
        // If API_ENDPOINT is not set (still using placeholder), simulate success for testing
        if (API_ENDPOINT === "YOUR_API_GATEWAY_URL_HERE" || API_ENDPOINT === "") {
          console.warn("API Endpoint not configured. Simulating success.");
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate network delay
          // Determine subject label for the alert
          const subjectLabel =
            document.getElementById("subject").options[
              document.getElementById("subject").selectedIndex
            ].text;
          alert(
            `【テストモード】\n以下の内容で送信しました（実際には送られていません）。\n\n件名: ${subjectLabel}\nお名前: ${formData.name}\n\nAPIエンドポイントを設定すると実際に送信されます。`,
          );

          contactForm.reset();
          messageContainer.style.display = "none";
          throw new Error("TEST_MODE"); // Break flow to avoid fetch
        }

        const response = await fetch(API_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          // Success
          messageContainer.className = "form-message success";
          messageContainer.textContent =
            result.message ||
            "お問い合わせを受け付けました。ありがとうございます。通常1週間に内に返信いたします。1週間以内に返信がない場合、お手数ですが、instagramまたはfacebookのDMよりご連絡ください。";
          contactForm.reset();
        } else {
          // Error from server
          messageContainer.className = "form-message error";
          if (result.details && Array.isArray(result.details)) {
            messageContainer.textContent = result.details.join("\n");
          } else {
            messageContainer.textContent =
              result.error || "送信に失敗しました。もう一度お試しください。";
          }
        }
      } catch (error) {
        if (error.message === "TEST_MODE") {
          // Handled above
        } else {
          console.error("Form submission error:", error);
          messageContainer.className = "form-message error";
          messageContainer.textContent =
            "通信エラーが発生しました。インターネット接続を確認してください。";
        }
      } finally {
        // Re-enable form
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
        contactForm.classList.remove("submitting");
      }
    });
  }
});
