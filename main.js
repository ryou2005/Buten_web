import { initializeHomeSchedule } from "./home-schedule.js";

document.addEventListener("DOMContentLoaded", () => {
  const homeScheduleList = document.querySelector("#schedule .schedule-list");
  if (homeScheduleList) initializeHomeSchedule(homeScheduleList);

  // Mobile Menu Toggle
  const menuToggle = document.querySelector(".menu-toggle");
  const mainNav = document.getElementById("main-nav");
  const bars = document.querySelectorAll(".bar");

  if (menuToggle && mainNav) {
    menuToggle.addEventListener("click", () => {
      const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";

      // Accessibility Update
      menuToggle.setAttribute("aria-expanded", !isExpanded);

      if (!isExpanded) {
        mainNav.classList.add("open");
      } else {
        mainNav.classList.remove("open");
      }
    });
  }

  // Smooth Scroll for Anchors
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const targetId = this.getAttribute("href");
      if (targetId === "#") return;

      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        // Close menu if mobile
        if (
          window.innerWidth < 768 &&
          menuToggle.getAttribute("aria-expanded") === "true"
        ) {
          menuToggle.click();
        }

        targetElement.scrollIntoView({
          behavior: "smooth",
        });
      }
    });
  });
  // Slideshow Logic
  const slides = document.querySelectorAll(".slide");
  let currentSlide = 0;

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

  if (slides.length > 0) {
    if (document.readyState === "complete") {
      loadSlide(slides[1]);
    } else {
      window.addEventListener("load", () => loadSlide(slides[1]));
    }

    setInterval(() => {
      slides[currentSlide].classList.remove("active");
      currentSlide = (currentSlide + 1) % slides.length;
      slides[currentSlide].classList.add("active");
      loadSlide(slides[(currentSlide + 1) % slides.length]);
    }, 5000); // Change every 5 seconds
  }

  // Loader Logic
  // 画像の読み込み完了（load）を待つと本文の表示が大きく遅れるため、DOM構築後すぐに消す
  const loader = document.getElementById("loader");
  if (loader) loader.classList.add("hidden");

  // Schedule Filter Logic
  const filterBtns = document.querySelectorAll(".filter-btn");
  const scheduleCards = document.querySelectorAll(".schedule-card");

  if (filterBtns.length > 0 && scheduleCards.length > 0) {
    filterBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        // Update active button
        filterBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

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

  // Flyer Lightbox
  const flyerLinks = document.querySelectorAll(".schedule-flyer");

  if (flyerLinks.length > 0 && typeof HTMLDialogElement === "function") {
    const lightbox = document.createElement("dialog");
    lightbox.className = "flyer-lightbox";
    lightbox.innerHTML =
      '<button class="flyer-lightbox-close" aria-label="閉じる">&times;</button><img alt="">';
    document.body.appendChild(lightbox);

    const lightboxImg = lightbox.querySelector("img");
    lightbox.querySelector(".flyer-lightbox-close").addEventListener("click", () => lightbox.close());
    // Close when clicking the backdrop
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) lightbox.close();
    });

    flyerLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        lightboxImg.src = link.href;
        lightboxImg.alt = link.querySelector("img")?.alt || "";
        lightbox.showModal();
      });
    });
  }

  // Performances Filter Logic
  const yearBtns = document.querySelectorAll(".year-btn");
  const yearSections = document.querySelectorAll(".year-section");

  if (yearBtns.length > 0 && yearSections.length > 0) {
    const filterPerformances = (year) => {
      yearSections.forEach((section) => {
        const sectionYear = section.dataset.year;
        // Check if the section belongs to "older" category (2022 or earlier)
        // sectionYear can be "older" string or a year number
        const yearNum = parseInt(sectionYear, 10);
        const isOlder = sectionYear === "older" || (!isNaN(yearNum) && yearNum <= 2022);

        if (year === "all") {
          // Show recent (not older)
          if (!isOlder) {
            section.classList.add("active");
          } else {
            section.classList.remove("active");
          }
        } else if (year === "older") {
          // Show only older
          if (isOlder) {
            section.classList.add("active");
          } else {
            section.classList.remove("active");
          }
        } else {
          // Specific year
          if (sectionYear == year) {
            section.classList.add("active");
          } else {
            section.classList.remove("active");
          }
        }
      });
    };

    // Initial check
    const activeBtn = document.querySelector(".year-btn.active");
    if (activeBtn) {
      filterPerformances(activeBtn.dataset.year);
    }

    yearBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        yearBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        const year = btn.dataset.year;
        filterPerformances(year);
      });
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
