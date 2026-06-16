export const STEPS = [
  { id: 1, num: '01', label: '제작 유형' },
  { id: 2, num: '02', label: '참고자료' },
  { id: 3, num: '03', label: '크기' },
  { id: 4, num: '04', label: '설명' },
  { id: 5, num: '05', label: '연락처' },
];

export const PRODUCT_TYPES = [
  { id: 'cup', label: '컵' },
  { id: 'multi', label: '다관' },
  { id: 'vase', label: '화병' },
  { id: 'objet', label: '오브제' },
  { id: 'other', label: '기타' },
];

export const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'stl', 'obj', 'zip'];

export const ACCEPT_ATTR = ALLOWED_EXTENSIONS.map(ext => `.${ext}`).join(',');

export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB per file

export const TOTAL_STEPS = STEPS.length;
