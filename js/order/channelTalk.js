import { PRODUCT_TYPES } from './config.js';
import { formatFileSize } from './validation.js';

/* channel.io → 설정 → 채널 → 채널 설치 → 웹에서 발급되는 Plugin Key */
export const CHANNEL_TALK_PLUGIN_KEY = '6ca8205b-492b-4f44-97fd-f8fa35026101';

function getProductTypeLabel(typeId) {
  return PRODUCT_TYPES.find(t => t.id === typeId)?.label ?? typeId;
}

function formatSizeLine(size) {
  const parts = [];
  if (size.width) parts.push(`가로 ${size.width}mm`);
  if (size.depth) parts.push(`세로 ${size.depth}mm`);
  if (size.height) parts.push(`높이 ${size.height}mm`);
  return parts.length ? parts.join(' × ') : '—';
}

export function buildOrderInquiryMessage(state) {
  const lines = [
    '안녕하세요, 도자기 석고몰드 주문제작 의뢰드립니다.',
    '',
    `- 제작 유형: ${getProductTypeLabel(state.productType)}`,
    `- 크기: ${formatSizeLine(state.size)}`,
  ];

  if (state.files.length) {
    lines.push(`- 참고 파일 (${state.files.length}개):`);
    state.files.forEach(f => {
      lines.push(`  · ${f.name} (${formatFileSize(f.size)})`);
    });
    lines.push('  ※ 파일은 이 채팅에 직접 첨부 부탁드립니다.');
  } else {
    lines.push('- 참고 파일: 없음');
  }

  const desc = state.description.trim();
  if (desc) {
    lines.push('- 요청 사항:');
    desc.split('\n').forEach(line => {
      lines.push(`  ${line}`);
    });
  }

  lines.push('');
  lines.push('- 연락처');

  const { kakao, phone, email } = state.contact;
  if (kakao.trim()) lines.push(`  · 카카오톡: ${kakao.trim()}`);
  if (phone.trim()) lines.push(`  · 전화번호: ${phone.trim()}`);
  if (email.trim()) lines.push(`  · 이메일: ${email.trim()}`);

  lines.push('', '제작 가능 여부 및 견적 상담 부탁드립니다.');
  return lines.join('\n');
}

export function initChannelTalk() {
  const key = CHANNEL_TALK_PLUGIN_KEY;
  if (!key || key === 'YOUR_CHANNEL_TALK_PLUGIN_KEY') return;

  if (!window.ChannelIO) {
    console.warn('[ChannelTalk] SDK not loaded');
    return;
  }

  window.ChannelIO('boot', { pluginKey: key });
}

export function openOrderInquiry(state) {
  if (!window.ChannelIO) {
    alert('채널톡이 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.');
    return false;
  }

  const message = buildOrderInquiryMessage(state);
  window.ChannelIO('openChat', undefined, message);
  return true;
}
