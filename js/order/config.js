window.OrderConfig = {
  STEPS: [
    { id: 1, num: '01', label: '모델링' },
    { id: 2, num: '02', label: '형태·치수' },
    { id: 3, num: '03', label: '설명' },
    { id: 4, num: '04', label: '이미지' },
    { id: 5, num: '05', label: '견적·연락' },
  ],
  MODELING_TIERS: [
    { id: 'lite', title: '단순한 형태', desc: '박스, 원통 등 기본 도형' },
    { id: 'standard', title: '곡선·복합 형태', desc: '손잡이 잔, 뚜껑 형태, 곡선이 많은 형태' },
    { id: 'premium', title: '복잡한 외형', desc: '약간의 장식, 복잡한 형태' },
    { id: 'custom', title: '정밀·분할', desc: '분할·질감·복잡한 장식 (상담 후 확정)' },
  ],
  RECOMMEND_MAP: {
    lite: { title: '단순한 형태', desc: '박스, 원통 등 기본 도형에 적합합니다.' },
    standard: { title: '곡선·복합 형태', desc: '손잡이 잔, 뚜껑 형태 등 곡선이 많은 형태에 적합합니다.' },
    premium: { title: '복잡한 외형', desc: '장식이나 복잡한 실루엣 제작에 적합합니다.' },
    custom: { title: '정밀·분할', desc: '분할·질감·복잡한 장식은 상담 후 견적이 확정됩니다.' },
  },
  SHAPE_KEYS: ['cup', 'plate', 'bowl', 'etc'],
  CHANNEL_TALK_PLUGIN_KEY: '6ca8205b-492b-4f44-97fd-f8fa35026101',
  /* imgbb.com → API → 발급받은 API 키 */
  IMGBB_API_KEY: '36694f1b8c2c3ed3aea4e38dc6017466',
  MAX_IMAGES: 5,
  MAX_IMAGE_SIZE: 10 * 1024 * 1024,
  /* 업로드 전 압축 (원본보다 가볍게) */
  IMAGE_COMPRESS_ENABLED: true,
  IMAGE_COMPRESS_MAX_SIZE: 1600,
  IMAGE_COMPRESS_QUALITY: 0.82,
  IMAGE_COMPRESS_MIN_BYTES: 300 * 1024,
};

OrderConfig.TOTAL_STEPS = OrderConfig.STEPS.length;
