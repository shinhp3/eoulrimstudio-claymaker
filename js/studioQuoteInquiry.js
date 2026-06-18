(function () {
  var UPLOAD_URL = 'https://eoulrimstudio-upload.eoulrimstudio.workers.dev/upload-image';
  var CHANNEL_KEY = '6ca8205b-492b-4f44-97fd-f8fa35026101';

  function captureDesignBase64() {
    if (typeof window.clayStudioCapture !== 'function') {
      return Promise.reject(new Error('canvas not ready'));
    }
    var base64 = window.clayStudioCapture();
    if (!base64) return Promise.reject(new Error('capture failed'));
    return Promise.resolve(base64);
  }

  function uploadDesignImage(base64) {
    return fetch(UPLOAD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: base64,
        name: 'quote_' + Date.now(),
      }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error('upload failed');
        return res.json();
      })
      .then(function (json) {
        if (!json || !json.url) throw new Error('upload failed');
        return json.url;
      });
  }

  function buildQuoteMessage(imageUrl) {
    return '안녕하세요, 아래 도안으로 견적 문의드립니다 😊\n\n'
      + '도안 이미지: ' + imageUrl + '\n\n'
      + '추가로 전달할 내용을 입력해주세요.';
  }

  function ensureChannelStub() {
    if (window.ChannelIO) return;
    var ch = function () { ch.c(arguments); };
    ch.q = [];
    ch.c = function (args) { ch.q.push(args); };
    window.ChannelIO = ch;
  }

  function loadChannelSDK() {
    return new Promise(function (resolve) {
      if (!navigator.onLine) { resolve(false); return; }
      ensureChannelStub();
      if (window.ChannelIOInitialized) { resolve(true); return; }
      if (!CHANNEL_KEY) { resolve(false); return; }

      var script = document.createElement('script');
      script.async = true;
      script.src = 'https://cdn.channel.io/plugin/ch-plugin-web.js';
      script.charset = 'UTF-8';
      script.onload = function () {
        window.ChannelIOInitialized = true;
        window.ChannelIO('boot', { pluginKey: CHANNEL_KEY });
        resolve(true);
      };
      script.onerror = function () { resolve(false); };
      document.head.appendChild(script);
    });
  }

  function openChannelWithMessage(message) {
    return loadChannelSDK().then(function (loaded) {
      if (!loaded || !window.ChannelIO) return false;
      window.ChannelIO('openChat', undefined, message);
      return true;
    });
  }

  function getQuoteButtons() {
    return [
      document.getElementById('btnQuoteInquiry'),
      document.getElementById('btnQuoteInquiryDesk'),
    ].filter(Boolean);
  }

  function setQuoteButtonsDisabled(disabled) {
    getQuoteButtons().forEach(function (btn) { btn.disabled = disabled; });
  }

  function handleQuoteInquiry(btn) {
    var prevText = btn.textContent;
    getQuoteButtons().forEach(function (b) { b.textContent = '도안 준비 중...'; });
    setQuoteButtonsDisabled(true);

    captureDesignBase64()
      .then(uploadDesignImage)
      .then(function (url) { return openChannelWithMessage(buildQuoteMessage(url)); })
      .catch(function () {
        alert('이미지 업로드에 실패했습니다. 다시 시도해주세요.');
      })
      .finally(function () {
        getQuoteButtons().forEach(function (b) { b.textContent = prevText; });
        setQuoteButtonsDisabled(false);
      });
  }

  var isEmbed = window !== window.top;

  function initEmbedMode() {
    var topbarTitle = document.getElementById('studioTopbarTitle');
    if (topbarTitle) topbarTitle.textContent = '3D 도면 만들기';

    var doneBtnMobile = document.getElementById('btnStudioDone');
    if (doneBtnMobile) doneBtnMobile.hidden = false;

    getQuoteButtons().forEach(function (btn) { btn.hidden = true; });

    // 데스크톱 견적 버튼도 숨김
    var deskBtn = document.getElementById('btnQuoteInquiryDesk');
    if (deskBtn) deskBtn.hidden = true;

    // 뒤로가기 → 취소 메시지
    var backBtn = document.getElementById('studioBackBtn');
    if (backBtn) {
      backBtn.addEventListener('click', function (e) {
        e.preventDefault();
        window.parent.postMessage({ type: 'studio-cancel' }, '*');
      });
    }

    // 완료 버튼 핸들러
    function handleDone() {
      var widthCm = parseFloat(document.getElementById('widthInput').value) || 10;
      var heightCm = parseFloat(document.getElementById('heightInput').value) || 10;
      var base64 = window.clayStudioCapture ? window.clayStudioCapture() : null;
      window.parent.postMessage({
        type: 'studio-complete',
        widthCm: widthCm,
        heightCm: heightCm,
        screenshot: base64 ? 'data:image/png;base64,' + base64 : null,
      }, '*');
    }

    if (doneBtnMobile) doneBtnMobile.addEventListener('click', handleDone);
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (isEmbed) {
      initEmbedMode();
      return;
    }

    getQuoteButtons().forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        handleQuoteInquiry(btn);
      });
    });

    if (navigator.onLine) loadChannelSDK();
  });

  if (!isEmbed && document.readyState !== 'loading' && navigator.onLine) {
    loadChannelSDK();
  }
})();
