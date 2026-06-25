(function () {
  var IMGBB_API_KEY = '189b05176929b1e59e443f19e0e4455d';
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
    if (!IMGBB_API_KEY || IMGBB_API_KEY === 'YOUR_IMGBB_API_KEY') {
      return Promise.reject(new Error('imgbb api key not configured'));
    }
    var form = new FormData();
    form.append('key', IMGBB_API_KEY);
    form.append('image', base64);
    form.append('name', 'studio_quote_' + Date.now());
    return fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form })
      .then(function (res) { return res.json(); })
      .then(function (json) {
        if (!json.success || !json.data) {
          throw new Error((json.error && json.error.message) || 'imgbb upload failed');
        }
        var directUrl = json.data.display_url
          || (json.data.image && json.data.image.url)
          || json.data.url;
        if (!directUrl) throw new Error('imgbb upload failed');
        return directUrl;
      });
  }

  function getDesignSize() {
    if (typeof window.clayStudioGetSize === 'function') {
      return window.clayStudioGetSize();
    }
    var wEl = document.getElementById('actualWidth');
    var hEl = document.getElementById('actualHeight');
    if (wEl && hEl) {
      return {
        widthCm: parseFloat(wEl.textContent) || 0,
        heightCm: parseFloat(hEl.textContent) || 0,
      };
    }
    return null;
  }

  function buildQuoteMessage(imageUrl, size) {
    var lines = [
      '안녕하세요, 아래 도안으로 견적 문의드립니다 😊',
      '',
      '도안 이미지: ' + imageUrl,
    ];
    if (size && size.widthCm > 0 && size.heightCm > 0) {
      lines.push('치수: 최대 가로 ' + size.widthCm + 'cm × 높이 ' + size.heightCm + 'cm');
    }
    lines.push('', '추가로 전달할 내용을 입력해주세요.');
    return lines.join('\n');
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

  function getStudioDoneButtons() {
    return [
      document.getElementById('btnStudioDone'),
      document.getElementById('btnStudioDoneDesk'),
    ].filter(Boolean);
  }

  function getBackButtons() {
    return [
      document.getElementById('studioBackBtn'),
      document.getElementById('studioBackBtnDesk'),
    ].filter(Boolean);
  }

  function handleQuoteInquiry(btn) {
    var prevText = btn.textContent;
    getQuoteButtons().forEach(function (b) { b.textContent = '도안 준비 중...'; });
    setQuoteButtonsDisabled(true);

    var size = getDesignSize();

    captureDesignBase64()
      .then(uploadDesignImage)
      .then(function (url) { return openChannelWithMessage(buildQuoteMessage(url, size)); })
      .catch(function (err) {
        console.error('Clay Studio quote inquiry failed:', err);
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

    var doneButtons = getStudioDoneButtons();
    doneButtons.forEach(function (btn) {
      btn.hidden = false;
      btn.textContent = '문의하기';
    });

    getQuoteButtons().forEach(function (btn) { btn.hidden = true; });

    // 데스크톱 견적 버튼도 숨김
    var deskBtn = document.getElementById('btnQuoteInquiryDesk');
    if (deskBtn) deskBtn.hidden = true;

    // 뒤로가기 → 취소 메시지
    getBackButtons().forEach(function (backBtn) {
      backBtn.addEventListener('click', function (e) {
        e.preventDefault();
        window.parent.postMessage({ type: 'studio-cancel' }, '*');
      });
    });

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

    doneButtons.forEach(function (btn) {
      btn.addEventListener('click', handleDone);
    });
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
