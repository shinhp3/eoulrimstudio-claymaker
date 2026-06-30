(function () {
  let initialized = false;
  const ESTIMATE_NOTICE_KEY = 'clayOrderEstimateNoticeSeen';
  const els = {};

  function cacheElements() {
    els.shell = document.getElementById('orderShell');
    els.landing = document.getElementById('landingView');
    els.studioOverlay = document.getElementById('studioOverlay');
    els.studioFrame = document.getElementById('studioFrame');
    els.btnOpenStudio = document.getElementById('btnOpenStudio');
    els.step4StudioHint = document.getElementById('step4StudioHint');
    els.stepper = document.getElementById('stepper');
    els.panels = document.querySelectorAll('.step-panel');
    els.tierGrid = document.getElementById('tierGrid');
    els.imageSourceGrid = document.getElementById('imageSourceGrid');
    els.imageUploadPanel = document.getElementById('imageUploadPanel');
    els.noImagePanel = document.getElementById('noImagePanel');
    els.shapeGrid = document.getElementById('shapeGrid');
    els.dimGrid = document.getElementById('dimGrid');
    els.fieldY = document.getElementById('fieldY');
    els.dimX = document.getElementById('dimX');
    els.dimY = document.getElementById('dimY');
    els.dimZ = document.getElementById('dimZ');
    els.labelX = document.getElementById('labelX');
    els.labelZ = document.getElementById('labelZ');
    els.description = document.getElementById('description');
    els.dimOverLimitNotice = document.getElementById('dimOverLimitNotice');
    els.dimOverLimitConfirm = document.getElementById('dimOverLimitConfirm');
    els.imageInput = document.getElementById('imageInput');
    els.imageList = document.getElementById('imageList');
    els.estimatePanel = document.getElementById('estimatePanel');
    els.estimateTotal = document.getElementById('estimateTotal');
    els.estimateMoldNote = document.getElementById('estimateMoldNote');
    els.contactPhone = document.getElementById('contactPhone');
    els.contactEmail = document.getElementById('contactEmail');
    els.errorModeling = document.getElementById('errorModeling');
    els.errorShape = document.getElementById('errorShape');
    els.errorDims = document.getElementById('errorDims');
    els.errorImages = document.getElementById('errorImages');
    els.errorDescription = document.getElementById('errorDescription');
    els.errorContact = document.getElementById('errorContact');
    els.btnPrev = document.getElementById('btnPrev');
    els.btnNext = document.getElementById('btnNext');
    els.btnBackLanding = document.getElementById('btnBackLanding');
    els.btnOrderHelp = document.getElementById('btnOrderHelp');
    els.estimateNoticeDialog = document.getElementById('estimateNoticeDialog');
    els.estimateNoticeConfirm = document.getElementById('estimateNoticeConfirm');
  }

  function openEstimateNotice(force) {
    if (!els.estimateNoticeDialog) return;
    if (!force) {
      try {
        if (localStorage.getItem(ESTIMATE_NOTICE_KEY) === '1') return;
      } catch (e) { /* ignore */ }
    }
    if (typeof els.estimateNoticeDialog.showModal === 'function') {
      els.estimateNoticeDialog.showModal();
    }
  }

  function showEstimateNotice() {
    openEstimateNotice(false);
  }

  function bindEstimateNotice() {
    if (!els.estimateNoticeDialog) return;
    if (els.btnOrderHelp) {
      els.btnOrderHelp.addEventListener('click', () => openEstimateNotice(true));
    }
    if (els.estimateNoticeConfirm) {
      els.estimateNoticeConfirm.addEventListener('click', () => {
        try {
          localStorage.setItem(ESTIMATE_NOTICE_KEY, '1');
        } catch (e) { /* ignore */ }
        els.estimateNoticeDialog.close();
      });
    }
  }

  function initTiers() {
    if (els.tierGrid.children.length) return;
    OrderConfig.MODELING_TIERS.forEach(tier => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tier-card';
      btn.dataset.tierId = tier.id;
      btn.innerHTML = '<span class="tier-card__body">'
        + '<span class="tier-card__title">' + tier.title + '</span>'
        + '<span class="tier-card__desc">' + tier.desc + '</span>'
        + '</span>'
        + '<span class="tier-card__price">' + OrderEstimate.getModelingFeeText(tier.id) + '</span>';
      btn.addEventListener('click', () => selectTier(tier.id));
      els.tierGrid.appendChild(btn);
    });
  }

  function selectTier(tierId) {
    OrderState.setModelingTier(tierId);
    clearError('modeling');
    els.tierGrid.querySelectorAll('.tier-card').forEach(card => {
      card.classList.toggle('tier-card--active', card.dataset.tierId === tierId);
    });
    updateNextButtonState();
  }

  function selectImageSource(source) {
    OrderState.setImageSource(source);
    clearError('images');
    els.imageSourceGrid.querySelectorAll('.image-source-card').forEach(btn => {
      const active = btn.dataset.imageSource === source;
      btn.classList.toggle('image-source-card--active', active);
      btn.setAttribute('aria-checked', String(active));
    });
    els.imageUploadPanel.hidden = source !== 'has';
    els.noImagePanel.hidden = source !== 'none';
    updateNextButtonState();
  }

  function initShapes() {
    if (els.shapeGrid.children.length) return;
    const icons = {
      cup: '<path d="M5 3h14v13c0 2.2-2.7 4-7 4s-7-1.8-7-4V3z"/><path d="M19 7h1.5a2.5 2.5 0 0 1 0 5H19"/>',
      plate: '<ellipse cx="12" cy="10" rx="10" ry="3.5"/><path d="M2 10c0 3 4.5 5.5 10 5.5s10-2.5 10-5.5"/>',
      bowl: '<path d="M2 10c0 5.5 4.5 10 10 10s10-4.5 10-10"/><line x1="1" y1="10" x2="23" y2="10"/>',
      etc: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/>',
    };
    OrderConfig.SHAPE_KEYS.forEach(key => {
      const shape = OrderEstimate.SHAPES[key];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'shape-btn';
      btn.dataset.shape = key;
      btn.setAttribute('role', 'radio');
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' + icons[key] + '</svg><span>' + shape.name + '</span>';
      btn.addEventListener('click', () => selectShape(key));
      els.shapeGrid.appendChild(btn);
    });
  }

  function selectShape(shapeKey) {
    OrderState.setShape(shapeKey);
    clearError('shape');
    els.shapeGrid.querySelectorAll('.shape-btn').forEach(btn => {
      const active = btn.dataset.shape === shapeKey;
      btn.classList.toggle('shape-btn--active', active);
      btn.setAttribute('aria-checked', String(active));
    });
    applyShapeLabels(shapeKey);
    updateOverLimitNotice();
    updateNextButtonState();
  }

  function applyShapeLabels(shapeKey) {
    const shape = OrderEstimate.SHAPES[shapeKey];
    if (!shape) return;
    els.labelX.textContent = shape.labels[0];
    els.labelZ.textContent = shape.labels[2];
    if (shape.useY) {
      els.fieldY.hidden = false;
      els.dimGrid.classList.add('dim-grid--three');
    } else {
      els.fieldY.hidden = true;
      els.dimGrid.classList.remove('dim-grid--three');
      els.dimY.value = '';
      OrderState.updateDim('y', '');
    }
    updateOverLimitNotice();
  }

  function hasOverLimitDims() {
    const state = OrderState.getState();
    const shape = OrderEstimate.SHAPES[state.shape];
    if (!shape) return false;
    const max = OrderEstimate.CONFIG.MAX_DIM;
    const x = Number(state.dims.x);
    const y = Number(state.dims.y);
    const z = Number(state.dims.z);
    return (Number.isFinite(x) && x > max)
      || (Number.isFinite(z) && z > max)
      || (shape.useY && Number.isFinite(y) && y > max);
  }

  function updateOverLimitNotice() {
    if (!els.dimOverLimitNotice || !els.dimOverLimitConfirm) return;
    const overLimit = hasOverLimitDims();
    els.dimOverLimitNotice.hidden = !overLimit;
    if (!overLimit) {
      els.dimOverLimitConfirm.checked = false;
      OrderState.setOverLimitConfirmed(false);
    } else {
      els.dimOverLimitConfirm.checked = Boolean(OrderState.getState().overLimitConfirmed);
    }
  }

  function updateNextButtonState() {
    if (!els.btnNext) return;
    syncStateFromInputs();
    updateOverLimitNotice();
    const state = OrderState.getState();
    const result = OrderValidation.validateStep(state.currentStep, state);
    els.btnNext.disabled = !result.valid;
  }

  function syncFormFromState() {
    const s = OrderState.getState();
    if (s.modelingTier) selectTier(s.modelingTier);
    if (s.imageSource) selectImageSource(s.imageSource);
    if (s.shape) selectShape(s.shape);
    els.dimX.value = s.dims.x;
    els.dimY.value = s.dims.y;
    els.dimZ.value = s.dims.z;
    els.description.value = s.description;
    els.contactPhone.value = s.contact.phone;
    els.contactEmail.value = s.contact.email;
    if (els.dimOverLimitConfirm) els.dimOverLimitConfirm.checked = Boolean(s.overLimitConfirmed);
    updateOverLimitNotice();
    if (s.estimate) renderEstimatePanel(s);
    OrderImageUpload.renderList(els.imageList);
  }

  function syncStateFromInputs() {
    OrderState.setState({
      dims: { x: els.dimX.value, y: els.dimY.value, z: els.dimZ.value },
      description: els.description.value,
      contact: {
        phone: els.contactPhone.value,
        email: els.contactEmail.value,
      },
    });
  }

  function showStep(step) {
    OrderState.goToStep(step);
    els.panels.forEach(panel => {
      panel.hidden = Number(panel.dataset.step) !== step;
    });
    OrderStepper.renderStepper(els.stepper, step);
    OrderStepper.scrollStepperToActive(els.stepper);
    els.btnPrev.hidden = step <= 1;
    els.btnNext.textContent = step === OrderConfig.TOTAL_STEPS ? '견적 문의하기' : '다음';
    if (step === 5) {
      const state = OrderState.getState();
      const estimate = OrderValidation.computeEstimate(state);
      if (estimate) {
        OrderState.setEstimate(estimate);
        renderEstimatePanel(OrderState.getState());
      }
    }
    updateNextButtonState();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderEstimatePanel(state) {
    const r = state.estimate;
    if (!r || !els.estimatePanel) return;
    const tier = state.modelingTier;

    els.estimateTotal.textContent = OrderEstimate.getModelingFeeText(tier);
    if (els.estimateMoldNote) {
      els.estimateMoldNote.textContent = OrderEstimate.getMoldPerPieceText();
    }
    els.estimatePanel.hidden = false;
  }

  function clearError(field) {
    const map = {
      modeling: els.errorModeling,
      shape: els.errorShape,
      dims: els.errorDims,
      images: els.errorImages,
      description: els.errorDescription,
      contact: els.errorContact,
    };
    const el = map[field];
    if (el) { el.hidden = true; el.textContent = ''; }
  }

  function showError(field, message) {
    const map = {
      modeling: els.errorModeling,
      shape: els.errorShape,
      dims: els.errorDims,
      images: els.errorImages,
      description: els.errorDescription,
      contact: els.errorContact,
    };
    const el = map[field];
    if (el) { el.hidden = false; el.textContent = message; }
  }

  function clearAllErrors() {
    clearError('modeling');
    clearError('shape');
    clearError('dims');
    clearError('images');
    clearError('description');
    clearError('contact');
  }

  function handleNext() {
    syncStateFromInputs();
    clearAllErrors();
    const { currentStep } = OrderState.getState();
    const result = OrderValidation.validateStep(currentStep, OrderState.getState());

    if (!result.valid) {
      const [field, message] = Object.entries(result.errors)[0];
      showError(field, message);
      return;
    }

    if (currentStep === 4) {
      const estimate = OrderValidation.computeEstimate(OrderState.getState());
      OrderState.setEstimate(estimate);
    }

    if (currentStep < OrderConfig.TOTAL_STEPS) {
      showStep(currentStep + 1);
    } else {
      submitOrder();
    }
  }

  function handlePrev() {
    const { currentStep } = OrderState.getState();
    if (currentStep > 1) {
      clearAllErrors();
      showStep(currentStep - 1);
    }
  }

  function submitOrder() {
    const state = OrderState.getState();
    if (!state.estimate) return;
    if (state.imageSource === 'has' && (state.images || []).some(function (item) { return item.loading; })) {
      alert('이미지를 처리하는 중입니다. 잠시만 기다려주세요.');
      return;
    }
    const btn = els.btnNext;
    const prevText = btn.textContent;
    btn.textContent = '이미지 업로드 중...';
    btn.disabled = true;
    Promise.resolve(OrderImageUpload.submitInquiry(state))
      .catch(() => { alert('이미지 업로드에 실패했습니다. 다시 시도해주세요.'); })
      .finally(() => {
        btn.textContent = prevText;
        updateNextButtonState();
      });
  }

  function openStudioOverlay() {
    if (!els.studioOverlay || !els.studioFrame) return;
    // iframe src를 지금 설정해야 매번 새로 로드됨
    els.studioFrame.src = 'studio.html?embed=1&v=' + Date.now();
    els.studioOverlay.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeStudioOverlay() {
    if (!els.studioOverlay) return;
    els.studioOverlay.hidden = true;
    els.studioFrame.src = '';
    document.body.style.overflow = '';
  }

  function dataUrlToFile(dataUrl, fileName) {
    var arr = dataUrl.split(',');
    var mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) return null;
    var mime = mimeMatch[1];
    var bstr = atob(arr[1]);
    var n = bstr.length;
    var u8 = new Uint8Array(n);
    while (n--) u8[n] = bstr.charCodeAt(n);
    return new File([u8], fileName, { type: mime });
  }

  function handleStudioComplete(data) {
    closeStudioOverlay();

    // 스크린샷을 이미지로 추가
    if (data.screenshot) {
      selectImageSource('has');
      var file = dataUrlToFile(data.screenshot, 'studio_design.png');
      if (file) {
        OrderImageUpload.addFiles([file]).then(function (err) {
          if (err) showError('images', err);
          else clearError('images');
        });
      }
    } else if (!OrderState.getState().imageSource) {
      selectImageSource('none');
    }

    // 치수 자동 입력 (cm → mm)
    if (data.widthCm && data.heightCm) {
      var wMm = String(Math.round(data.widthCm * 10));
      var hMm = String(Math.round(data.heightCm * 10));
      OrderState.updateDim('x', wMm);
      OrderState.updateDim('z', hMm);
      if (els.dimX) els.dimX.value = wMm;
      if (els.dimZ) els.dimZ.value = hMm;
      // 형태가 미선택이면 'cup' 기본값 적용
      if (!OrderState.getState().shape) {
        selectShape('cup');
      }
      if (els.step4StudioHint) els.step4StudioHint.hidden = false;
    }
    updateOverLimitNotice();
    updateNextButtonState();
  }

  function bindEvents() {
    [els.dimX, els.dimY, els.dimZ].forEach(el => {
      el.addEventListener('input', () => {
        const key = el === els.dimX ? 'x' : el === els.dimY ? 'y' : 'z';
        let val = el.value;
        if (val !== '' && Number(val) <= 0) { el.value = ''; val = ''; }
        OrderState.updateDim(key, val);
        clearError('dims');
        updateOverLimitNotice();
        updateNextButtonState();
      });
    });
    els.description.addEventListener('input', () => {
      OrderState.setState({ description: els.description.value });
      clearError('description');
      updateNextButtonState();
    });
    if (els.imageInput) {
      els.imageInput.addEventListener('change', () => {
        const files = Array.from(els.imageInput.files || []);
        els.imageInput.value = '';
        if (!files.length) return;
        OrderImageUpload.addFiles(files).then((err) => {
          if (err) showError('images', err);
          else clearError('images');
        });
      });
    }
    document.addEventListener('order-images-changed', () => {
      clearError('images');
      OrderImageUpload.renderList(els.imageList);
      updateNextButtonState();
    });
    [els.contactPhone, els.contactEmail].forEach((el, i) => {
      const keys = ['phone', 'email'];
      el.addEventListener('input', () => {
        OrderState.updateContact(keys[i], el.value);
        clearError('contact');
        updateNextButtonState();
      });
    });
    if (els.imageSourceGrid) {
      els.imageSourceGrid.querySelectorAll('.image-source-card').forEach(btn => {
        btn.addEventListener('click', () => selectImageSource(btn.dataset.imageSource));
      });
    }
    if (els.dimOverLimitConfirm) {
      els.dimOverLimitConfirm.addEventListener('change', () => {
        OrderState.setOverLimitConfirmed(els.dimOverLimitConfirm.checked);
        clearError('dims');
        updateNextButtonState();
      });
    }
    if (els.btnOpenStudio) {
      els.btnOpenStudio.addEventListener('click', openStudioOverlay);
    }

    window.addEventListener('message', function (e) {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === 'studio-complete') handleStudioComplete(e.data);
      if (e.data.type === 'studio-cancel') closeStudioOverlay();
    });

    els.btnNext.addEventListener('click', handleNext);
    els.btnPrev.addEventListener('click', handlePrev);
    if (els.btnBackLanding) {
      els.btnBackLanding.addEventListener('click', e => {
        e.preventDefault();
        window.OrderLanding.showLanding();
      });
    }
  }

  window.OrderForm = {
    show() {
      cacheElements();
      if (els.landing) els.landing.hidden = true;
      els.shell.hidden = false;
      document.body.classList.remove('order-landing');
      document.body.classList.add('order-form-page');
      document.title = '주문 제작 의뢰 — 도자기 석고몰드';

      if (!initialized) {
        initTiers();
        initShapes();
        bindEvents();
        bindEstimateNotice();
        initialized = true;
      }
      syncFormFromState();
      showStep(1);
      showEstimateNotice();
    },

    resetToLanding() {
      cacheElements();
      OrderImageUpload.clearAll();
      OrderState.resetState();
      els.shell.hidden = true;
      window.OrderLanding.showLanding();
    },
  };
})();
