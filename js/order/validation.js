(function () {
  const PHONE_RE = /^[\d\s\-+()]{7,20}$/;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function parsePositive(value) {
    if (value === '' || value == null) return null;
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return NaN;
    return n;
  }

  function validateModeling(state) {
    if (!state.modelingTier) {
      return { valid: false, errors: { modeling: '모델링 등급을 선택해주세요.' } };
    }
    return { valid: true, errors: {} };
  }

  function validateShapeAndDims(state) {
    if (!state.shape || !OrderEstimate.SHAPES[state.shape]) {
      return { valid: false, errors: { shape: '형태를 선택해주세요.' } };
    }
    const shape = OrderEstimate.SHAPES[state.shape];
    const x = parsePositive(state.dims.x);
    const z = parsePositive(state.dims.z);
    const y = shape.useY ? parsePositive(state.dims.y) : 0;

    if (x === null || Number.isNaN(x)) {
      return { valid: false, errors: { dims: '치수를 올바르게 입력해주세요.' } };
    }
    if (z === null || Number.isNaN(z)) {
      return { valid: false, errors: { dims: '치수를 올바르게 입력해주세요.' } };
    }
    if (shape.useY && (y === null || Number.isNaN(y))) {
      return { valid: false, errors: { dims: '치수를 올바르게 입력해주세요.' } };
    }
    if (x > OrderEstimate.CONFIG.MAX_DIM || z > OrderEstimate.CONFIG.MAX_DIM) {
      return { valid: false, errors: { dims: OrderEstimate.CONFIG.MAX_DIM + 'mm 이하로 입력해주세요.' } };
    }
    if (shape.useY && y > OrderEstimate.CONFIG.MAX_DIM) {
      return { valid: false, errors: { dims: OrderEstimate.CONFIG.MAX_DIM + 'mm 이하로 입력해주세요.' } };
    }
    return { valid: true, errors: {} };
  }

  function validateContact(state) {
    const { phone, email } = state.contact;
    const hasPhone = phone.trim().length > 0;
    const hasEmail = email.trim().length > 0;

    if (!hasPhone && !hasEmail) {
      return { valid: false, errors: { contact: '연락처를 최소 1개 이상 입력해주세요.' } };
    }
    if (hasPhone && !PHONE_RE.test(phone.trim())) {
      return { valid: false, errors: { contact: '올바른 전화번호 형식을 입력해주세요.' } };
    }
    if (hasEmail && !EMAIL_RE.test(email.trim())) {
      return { valid: false, errors: { contact: '올바른 이메일 형식을 입력해주세요.' } };
    }
    return { valid: true, errors: {} };
  }

  function validateImages(state) {
    if (state.images.length > OrderConfig.MAX_IMAGES) {
      return { valid: false, errors: { images: '이미지는 최대 ' + OrderConfig.MAX_IMAGES + '장까지 첨부할 수 있습니다.' } };
    }
    return { valid: true, errors: {} };
  }

  window.OrderValidation = {
    validateStep(step, state) {
      switch (step) {
        case 1: return validateModeling(state);
        case 2: return validateShapeAndDims(state);
        case 3: return { valid: true, errors: {} };
        case 4: return validateImages(state);
        case 5:
          if (!state.estimate) {
            return { valid: false, errors: { contact: '견적 정보가 없습니다. 형태·치수를 다시 확인해주세요.' } };
          }
          return validateContact(state);
        default: return { valid: true, errors: {} };
      }
    },

    computeEstimate(state) {
      const shapeResult = validateShapeAndDims(state);
      if (!shapeResult.valid) return null;
      const shape = OrderEstimate.SHAPES[state.shape];
      const x = Number(state.dims.x);
      const y = shape.useY ? Number(state.dims.y) : 0;
      const z = Number(state.dims.z);
      return OrderEstimate.estimateManual(state.shape, x, y, z, OrderEstimate.FIXED_INFILL);
    },
  };
})();
