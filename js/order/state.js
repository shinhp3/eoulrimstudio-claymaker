const initialState = () => ({
  currentStep: 1,
  productType: null,
  files: [],
  size: { width: '', depth: '', height: '' },
  description: '',
  contact: { kakao: '', phone: '', email: '' },
});

let state = initialState();

export function getState() {
  return state;
}

export function setState(partial) {
  state = { ...state, ...partial };
  return state;
}

export function updateSize(field, value) {
  state.size = { ...state.size, [field]: value };
  return state;
}

export function updateContact(field, value) {
  state.contact = { ...state.contact, [field]: value };
  return state;
}

export function addFiles(newFiles) {
  state.files = [...state.files, ...newFiles];
  return state;
}

export function removeFile(fileId) {
  const file = state.files.find(f => f.id === fileId);
  if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl);
  state.files = state.files.filter(f => f.id !== fileId);
  return state;
}

export function setProductType(typeId) {
  state.productType = typeId;
  return state;
}

export function goToStep(step) {
  state.currentStep = step;
  return state;
}

export function resetState() {
  state.files.forEach(f => {
    if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
  });
  state = initialState();
  return state;
}
