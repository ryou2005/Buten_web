

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

  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const name = document.getElementById('name').value;
      const email = document.getElementById('email').value;
      const tel = document.getElementById('tel').value;
      const subject = document.getElementById('subject').value;
      const message = document.getElementById('message').value;
      
      if(!name || !email || !subject || !message){
        alert('必須項目を入力してください。');
        return;
      }
      alert('お問い合わせありがとうございます。');
      this.reset();
    });
  }

  // Contact Form Submission Handler
  /*const contactForm = document.querySelector('.contact-form');
  if (contactForm) {
    // API endpoint - replace with your actual API Gateway URL after deployment
    const API_ENDPOINT = contactForm.dataset.apiEndpoint || '/api/contact';
    
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.textContent;
      
      // Get or create message container
      let messageContainer = contactForm.querySelector('.form-message');
      if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.className = 'form-message';
        contactForm.querySelector('.form-actions').insertAdjacentElement('beforebegin', messageContainer);
      }
      
      // Clear previous messages
      messageContainer.className = 'form-message';
      messageContainer.textContent = '';
      
      // Disable form and show loading
      submitBtn.disabled = true;
      submitBtn.textContent = '送信中...';
      contactForm.classList.add('submitting');
      
      // Collect form data
      const formData = {
        name: contactForm.querySelector('#name').value,
        email: contactForm.querySelector('#email').value,
        tel: contactForm.querySelector('#tel').value,
        subject: contactForm.querySelector('#subject').value,
        message: contactForm.querySelector('#message').value
      };
      
      try {
        const response = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
          // Success
          messageContainer.className = 'form-message success';
          messageContainer.textContent = result.message || 'お問い合わせを受け付けました。ありがとうございます。';
          contactForm.reset();
        } else {
          // Error from server
          messageContainer.className = 'form-message error';
          if (result.details && Array.isArray(result.details)) {
            messageContainer.textContent = result.details.join('\n');
          } else {
            messageContainer.textContent = result.error || '送信に失敗しました。もう一度お試しください。';
          }
        }
      } catch (error) {
        console.error('Form submission error:', error);
        messageContainer.className = 'form-message error';
        messageContainer.textContent = '通信エラーが発生しました。インターネット接続を確認してください。';
      } finally {
        // Re-enable form
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
        contactForm.classList.remove('submitting');
      }
    });
  }*/
});
