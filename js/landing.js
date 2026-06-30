(function () {
  function showLanding() {
    const landing = document.getElementById('landingView');
    const shell = document.getElementById('orderShell');

    if (landing) landing.hidden = false;
    if (shell) shell.hidden = true;

    document.body.classList.remove('order-form-page');
    document.body.classList.add('order-landing');
    document.title = '어울림 서비스';

    if (location.hash) {
      history.replaceState(null, '', location.pathname + location.search);
    }
  }

  function showOrder() {
    if (window.OrderForm) {
      window.OrderForm.show();
      if (location.hash !== '#order') {
        history.pushState(null, '', '#order');
      }
    }
  }

  window.OrderLanding = { showLanding, showOrder };

  document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('btnStartOrder');
    if (startBtn) {
      startBtn.addEventListener('click', e => {
        e.preventDefault();
        showOrder();
      });
    }

    if (location.hash === '#order') {
      showOrder();
    }
  });
})();
