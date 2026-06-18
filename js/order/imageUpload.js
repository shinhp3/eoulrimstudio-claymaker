(function () {
  var ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  function getCompressOptions() {
    return {
      enabled: OrderConfig.IMAGE_COMPRESS_ENABLED !== false,
      maxSize: OrderConfig.IMAGE_COMPRESS_MAX_SIZE || 1600,
      quality: OrderConfig.IMAGE_COMPRESS_QUALITY != null ? OrderConfig.IMAGE_COMPRESS_QUALITY : 0.82,
      minBytes: OrderConfig.IMAGE_COMPRESS_MIN_BYTES || 300 * 1024,
    };
  }

  function compressImage(file) {
    var opts = getCompressOptions();
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
          if (!blob || blob.size >= file.size * 0.92) {
            resolve(file);
            return;
          }
          var ext = mime === 'image/webp' ? '.webp' : '.jpg';
          var baseName = (file.name || 'image').replace(/\.[^.]+$/, '');
          resolve(new File([blob], baseName + ext, { type: mime, lastModified: Date.now() }));
        }

        if (file.type === 'image/png') {
          canvas.toBlob(function (webpBlob) {
            if (webpBlob && webpBlob.size < file.size) {
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

  function uploadBase64ToImgbb(base64) {
    var apiKey = OrderConfig.IMGBB_API_KEY;
    if (!apiKey || apiKey === 'YOUR_IMGBB_API_KEY') {
      return Promise.reject(new Error('imgbb api key not configured'));
    }
    var form = new FormData();
    form.append('key', apiKey);
    form.append('image', base64);
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

  function uploadFile(file) {
    return compressImage(file).then(readFileAsBase64).then(uploadBase64ToImgbb);
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

  window.OrderImageUpload = {
    validateFile,
    uploadFile,

    uploadAll(items) {
      if (!items || !items.length) return Promise.resolve([]);
      return Promise.all(items.map(function (item) { return uploadFile(item.file); }));
    },

    addFiles(files) {
      var state = OrderState.getState();
      var images = state.images.slice();
      var errors = [];

      Array.from(files).forEach(function (file) {
        if (images.length >= OrderConfig.MAX_IMAGES) {
          errors.push('이미지는 최대 ' + OrderConfig.MAX_IMAGES + '장까지 첨부할 수 있습니다.');
          return;
        }
        var err = validateFile(file);
        if (err) {
          errors.push(err);
          return;
        }
        images.push({
          id: createId(),
          file: file,
          previewUrl: URL.createObjectURL(file),
        });
      });

      OrderState.setImages(images);
      return errors[0] || null;
    },

    removeImage(id) {
      var state = OrderState.getState();
      var images = state.images.filter(function (item) {
        if (item.id === id) revokePreview(item);
        return item.id !== id;
      });
      OrderState.setImages(images);
    },

    clearAll() {
      OrderState.getState().images.forEach(revokePreview);
      OrderState.setImages([]);
    },

    renderList(container) {
      if (!container) return;
      var images = OrderState.getState().images;
      container.innerHTML = '';

      images.forEach(function (item) {
        var card = document.createElement('div');
        card.className = 'image-upload__item';
        card.innerHTML = '<img class="image-upload__thumb" alt="" src="' + item.previewUrl + '">'
          + '<button type="button" class="image-upload__remove" aria-label="이미지 삭제">&times;</button>';
        card.querySelector('.image-upload__remove').addEventListener('click', function () {
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
      var images = state.images || [];
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
