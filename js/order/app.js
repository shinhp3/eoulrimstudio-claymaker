import { PRODUCT_TYPES, TOTAL_STEPS } from './config.js';
import {
  getState, setState, goToStep, setProductType,
  updateSize, updateContact,
} from './state.js';
import { validateStep } from './validation.js';
import { renderStepper, scrollStepperToActive } from './stepper.js';
import { initFileUpload } from './fileUpload.js';

const els = {
  shell: document.getElementById('orderShell'),
  complete: document.getElementById('orderComplete'),
  stepper: document.getElementById('stepper'),
  panels: document.querySelectorAll('.step-panel'),
  productTypeGrid: document.getElementById('productTypeGrid'),
  uploadZone: document.getElementById('uploadZone'),
  fileInput: document.getElementById('fileInput'),
  filePreviewList: document.getElementById('filePreviewList'),
  sizeWidth: document.getElementById('sizeWidth'),
  sizeDepth: document.getElementById('sizeDepth'),
  sizeHeight: document.getElementById('sizeHeight'),
  description: document.getElementById('description'),
  contactKakao: document.getElementById('contactKakao'),
  contactPhone: document.getElementById('contactPhone'),
  contactEmail: document.getElementById('contactEmail'),
  errorProductType: document.getElementById('errorProductType'),
  errorSize: document.getElementById('errorSize'),
  errorContact: document.getElementById('errorContact'),
  btnPrev: document.getElementById('btnPrev'),
  btnNext: document.getElementById('btnNext'),
};

function initProductTypes() {
  PRODUCT_TYPES.forEach(type => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'option-card';
    btn.dataset.typeId = type.id;
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', 'false');
    btn.textContent = type.label;
    btn.addEventListener('click', () => selectProductType(type.id));
    els.productTypeGrid.appendChild(btn);
  });
}

function selectProductType(typeId) {
  setProductType(typeId);
  clearError('productType');
  els.productTypeGrid.querySelectorAll('.option-card').forEach(card => {
    const active = card.dataset.typeId === typeId;
    card.classList.toggle('option-card--active', active);
    card.setAttribute('aria-checked', String(active));
  });
}

function syncFormFromState() {
  const { productType, size, description, contact } = getState();

  if (productType) selectProductType(productType);

  els.sizeWidth.value = size.width;
  els.sizeDepth.value = size.depth;
  els.sizeHeight.value = size.height;
  els.description.value = description;
  els.contactKakao.value = contact.kakao;
  els.contactPhone.value = contact.phone;
  els.contactEmail.value = contact.email;
}

function syncStateFromInputs() {
  setState({
    size: {
      width: els.sizeWidth.value,
      depth: els.sizeDepth.value,
      height: els.sizeHeight.value,
    },
    description: els.description.value,
    contact: {
      kakao: els.contactKakao.value,
      phone: els.contactPhone.value,
      email: els.contactEmail.value,
    },
  });
}

function showStep(step) {
  goToStep(step);
  els.panels.forEach(panel => {
    const panelStep = Number(panel.dataset.step);
    panel.hidden = panelStep !== step;
  });

  renderStepper(els.stepper, step);
  scrollStepperToActive(els.stepper);

  els.btnPrev.hidden = step <= 1;
  els.btnNext.textContent = step === TOTAL_STEPS ? '의뢰 제출하기' : '다음';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function clearError(field) {
  const map = {
    productType: els.errorProductType,
    size: els.errorSize,
    contact: els.errorContact,
  };
  const el = map[field];
  if (el) {
    el.hidden = true;
    el.textContent = '';
  }
}

function showError(field, message) {
  const map = {
    productType: els.errorProductType,
    size: els.errorSize,
    contact: els.errorContact,
  };
  const el = map[field];
  if (el) {
    el.hidden = false;
    el.textContent = message;
  }
}

function clearAllErrors() {
  clearError('productType');
  clearError('size');
  clearError('contact');
  [els.sizeWidth, els.sizeDepth, els.sizeHeight].forEach(input => {
    input.classList.remove('text-input--error');
  });
}

function handleNext() {
  syncStateFromInputs();
  clearAllErrors();

  const { currentStep } = getState();
  const result = validateStep(currentStep, getState());

  if (!result.valid) {
    const [field, message] = Object.entries(result.errors)[0];
    showError(field, message);
    if (field === 'size') {
      [els.sizeWidth, els.sizeDepth, els.sizeHeight].forEach(input => {
        if (input.value !== '' && Number(input.value) <= 0) {
          input.classList.add('text-input--error');
        }
      });
    }
    return;
  }

  if (currentStep < TOTAL_STEPS) {
    showStep(currentStep + 1);
  } else {
    submitOrder();
  }
}

function handlePrev() {
  const { currentStep } = getState();
  if (currentStep > 1) {
    clearAllErrors();
    showStep(currentStep - 1);
  }
}

function submitOrder() {
  const state = getState();
  console.log('[Order Submit]', {
    productType: state.productType,
    files: state.files.map(f => ({ name: f.name, size: f.size })),
    size: state.size,
    description: state.description,
    contact: state.contact,
  });

  els.shell.hidden = true;
  els.complete.hidden = false;
  document.title = '의뢰 접수 완료 — 도자기 석고몰드';
}

function bindSizeInputs() {
  const fields = [
    { el: els.sizeWidth, key: 'width' },
    { el: els.sizeDepth, key: 'depth' },
    { el: els.sizeHeight, key: 'height' },
  ];

  fields.forEach(({ el, key }) => {
    el.addEventListener('input', () => {
      let val = el.value;
      if (val !== '' && Number(val) <= 0) {
        el.value = '';
        val = '';
      }
      updateSize(key, val);
      el.classList.remove('text-input--error');
      clearError('size');
    });
  });
}

function bindContactInputs() {
  els.contactKakao.addEventListener('input', () => {
    updateContact('kakao', els.contactKakao.value);
    clearError('contact');
  });
  els.contactPhone.addEventListener('input', () => {
    updateContact('phone', els.contactPhone.value);
    clearError('contact');
  });
  els.contactEmail.addEventListener('input', () => {
    updateContact('email', els.contactEmail.value);
    clearError('contact');
  });
}

function init() {
  initProductTypes();
  syncFormFromState();
  showStep(1);

  initFileUpload({
    zone: els.uploadZone,
    input: els.fileInput,
    listEl: els.filePreviewList,
  });

  bindSizeInputs();
  bindContactInputs();

  els.description.addEventListener('input', () => {
    setState({ description: els.description.value });
  });

  els.btnNext.addEventListener('click', handleNext);
  els.btnPrev.addEventListener('click', handlePrev);
}

init();
