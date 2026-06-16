import { ALLOWED_EXTENSIONS } from './config.js';

const PHONE_RE = /^[\d\s\-+()]{7,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parsePositiveInt(value) {
  if (value === '' || value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return NaN;
  return Math.floor(n);
}

export function validateStep(step, state) {
  switch (step) {
    case 1:
      return validateProductType(state);
    case 2:
      return { valid: true, errors: {} };
    case 3:
      return validateSize(state);
    case 4:
      return { valid: true, errors: {} };
    case 5:
      return validateContact(state);
    default:
      return { valid: true, errors: {} };
  }
}

function validateProductType(state) {
  if (!state.productType) {
    return { valid: false, errors: { productType: '제작 유형을 선택해주세요.' } };
  }
  return { valid: true, errors: {} };
}

function validateSize(state) {
  const { width, depth, height } = state.size;
  const w = parsePositiveInt(width);
  const d = parsePositiveInt(depth);
  const h = parsePositiveInt(height);

  if (w === null && d === null && h === null) {
    return { valid: false, errors: { size: '가로, 세로, 높이 중 최소 1개 이상 입력해주세요.' } };
  }

  const fields = [
    { key: 'width', val: w, raw: width, label: '가로' },
    { key: 'depth', val: d, raw: depth, label: '세로' },
    { key: 'height', val: h, raw: height, label: '높이' },
  ];

  for (const { val, raw, label } of fields) {
    if (raw !== '' && raw != null && Number.isNaN(val)) {
      return { valid: false, errors: { size: `${label}는 0보다 큰 숫자를 입력해주세요.` } };
    }
  }

  return { valid: true, errors: {} };
}

function validateContact(state) {
  const { kakao, phone, email } = state.contact;
  const hasKakao = kakao.trim().length > 0;
  const hasPhone = phone.trim().length > 0;
  const hasEmail = email.trim().length > 0;

  if (!hasKakao && !hasPhone && !hasEmail) {
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

export function isAllowedExtension(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext && ALLOWED_EXTENSIONS.includes(ext);
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
