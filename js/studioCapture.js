(function () {
  'use strict';

  var dialog;
  var previewImg;
  var api;
  var previewDataUrl = '';

  function getCaptureFilename() {
    var d = new Date();
    var p = function (n) { return String(n).padStart(2, '0'); };
    return 'clay-studio_' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '_'
      + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()) + '.png';
  }

  function isDesktopLayout() {
    return document.documentElement.classList.contains('layout-desktop');
  }

  function takeViewportCapture() {
    document.body.classList.add('studio-capture-mode');
    api.setModelOnlyMode(true);
    return new Promise(function (resolve) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          var dataUrl = api.renderForCapture();
          api.setModelOnlyMode(false);
          document.body.classList.remove('studio-capture-mode');
          resolve(dataUrl);
        });
      });
    });
  }

  function closeCaptureDialog() {
    previewDataUrl = '';
    if (previewImg) previewImg.removeAttribute('src');
    if (dialog && dialog.open && typeof dialog.close === 'function') {
      dialog.close();
    }
  }

  function downloadCapture() {
    if (!previewDataUrl) return;
    var link = document.createElement('a');
    link.href = previewDataUrl;
    link.download = getCaptureFilename();
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function openCaptureDialog() {
    if (!isDesktopLayout()) return;
    api = window.clayStudioCaptureApi;
    if (!api || !dialog || !previewImg) return;

    takeViewportCapture().then(function (dataUrl) {
      if (!dataUrl) return;
      previewDataUrl = dataUrl;
      previewImg.src = dataUrl;
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
      }
    }).catch(function () {
      api.setModelOnlyMode(false);
      document.body.classList.remove('studio-capture-mode');
    });
  }

  function init() {
    dialog = document.getElementById('captureDialog');
    previewImg = document.getElementById('capturePreviewImg');
    if (!dialog || !previewImg) return;

    var btnCancel = document.getElementById('captureDialogCancel');
    var btnDownload = document.getElementById('captureDialogDownload');

    if (btnCancel) btnCancel.addEventListener('click', closeCaptureDialog);
    if (btnDownload) btnDownload.addEventListener('click', downloadCapture);
    dialog.addEventListener('close', function () {
      previewDataUrl = '';
      if (previewImg) previewImg.removeAttribute('src');
    });
    dialog.addEventListener('cancel', function (e) {
      e.preventDefault();
      closeCaptureDialog();
    });

    window.clayStudioOpenCaptureDialog = openCaptureDialog;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
