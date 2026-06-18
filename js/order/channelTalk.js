(function () {
  function buildSelectionLines(state) {
    const lines = [];
    const tier = state.modelingTier;
    if (tier && OrderEstimate.CONFIG.MODELING[tier]) {
      lines.push('- 모델링: ' + OrderEstimate.CONFIG.MODELING[tier].label);
    }
    if (state.shape && OrderEstimate.SHAPES[state.shape]) {
      const shape = OrderEstimate.SHAPES[state.shape];
      lines.push('- 형태: ' + shape.name);
      const x = parseFloat(state.dims.x) || 0;
      const y = shape.useY ? (parseFloat(state.dims.y) || 0) : 0;
      const z = parseFloat(state.dims.z) || 0;
      if (x > 0 && z > 0) {
        lines.push('- 치수: ' + OrderEstimate.formatDimText(state.shape, x, y, z));
      }
    }
    lines.push('- 소재·채움: PLA · ' + OrderEstimate.FIXED_INFILL + '% infill (참고)');
    return lines;
  }

  function buildOrderInquiryMessage(state) {
    const r = state.estimate;
    if (!r) return '';

    const tier = state.modelingTier;
    const isCustom = tier === 'custom';
    const lines = ['안녕하세요, 도자기 석고몰드 주문제작 견적 문의드립니다.', ''];

    buildSelectionLines(state).forEach(line => lines.push(line));

    if (isCustom) {
      lines.push('- 예상 제작 비용: 추후 협의');
    } else {
      lines.push('- 예상 제작 비용: ' + OrderEstimate.getTotalRangeText(r, tier));
    }

    const desc = state.description.trim();
    if (desc) {
      lines.push('', '- 요청 사항:');
      desc.split('\n').forEach(line => lines.push('  ' + line));
    }

    lines.push('', '- 연락처');
    const { phone, email } = state.contact;
    if (phone.trim()) lines.push('  · 전화번호: ' + phone.trim());
    if (email.trim()) lines.push('  · 이메일: ' + email.trim());

    lines.push('', '상세 상담 부탁드립니다.');
    return lines.join('\n');
  }

  function appendImageUrls(message, imageUrls) {
    if (!imageUrls) return message;
    var urls = Array.isArray(imageUrls) ? imageUrls : [imageUrls];
    urls = urls.filter(Boolean);
    if (!urls.length) return message;
    /* 이미지 URL은 줄바꿈으로 구분해야 채널톡에서 미리보기(링크 카드)가 뜹니다 */
    return message + '\n\n참고 이미지:\n' + urls.join('\n');
  }

  function ensureChannelStub() {
    if (window.ChannelIO) return;
    const ch = function () { ch.c(arguments); };
    ch.q = [];
    ch.c = function (args) { ch.q.push(args); };
    window.ChannelIO = ch;
  }

  function loadChannelSDK() {
    return new Promise(resolve => {
      if (!navigator.onLine) { resolve(false); return; }
      ensureChannelStub();
      if (window.ChannelIOInitialized) { resolve(true); return; }

      const key = OrderConfig.CHANNEL_TALK_PLUGIN_KEY;
      if (!key || key === 'YOUR_CHANNEL_TALK_PLUGIN_KEY') { resolve(false); return; }

      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://cdn.channel.io/plugin/ch-plugin-web.js';
      script.charset = 'UTF-8';
      script.onload = () => {
        window.ChannelIOInitialized = true;
        window.ChannelIO('boot', { pluginKey: key });
        resolve(true);
      };
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  }

  window.OrderChannelTalk = {
    openOrderInquiry(state, imageUrls) {
      if (!navigator.onLine) return Promise.resolve(false);
      if (!state.estimate) return Promise.resolve(false);

      return loadChannelSDK().then(loaded => {
        if (!loaded || !window.ChannelIO) return false;
        var message = appendImageUrls(buildOrderInquiryMessage(state), imageUrls);
        window.ChannelIO('openChat', undefined, message);
        return true;
      });
    },
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (navigator.onLine) loadChannelSDK();
  });

  if (document.readyState !== 'loading' && navigator.onLine) {
    loadChannelSDK();
  }
})();
