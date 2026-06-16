(function () {
  let initialized = false;
  const els = {};

  function cacheElements() {
    els.shell = document.getElementById('orderShell');
    els.landing = document.getElementById('landingView');
    els.stepper = document.getElementById('stepper');
    els.panels = document.querySelectorAll('.step-panel');
    els.tierGrid = document.getElementById('tierGrid');
    els.tierResult = document.getElementById('tierResult');
    els.tierResultTitle = document.getElementById('tierResultTitle');
    els.tierResultDesc = document.getElementById('tierResultDesc');
    els.shapeGrid = document.getElementById('shapeGrid');
    els.dimGrid = document.getElementById('dimGrid');
    els.fieldY = document.getElementById('fieldY');
    els.dimX = document.getElementById('dimX');
    els.dimY = document.getElementById('dimY');
    els.dimZ = document.getElementById('dimZ');
    els.labelX = document.getElementById('labelX');
    els.labelZ = document.getElementById('labelZ');
    els.description = document.getElementById('description');
    els.estimatePanel = document.getElementById('estimatePanel');
    els.estimateTotal = document.getElementById('estimateTotal');
    els.contactKakao = document.getElementById('contactKakao');
    els.contactPhone = document.getElementById('contactPhone');
    els.contactEmail = document.getElementById('contactEmail');
    els.errorModeling = document.getElementById('errorModeling');
    els.errorShape = document.getElementById('errorShape');
    els.errorDims = document.getElementById('errorDims');
    els.errorContact = document.getElementById('errorContact');
    els.btnPrev = document.getElementById('btnPrev');
    els.btnNext = document.getElementById('btnNext');
    els.btnBackLanding = document.getElementById('btnBackLanding');
  }

  function initTiers() {
    if (els.tierGrid.children.length) return;
    OrderConfig.MODELING_TIERS.forEach(tier => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tier-card';
      btn.dataset.tierId = tier.id;
      btn.innerHTML = '<span class="tier-card__title">' + tier.title + '</span>'
        + '<span class="tier-card__desc">' + tier.desc + '</span>';
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
    const info = OrderConfig.RECOMMEND_MAP[tierId];
    if (info && els.tierResult) {
      els.tierResult.hidden = false;
      els.tierResultTitle.textContent = info.title;
      els.tierResultDesc.textContent = info.desc;
    }
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
  }

  function syncFormFromState() {
    const s = OrderState.getState();
    if (s.modelingTier) selectTier(s.modelingTier);
    if (s.shape) selectShape(s.shape);
    els.dimX.value = s.dims.x;
    els.dimY.value = s.dims.y;
    els.dimZ.value = s.dims.z;
    els.description.value = s.description;
    els.contactKakao.value = s.contact.kakao;
    els.contactPhone.value = s.contact.phone;
    els.contactEmail.value = s.contact.email;
    if (s.estimate) renderEstimatePanel(s);
  }

  function syncStateFromInputs() {
    OrderState.setState({
      dims: { x: els.dimX.value, y: els.dimY.value, z: els.dimZ.value },
      description: els.description.value,
      contact: {
        kakao: els.contactKakao.value,
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
    if (step === 4) {
      const state = OrderState.getState();
      const estimate = OrderValidation.computeEstimate(state);
      if (estimate) {
        OrderState.setEstimate(estimate);
        renderEstimatePanel(OrderState.getState());
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderEstimatePanel(state) {
    const r = state.estimate;
    if (!r || !els.estimatePanel) return;
    const tier = state.modelingTier;
    const isCustom = tier === 'custom';

    els.estimateTotal.textContent = isCustom
      ? '추후 협의'
      : OrderEstimate.getTotalRangeText(r, tier);
    els.estimatePanel.hidden = false;
  }

  function clearError(field) {
    const map = {
      modeling: els.errorModeling,
      shape: els.errorShape,
      dims: els.errorDims,
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
      contact: els.errorContact,
    };
    const el = map[field];
    if (el) { el.hidden = false; el.textContent = message; }
  }

  function clearAllErrors() {
    clearError('modeling');
    clearError('shape');
    clearError('dims');
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

    if (currentStep === 2) {
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
    els.btnNext.disabled = true;
    Promise.resolve(OrderChannelTalk.openOrderInquiry(state))
      .finally(() => { els.btnNext.disabled = false; });
  }

  function bindEvents() {
    [els.dimX, els.dimY, els.dimZ].forEach(el => {
      el.addEventListener('input', () => {
        const key = el === els.dimX ? 'x' : el === els.dimY ? 'y' : 'z';
        let val = el.value;
        if (val !== '' && Number(val) <= 0) { el.value = ''; val = ''; }
        OrderState.updateDim(key, val);
        clearError('dims');
      });
    });
    els.description.addEventListener('input', () => {
      OrderState.setState({ description: els.description.value });
    });
    [els.contactKakao, els.contactPhone, els.contactEmail].forEach((el, i) => {
      const keys = ['kakao', 'phone', 'email'];
      el.addEventListener('input', () => {
        OrderState.updateContact(keys[i], el.value);
        clearError('contact');
      });
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
        initialized = true;
      }
      syncFormFromState();
      showStep(1);
    },

    resetToLanding() {
      cacheElements();
      OrderState.resetState();
      els.shell.hidden = true;
      window.OrderLanding.showLanding();
    },
  };
})();
