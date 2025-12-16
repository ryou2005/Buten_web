

document.addEventListener('DOMContentLoaded', () => {
  // Mobile Menu Toggle
  const menuToggle = document.querySelector('.menu-toggle');
  const mainNav = document.getElementById('main-nav');
  const bars = document.querySelectorAll('.bar');

  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', () => {
      const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
      
      // Accessibility Update
      menuToggle.setAttribute('aria-expanded', !isExpanded);
      
      if (!isExpanded) {
        mainNav.classList.add('open');
      } else {
        mainNav.classList.remove('open');
      }
    });
  }

  // Smooth Scroll for Anchors
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        // Close menu if mobile
        if (window.innerWidth < 768 && menuToggle.getAttribute('aria-expanded') === 'true') {
           menuToggle.click();
        }

        targetElement.scrollIntoView({
          behavior: 'smooth'
        });
      }
    });
  });
  // Slideshow Logic
  const slides = document.querySelectorAll('.slide');
  let currentSlide = 0;

  if (slides.length > 0) {
    setInterval(() => {
      slides[currentSlide].classList.remove('active');
      currentSlide = (currentSlide + 1) % slides.length;
      slides[currentSlide].classList.add('active');
    }, 5000); // Change every 5 seconds
  }

  // Loader Logic
  window.addEventListener('load', () => {
    const loader = document.getElementById('loader');
    if (loader) {
        // Add a small delay for branding effect
        setTimeout(() => {
            loader.classList.add('hidden');
        }, 800);
    }
  });

  // Schedule Filter Logic
  const filterBtns = document.querySelectorAll('.filter-btn');
  const scheduleCards = document.querySelectorAll('.schedule-card');

  if (filterBtns.length > 0 && scheduleCards.length > 0) {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        // Update active button
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filterValue = btn.textContent.trim();
        
        scheduleCards.forEach(card => {
          if (filterValue === 'すべて') {
            card.style.display = ''; // Reset to CSS default (flex)
          } else {
            // Extract year from button text (e.g., "2025年" -> "2025")
            const targetYear = filterValue.replace('年', '');
            const cardYear = card.querySelector('.year')?.textContent.trim();
            
            if (cardYear === targetYear) {
              card.style.display = '';
            } else {
              card.style.display = 'none';
            }
          }
        });
      });
    });
  }
});
