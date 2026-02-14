document.addEventListener("DOMContentLoaded", () => {
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

  if (slides.length > 0) {
    setInterval(() => {
      slides[currentSlide].classList.remove("active");
      currentSlide = (currentSlide + 1) % slides.length;
      slides[currentSlide].classList.add("active");
    }, 5000); // Change every 5 seconds
  }

  // Loader Logic
  // Loader Logic
  const hideLoader = () => {
    const loader = document.getElementById("loader");
    if (loader) {
      // Add a small delay for branding effect
      setTimeout(() => {
        loader.classList.add("hidden");
      }, 800);
    }
  };

  if (document.readyState === "complete") {
    hideLoader();
  } else {
    window.addEventListener("load", hideLoader);
  }

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


  // Contact Form Submission Handler
  // Contact Form Submission Handler
  const contactForm = document.getElementById("contact-form"); // Changed from querySelector to getElementById to match HTML
  if (contactForm) {
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
