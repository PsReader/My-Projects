// Dynamic website functionality

// Tab functionality
function setupTabs() {
  const tabButtons = document.querySelectorAll('[data-tab-button]');
  const tabContents = document.querySelectorAll('[data-tab-content]');

  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      const tabName = this.getAttribute('data-tab-button');
      
      // Hide all tabs
      tabContents.forEach(content => {
        content.style.display = 'none';
        content.classList.remove('active');
      });
      
      // Remove active class from all buttons
      tabButtons.forEach(btn => btn.classList.remove('active'));
      
      // Show selected tab
      const selectedTab = document.querySelector(`[data-tab-content="${tabName}"]`);
      if (selectedTab) {
        selectedTab.style.display = 'block';
        selectedTab.classList.add('active');
        this.classList.add('active');
      }
    });
  });
}

// Accordion functionality
function setupAccordions() {
  const accordionHeaders = document.querySelectorAll('[data-accordion-header]');

  accordionHeaders.forEach(header => {
    header.addEventListener('click', function() {
      const content = this.nextElementSibling;
      
      // Close all other accordions
      document.querySelectorAll('[data-accordion-content]').forEach(item => {
        if (item !== content) {
          item.style.display = 'none';
          item.previousElementSibling.classList.remove('active');
        }
      });
      
      // Toggle current accordion
      this.classList.toggle('active');
      content.style.display = content.style.display === 'block' ? 'none' : 'block';
    });
  });
}

// Search functionality
function setupSearch() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;

  searchInput.addEventListener('keyup', function() {
    const searchTerm = this.value.toLowerCase();
    const searchableElements = document.querySelectorAll('[data-searchable]');
    
    searchableElements.forEach(element => {
      const text = element.textContent.toLowerCase();
      if (text.includes(searchTerm) || searchTerm === '') {
        element.style.display = 'block';
        element.classList.add('search-highlight');
      } else {
        element.style.display = 'none';
      }
    });
  });
}

// Smooth scroll to section
function setupSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}

// Modal functionality
function setupModals() {
  const modalTriggers = document.querySelectorAll('[data-modal-trigger]');
  const modals = document.querySelectorAll('[data-modal]');
  const closeButtons = document.querySelectorAll('[data-modal-close]');

  modalTriggers.forEach(trigger => {
    trigger.addEventListener('click', function() {
      const modalId = this.getAttribute('data-modal-trigger');
      const modal = document.querySelector(`[data-modal="${modalId}"]`);
      if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
      }
    });
  });

  closeButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const modal = this.closest('[data-modal]');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
      }
    });
  });

  // Close modal when clicking outside
  modals.forEach(modal => {
    modal.addEventListener('click', function(e) {
      if (e.target === this) {
        this.style.display = 'none';
        this.classList.remove('active');
      }
    });
  });
}

// Filter functionality
function setupFilters() {
  const filterButtons = document.querySelectorAll('[data-filter]');
  
  filterButtons.forEach(button => {
    button.addEventListener('click', function() {
      const filterValue = this.getAttribute('data-filter');
      const items = document.querySelectorAll('[data-filter-item]');
      
      // Update active button
      filterButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      
      // Filter items
      items.forEach(item => {
        if (filterValue === 'all' || item.getAttribute('data-filter-item') === filterValue) {
          item.style.display = 'block';
          item.classList.add('fade-in');
        } else {
          item.style.display = 'none';
        }
      });
    });
  });
}

// Dynamic navigation highlight
function setupActiveNavigation() {
  const currentPage = window.location.pathname.split('/').pop() || 'LOTMhome.html';
  const navLinks = document.querySelectorAll('.topnav a');
  
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'LOTMhome.html')) {
      link.classList.add('active-page');
      link.style.color = '#FFD700';
      link.style.fontWeight = 'bold';
    }
  });
}

// Lazy load images
function setupLazyLoading() {
  const images = document.querySelectorAll('img[data-lazy]');
  
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.src = entry.target.getAttribute('data-lazy');
          entry.target.removeAttribute('data-lazy');
          imageObserver.unobserve(entry.target);
        }
      });
    });
    
    images.forEach(img => imageObserver.observe(img));
  }
}

// Scroll to top button
function setupScrollToTop() {
  const scrollBtn = document.getElementById('scrollToTop');
  
  if (scrollBtn) {
    window.addEventListener('scroll', function() {
      if (window.pageYOffset > 300) {
        scrollBtn.style.display = 'block';
      } else {
        scrollBtn.style.display = 'none';
      }
    });
    
    scrollBtn.addEventListener('click', function() {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
}

// Initialize all features when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  setupTabs();
  setupAccordions();
  setupSearch();
  setupSmoothScroll();
  setupModals();
  setupFilters();
  setupActiveNavigation();
  setupLazyLoading();
  setupScrollToTop();
});

// Add animation on scroll
function setupScrollAnimation() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
  };
  
  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-on-scroll');
      }
    });
  }, observerOptions);
  
  document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));
}

window.addEventListener('load', setupScrollAnimation);
