(function () {
  var ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  function getCompressOptions(overrides) {
    var base = {
      enabled: OrderConfig.IMAGE_COMPRESS_ENABLED !== false,
      maxSize: OrderConfig.IMAGE_COMPRESS_MAX_SIZE || 1600,
      quality: OrderConfig.IMAGE_COMPRESS_QUALITY != null ? OrderConfig.IMAGE_COMPRESS_QUALITY : 0.82,
      minBytes: OrderConfig.IMAGE_COMPRESS_MIN_BYTES || 300 * 1024,
      preferSmaller: false,
    };
    return Object.assign(base, overrides || {});
  }

  function getPreviewCompressOptions() {
    return getCompressOptions({
      maxSize: OrderConfig.IMAGE_PREVIEW_MAX_SIZE || 480,
      quality: OrderConfig.IMAGE_PREVIEW_QUALITY != null ? OrderConfig.IMAGE_PREVIEW_QUALITY : 0.8,
      minBytes: 0,
      preferSmaller: true,
    });
  }

  function compressImage(file, overrides) {
    var opts = overrides ? getCompressOptions(overrides) : getCompressOptions();
    if (!opts.enabled || file.type === 'image/gif' || file.size <= opts.minBytes) {
      return Promise.resolve(file);
    }

    return new Promise(function (resolve) {
      var objectUrl = URL.createObjectURL(file);
      var img = new Image();

      img.onload = function () {
        URL.revokeObjectURL(objectUrl);
        var w = img.naturalWidth;
        var h = img.naturalHeight;
        if (!w || !h) {
          resolve(file);
          return;
        }

        var scale = Math.min(1, opts.maxSize / w, opts.maxSize / h);
        var didScale = scale < 1;
        var cw = Math.max(1, Math.round(w * scale));
        var ch = Math.max(1, Math.round(h * scale));
        var canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        var ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, cw, ch);

        function finish(blob, mime) {
          if (!blob) {
            resolve(file);
            return;
          }
          if (opts.preferSmaller && didScale) {
            var extScaled = mime === 'image/webp' ? '.webp' : '.jpg';
            var baseNameScaled = (file.name || 'image').replace(/\.[^.]+$/, '');
            resolve(new File([blob], baseNameScaled + extScaled, { type: mime, lastModified: Date.now() }));
            return;
          }
          if (blob.size >= file.size * 0.92) {
            resolve(file);
            return;
          }
          var ext = mime === 'image/webp' ? '.webp' : '.jpg';
          var baseName = (file.name || 'image').replace(/\.[^.]+$/, '');
          resolve(new File([blob], baseName + ext, { type: mime, lastModified: Date.now() }));
        }

        if (file.type === 'image/png') {
          canvas.toBlob(function (webpBlob) {
            if (webpBlob && (opts.preferSmaller && didScale || webpBlob.size < file.size)) {
              finish(webpBlob, 'image/webp');
            } else {
              canvas.toBlob(function (jpegBlob) {
                finish(jpegBlob, 'image/jpeg');
              }, 'image/jpeg', opts.quality);
            }
          }, 'image/webp', opts.quality);
        } else {
          canvas.toBlob(function (jpegBlob) {
            finish(jpegBlob, 'image/jpeg');
          }, 'image/jpeg', opts.quality);
        }
      };

      img.onerror = function () {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };

      img.src = objectUrl;
    });
  }

  function readFileAsBase64(file) {    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var result = reader.result;
        if (typeof result !== 'string') {
          reject(new Error('read failed'));
          return;
        }
        resolve(result.replace(/^data:image\/\w+;base64,/, ''));
      };
      reader.onerror = function () { reject(reader.error || new Error('read failed')); };
      reader.readAsDataURL(file);
    });
  }

  function formatUploadDate(date) {
    var d = date || new Date();
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
  }

  function formatSetNo(date) {
    var d = date || new Date();
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return pad(d.getHours()) + pad(d.getMinutes());
  }

  function getImageExtension(file) {
    var mime = file.type || '';
    if (mime === 'image/png') return 'png';
    if (mime === 'image/webp') return 'webp';
    if (mime === 'image/gif') return 'gif';
    return 'jpg';
  }

  function buildUploadName(date, setNo, index, file) {
    var ext = getImageExtension(file);
    return formatUploadDate(date) + '_' + setNo + '_' + (index + 1) + '.' + ext;
  }

  function uploadBase64ToImgbb(base64, name) {
    var apiKey = OrderConfig.IMGBB_API_KEY;
    if (!apiKey || apiKey === 'YOUR_IMGBB_API_KEY') {
      return Promise.reject(new Error('imgbb api key not configured'));
    }
    var form = new FormData();
    form.append('key', apiKey);
    form.append('image', base64);
    if (name) form.append('name', name);
    return fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form })
      .then(function (res) { return res.json(); })
      .then(function (json) {
        if (!json.success || !json.data) {
          throw new Error((json.error && json.error.message) || 'imgbb upload failed');
        }
        var directUrl = json.data.display_url
          || (json.data.image && json.data.image.url)
          || json.data.url;
        if (!directUrl) throw new Error('imgbb upload failed');
        return directUrl;
      });
  }

  function uploadFile(file, uploadName) {
    return compressImage(file)
      .then(readFileAsBase64)
      .then(function (base64) { return uploadBase64ToImgbb(base64, uploadName); });
  }
  function validateFile(file) {
    if (!file) return '이미지를 선택해주세요.';
    if (ACCEPT.indexOf(file.type) === -1) {
      return 'JPG, PNG, WEBP, GIF 형식만 업로드할 수 있습니다.';
    }
    if (file.size > OrderConfig.MAX_IMAGE_SIZE) {
      return '이미지 크기는 ' + Math.round(OrderConfig.MAX_IMAGE_SIZE / 1024 / 1024) + 'MB 이하여야 합니다.';
    }
    return null;
  }

  function createId() {
    return 'img_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  }

  function revokePreview(item) {
    if (item && item.previewUrl) URL.revokeObjectURL(item.previewUrl);
  }

  function getReadyImages(images) {
    return (images || []).filter(function (item) {
      return !item.loading && item.file;
    });
  }

  function createPreviewFromFile(file) {
    return compressImage(file, getPreviewCompressOptions()).then(function (previewFile) {
      return URL.createObjectURL(previewFile);
    }).catch(function () {
      return URL.createObjectURL(file);
    });
  }

  window.OrderImageUpload = {
    validateFile,
    uploadFile,

    uploadAll(items) {
      var ready = getReadyImages(items);
      if (!ready.length) return Promise.resolve([]);
      var uploadedAt = new Date();
      var setNo = formatSetNo(uploadedAt);
      return Promise.all(ready.map(function (item, index) {
        var name = buildUploadName(uploadedAt, setNo, index, item.file);
        return uploadFile(item.file, name);
      }));
    },

    addFiles(files) {
      var state = OrderState.getState();
      var images = state.images.slice();
      var errors = [];
      var pending = [];

      Array.from(files).forEach(function (file) {
        if (images.length + pending.length >= OrderConfig.MAX_IMAGES) {
          errors.push('이미지는 최대 ' + OrderConfig.MAX_IMAGES + '장까지 첨부할 수 있습니다.');
          return;
        }
        var err = validateFile(file);
        if (err) {
          errors.push(err);
          return;
        }
        pending.push({
          id: createId(),
          file: file,
          previewUrl: null,
          loading: true,
        });
      });

      if (!pending.length) {
        return Promise.resolve(errors[0] || null);
      }

      images = images.concat(pending);
      OrderState.setImages(images);
      document.dispatchEvent(new CustomEvent('order-images-changed'));

      return Promise.all(pending.map(function (item) {
        return createPreviewFromFile(item.file).then(function (previewUrl) {
          return {
            id: item.id,
            previewUrl: previewUrl,
          };
        });
      })).then(function (results) {
        var current = OrderState.getState().images.slice();
        results.forEach(function (result) {
          var idx = current.findIndex(function (img) { return img.id === result.id; });
          if (idx === -1) return;
          current[idx] = {
            id: current[idx].id,
            file: current[idx].file,
            previewUrl: result.previewUrl,
            loading: false,
          };
        });
        OrderState.setImages(current);
        document.dispatchEvent(new CustomEvent('order-images-changed'));
        return errors[0] || null;
      }).catch(function () {
        var current = OrderState.getState().images.slice();
        pending.forEach(function (item) {
          var idx = current.findIndex(function (img) { return img.id === item.id; });
          if (idx === -1) return;
          current[idx] = {
            id: current[idx].id,
            file: current[idx].file,
            previewUrl: URL.createObjectURL(item.file),
            loading: false,
          };
        });
        OrderState.setImages(current);
        document.dispatchEvent(new CustomEvent('order-images-changed'));
        return errors[0] || null;
      });
    },

    removeImage(id) {
      var state = OrderState.getState();
      var images = state.images.filter(function (item) {
        if (item.id === id) revokePreview(item);
        return item.id !== id;
      });
      OrderState.setImages(images);
      document.dispatchEvent(new CustomEvent('order-images-changed'));
    },

    clearAll() {
      OrderState.getState().images.forEach(revokePreview);
      OrderState.setImages([]);
      document.dispatchEvent(new CustomEvent('order-images-changed'));
    },

    renderList(container) {
      if (!container) return;
      var images = OrderState.getState().images;
      container.innerHTML = '';

      images.forEach(function (item) {
        var card = document.createElement('div');
        card.className = 'image-upload__item' + (item.loading ? ' image-upload__item--loading' : '');
        if (item.loading) {
          card.innerHTML = '<span class="image-upload__loading" aria-hidden="true"></span>'
            + '<button type="button" class="image-upload__remove" aria-label="이미지 삭제" disabled>&times;</button>';
        } else {
          card.innerHTML = '<img class="image-upload__thumb" alt="" src="' + item.previewUrl + '">'
            + '<button type="button" class="image-upload__remove" aria-label="이미지 삭제">&times;</button>';
        }
        card.querySelector('.image-upload__remove').addEventListener('click', function () {
          if (item.loading) return;
          OrderImageUpload.removeImage(item.id);
          OrderImageUpload.renderList(container);
        });
        container.appendChild(card);
      });

      var addBtn = document.getElementById('imageUploadAdd');
      if (addBtn) {
        addBtn.hidden = images.length >= OrderConfig.MAX_IMAGES;
      }
    },

    submitInquiry(state) {
      var images = getReadyImages(state.images || []);
      if (!images.length) {
        return OrderChannelTalk.openOrderInquiry(state, null);
      }
      return OrderImageUpload.uploadAll(images)
        .then(function (urls) { return OrderChannelTalk.openOrderInquiry(state, urls); })
        .catch(function (err) {
          if (err && err.message === 'imgbb api key not configured') {
            return OrderChannelTalk.openOrderInquiry(state, null).then(function (opened) {
              if (opened) {
                alert('이미지 호스팅 설정이 없어 사진 URL을 넣지 못했습니다.\n채널톡에서 직접 사진을 첨부해 주세요.');
              }
              return opened;
            });
          }
          throw err;
        });
    },
  };
})();
