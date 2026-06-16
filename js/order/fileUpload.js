import { MAX_FILE_SIZE } from './config.js';
import { isAllowedExtension, formatFileSize } from './validation.js';
import { addFiles, removeFile, getState } from './state.js';

let fileIdCounter = 0;

function createFileEntry(file) {
  const id = `file-${++fileIdCounter}`;
  const isImage = file.type.startsWith('image/');
  const previewUrl = isImage ? URL.createObjectURL(file) : null;

  return { id, file, name: file.name, size: file.size, isImage, previewUrl };
}

export function initFileUpload({ zone, input, listEl, onChange }) {
  function handleFiles(fileList) {
    const accepted = [];
    const rejected = [];

    Array.from(fileList).forEach(file => {
      if (!isAllowedExtension(file.name)) {
        rejected.push(`${file.name}: 허용되지 않는 형식`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        rejected.push(`${file.name}: 20MB 초과`);
        return;
      }
      accepted.push(createFileEntry(file));
    });

    if (accepted.length) {
      addFiles(accepted);
      renderFileList(listEl);
      onChange?.();
    }

    if (rejected.length) {
      alert(rejected.join('\n'));
    }
  }

  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.classList.add('upload-zone--dragover');
  });

  zone.addEventListener('dragleave', e => {
    if (!zone.contains(e.relatedTarget)) {
      zone.classList.remove('upload-zone--dragover');
    }
  });

  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('upload-zone--dragover');
    handleFiles(e.dataTransfer.files);
  });

  input.addEventListener('change', () => {
    handleFiles(input.files);
    input.value = '';
  });

  listEl.addEventListener('click', e => {
    const btn = e.target.closest('[data-remove-file]');
    if (!btn) return;
    removeFile(btn.dataset.removeFile);
    renderFileList(listEl);
    onChange?.();
  });
}

export function renderFileList(listEl) {
  const { files } = getState();
  listEl.innerHTML = '';

  files.forEach(entry => {
    const li = document.createElement('li');
    li.className = 'file-preview-item';

    if (entry.isImage && entry.previewUrl) {
      const img = document.createElement('img');
      img.className = 'file-preview-item__thumb';
      img.src = entry.previewUrl;
      img.alt = '';
      li.appendChild(img);
    } else {
      const icon = document.createElement('div');
      icon.className = 'file-preview-item__icon';
      icon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
      li.appendChild(icon);
    }

    const info = document.createElement('div');
    info.className = 'file-preview-item__info';

    const name = document.createElement('div');
    name.className = 'file-preview-item__name';
    name.textContent = entry.name;

    const size = document.createElement('div');
    size.className = 'file-preview-item__size';
    size.textContent = formatFileSize(entry.size);

    info.appendChild(name);
    info.appendChild(size);
    li.appendChild(info);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'file-preview-item__remove';
    removeBtn.dataset.removeFile = entry.id;
    removeBtn.setAttribute('aria-label', `${entry.name} 삭제`);
    removeBtn.textContent = '×';
    li.appendChild(removeBtn);

    listEl.appendChild(li);
  });
}
