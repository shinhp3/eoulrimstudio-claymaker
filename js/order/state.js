(function () {
  const initialState = () => ({
    currentStep: 1,
    modelingTier: null,
    shape: null,
    dims: { x: '', y: '', z: '' },
    description: '',
    images: [],
    contact: { phone: '', email: '' },
    estimate: null,
  });

  let state = initialState();

  window.OrderState = {
    getState() { return state; },
    setState(partial) { state = { ...state, ...partial }; return state; },
    setModelingTier(tier) { state.modelingTier = tier; return state; },
    setShape(shape) { state.shape = shape; return state; },
    updateDim(field, value) { state.dims = { ...state.dims, [field]: value }; return state; },
    updateContact(field, value) { state.contact = { ...state.contact, [field]: value }; return state; },
    setImages(images) { state.images = images; return state; },
    setEstimate(estimate) { state.estimate = estimate; return state; },
    goToStep(step) { state.currentStep = step; return state; },
    resetState() { state = initialState(); return state; },
  };
})();
