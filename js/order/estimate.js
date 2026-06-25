/* 견적 엔진 — eoulrimstudio-estimate 수동(치수) 견적 로직과 동일 */
(function () {
  var CONFIG = {
    FILAMENT_RATE: 40,
    MACHINE_RATE: 3000,
    MIN_PRICE: 10000,
    RANGE: 0.15,
    LAYER_HEIGHT: 0.20,
    LINE_WIDTH: 0.42,
    PRINT_SPEED: 200,
    MATERIAL_FACTOR: 1.19,
    MATERIAL_REF_VOL: 440,
    MATERIAL_VOLUME_EXP: 0.14,
    HOLLOW_COMPACTNESS_MAX: 0.38,
    HOLLOW_MF_FLOOR: 0.76,
    HOLLOW_MF_SLOPE: 0.28,
    SHELL_STL_EFF_FILL_MAX: 0.4,
    SHELL_FILL_COMPACT_RATIO_MAX: 0.38,
    SHELL_MF_OFFSET: 0.55,
    SHELL_MF_SLOPE: 1.75,
    SHELL_MF_VOL_REF: 250,
    SHELL_MF_VOL_EXP: 0.08,
    SHELL_SPEED_VOL_EXP: 0.55,
    LARGE_SHELL_MIN_VOL_CM3: 200,
    LARGE_SHELL_MID_VOL_CM3: 280,
    LARGE_SHELL_MID_MIN_EFF_FILL: 0.191,
    LARGE_SHELL_MIN_EFF_FILL: 0.19,
    LARGE_SHELL_EFF_VOL_EXP: 0.22,
    LARGE_SHELL_LOW_EFF_MAX: 0.18,
    LARGE_SHELL_SPEED_PIVOT_CM3: 300,
    SMALL_STL_MAX_VOL_CM3: 40,
    SMALL_STL_MF_MAX: 0.75,
    SMALL_STL_MAX_EFF_FILL: 0.52,
    SMALL_STL_VOL_BOOST_CAP: 1.05,
    SMALL_STL_SPEED_VOL_MIN: 12,
    SMALL_STL_SPEED_SCALE_MIN: 0.68,
    DENSE_STL_MF_SCALE_LOW: 1.35,
    DENSE_STL_SPEED_SCALE: 0.82,
    DENSE_FILL_COMPACT_RATIO_MIN: 0.45,
    SPEED_EFFICIENCY: 0.74,
    SPEED_VOLUME_EXP: 0.03,
    WALL_COUNT: 2,
    TOP_BOTTOM_LAYERS: 3,
    LAYER_CHANGE_TIME: 1.45,
    PRINT_PREP_MINUTES: 7,
    WALL_THICKNESS: 2.5,
    PLA_DENSITY: 1.24,
    MAX_DIM: 240,
    P1S_TIME_FACTOR: 0.36,
    MODELING: {
      lite: { fee: 50000, label: '단순한 형태' },
      standard: { fee: 80000, label: '곡선·복합 형태' },
      premium: { fee: 150000, label: '복잡한 외형' },
      custom: { fee: 0, label: '정밀·분할 (추후 협의)' },
    },
    MOLD: {
      lite: { fee: 150000 },
      standard: { fee: 200000 },
      premium: { fee: 250000 },
      custom: { fee: 0 },
    },
  };

  var SHAPES = {
    cup: {
      name: '컵', labels: ['지름 (D)', null, '높이 (H)'],
      useY: false, solid: false,
      volume: function (d, _, h) {
        var R = d / 2, W = CONFIG.WALL_THICKNESS, r = Math.max(R - W, 0);
        if (r <= 0 || h <= W) return Math.PI * R * R * h / 1000;
        return (Math.PI * R * R * W + Math.PI * (R * R - r * r) * (h - W)) / 1000;
      },
    },
    plate: {
      name: '접시', labels: ['지름 (D)', null, '높이 (H)'],
      useY: false, solid: true,
      volume: function (d, _, h) { return Math.PI / 4 * d * d * h / 1000; },
    },
    bowl: {
      name: '볼/그릇', labels: ['지름 (D)', null, '높이 (H)'],
      useY: false, solid: false,
      volume: function (d, _, h) {
        var W = CONFIG.WALL_THICKNESS;
        return Math.PI * (d * d / 4 + h * h) * W / 1000;
      },
    },
    etc: {
      name: '기타/오브제', labels: ['가로 (X)', '세로 (Y)', '높이 (Z)'],
      useY: true, solid: true,
      volume: function (x, y, z) { return x * y * z / 1000; },
    },
  };

  function fmt(n) { return Math.round(n).toLocaleString('ko-KR'); }
  function ceil(n, u) { return Math.ceil(n / u) * u; }

  function calcEffectiveFill(shapeKey, x, y, z, infPct) {
    var shape = SHAPES[shapeKey];
    var lineW = CONFIG.LINE_WIDTH, wallThick = CONFIG.WALL_COUNT * lineW;
    var tbThick = CONFIG.TOP_BOTTOM_LAYERS * CONFIG.LAYER_HEIGHT;
    if (shape.solid) {
      var wf = shapeKey === 'etc'
        ? Math.min(1, 2 * (x + y) * wallThick / (x * y))
        : Math.min(1, 4 * wallThick / x);
      var tf = Math.min(1, 2 * tbThick / z);
      var sf = Math.min(1, wf + tf);
      return sf + (1 - sf) * infPct / 100;
    }
    var W = CONFIG.WALL_THICKNESS, pc = Math.floor(W / lineW);
    var pf = Math.min(1, pc * lineW / W);
    return pf + (1 - pf) * infPct / 100;
  }

  function getMeshCompactness(volCm3, bboxVolCm3) {
    return Math.min(1, volCm3 / Math.max(bboxVolCm3, volCm3 * 0.01));
  }

  function isThinShellStl(volCm3, bboxVolCm3, effFill) {
    if (effFill >= CONFIG.SHELL_STL_EFF_FILL_MAX) return false;
    if (volCm3 >= CONFIG.LARGE_SHELL_MIN_VOL_CM3 && effFill < 0.3) return true;
    var compactness = getMeshCompactness(volCm3, bboxVolCm3);
    if (compactness < CONFIG.HOLLOW_COMPACTNESS_MAX) return false;
    return (effFill / Math.max(compactness, 0.05)) < CONFIG.SHELL_FILL_COMPACT_RATIO_MAX;
  }

  function getLargeShellMinEffFill(volCm3) {
    var fill = CONFIG.LARGE_SHELL_MIN_EFF_FILL * Math.pow(
      CONFIG.LARGE_SHELL_MIN_VOL_CM3 / volCm3,
      CONFIG.LARGE_SHELL_EFF_VOL_EXP
    );
    if (volCm3 < CONFIG.LARGE_SHELL_MID_VOL_CM3) {
      return Math.max(fill, CONFIG.LARGE_SHELL_MID_MIN_EFF_FILL);
    }
    return fill;
  }

  function isDenseStl(volCm3, bboxVolCm3, effFill) {
    if (isThinShellStl(volCm3, bboxVolCm3, effFill)) return false;
    if (effFill >= CONFIG.SHELL_STL_EFF_FILL_MAX) return false;
    var compactness = getMeshCompactness(volCm3, bboxVolCm3);
    var ratio = effFill / Math.max(compactness, 0.05);
    return ratio >= 0.65 && ratio < 1.15 && compactness < CONFIG.HOLLOW_COMPACTNESS_MAX;
  }

  function getThinShellMaterialFactor(volCm3, effFill) {
    var mf = CONFIG.SHELL_MF_OFFSET + CONFIG.SHELL_MF_SLOPE * effFill;
    if (volCm3 > CONFIG.SHELL_MF_VOL_REF) {
      mf *= Math.pow(CONFIG.SHELL_MF_VOL_REF / volCm3, CONFIG.SHELL_MF_VOL_EXP);
    }
    return mf;
  }

  function getSmallStlSpeedScale(volCm3) {
    if (volCm3 > CONFIG.SMALL_STL_MAX_VOL_CM3) return 1;
    var volMin = CONFIG.SMALL_STL_SPEED_VOL_MIN;
    var scaleMin = CONFIG.SMALL_STL_SPEED_SCALE_MIN;
    if (volCm3 <= volMin) return scaleMin;
    return scaleMin + (volCm3 - volMin) / (CONFIG.SMALL_STL_MAX_VOL_CM3 - volMin) * (1 - scaleMin);
  }

  function capSmallStlMaterialFactor(volCm3, mf) {
    if (volCm3 > CONFIG.SMALL_STL_MAX_VOL_CM3) return mf;
    var volBoost = CONFIG.MATERIAL_FACTOR * Math.min(
      Math.pow(CONFIG.MATERIAL_REF_VOL / Math.max(volCm3, 1), CONFIG.MATERIAL_VOLUME_EXP),
      CONFIG.SMALL_STL_VOL_BOOST_CAP
    );
    return Math.min(mf, volBoost, CONFIG.SMALL_STL_MF_MAX);
  }

  function getMaterialFactor(volCm3, bboxVolCm3, effFillRatio) {
    var compactness = getMeshCompactness(volCm3, bboxVolCm3);
    var fill = effFillRatio != null ? effFillRatio : 0.25;
    var mf;
    if (isThinShellStl(volCm3, bboxVolCm3, fill)) {
      mf = getThinShellMaterialFactor(volCm3, fill);
    } else if (compactness < CONFIG.HOLLOW_COMPACTNESS_MAX) {
      mf = CONFIG.MATERIAL_FACTOR * (CONFIG.HOLLOW_MF_FLOOR + CONFIG.HOLLOW_MF_SLOPE * compactness);
    } else {
      mf = CONFIG.MATERIAL_FACTOR * Math.pow(
        CONFIG.MATERIAL_REF_VOL / Math.max(volCm3, 30),
        CONFIG.MATERIAL_VOLUME_EXP
      );
    }
    if (isDenseStl(volCm3, bboxVolCm3, fill)) mf *= CONFIG.DENSE_STL_MF_SCALE_LOW;
    return capSmallStlMaterialFactor(volCm3, mf);
  }

  function getSpeedEfficiency(volCm3, bboxVolCm3, effFillRatio) {
    var se = CONFIG.SPEED_EFFICIENCY * Math.pow(
      Math.max(volCm3, 30) / CONFIG.MATERIAL_REF_VOL,
      CONFIG.SPEED_VOLUME_EXP
    );
    if (volCm3 <= CONFIG.SMALL_STL_MAX_VOL_CM3) {
      se *= getSmallStlSpeedScale(volCm3);
    } else if (bboxVolCm3 != null && effFillRatio != null) {
      var fill = effFillRatio;
      if (isThinShellStl(volCm3, bboxVolCm3, fill) && volCm3 > CONFIG.SHELL_MF_VOL_REF) {
        if (volCm3 >= CONFIG.LARGE_SHELL_SPEED_PIVOT_CM3) {
          se *= Math.pow(CONFIG.MATERIAL_REF_VOL / volCm3, CONFIG.SHELL_SPEED_VOL_EXP);
        } else {
          se *= Math.pow(volCm3 / CONFIG.MATERIAL_REF_VOL, CONFIG.SHELL_SPEED_VOL_EXP);
        }
      } else if (isDenseStl(volCm3, bboxVolCm3, fill)) {
        se *= CONFIG.DENSE_STL_SPEED_SCALE;
      }
    }
    return se;
  }

  function buildEstimateResult(volCm3, matCm3Raw, heightMm, bboxVolCm3) {
    var bboxVol = bboxVolCm3 || volCm3 / 0.55;
    var effFillRatio = matCm3Raw / volCm3;
    var matCm3 = matCm3Raw * getMaterialFactor(volCm3, bboxVol, effFillRatio) * 1.15;
    var matMm3 = matCm3 * 1000;
    var flowRate = CONFIG.LINE_WIDTH * CONFIG.LAYER_HEIGHT * CONFIG.PRINT_SPEED
      * getSpeedEfficiency(volCm3, bboxVol, effFillRatio);
    var extrudeSec = matMm3 / flowRate;
    var numLayers = Math.ceil(heightMm / CONFIG.LAYER_HEIGHT);
    var layerSec = numLayers * CONFIG.LAYER_CHANGE_TIME;
    var modelPrintMin = (extrudeSec + layerSec) / 60 * CONFIG.P1S_TIME_FACTOR;
    var totalMin = modelPrintMin + CONFIG.PRINT_PREP_MINUTES;
    var materialCost = matCm3 * CONFIG.FILAMENT_RATE;
    var machineCost = (totalMin / 60) * CONFIG.MACHINE_RATE;
    var subtotal = Math.max(materialCost + machineCost, CONFIG.MIN_PRICE);
    var low = Math.max(ceil(subtotal * (1 - CONFIG.RANGE), 1000), CONFIG.MIN_PRICE);
    var high = ceil(subtotal * (1 + CONFIG.RANGE), 1000);
    return {
      volCm3, matCm3, filGrams: matCm3 * CONFIG.PLA_DENSITY,
      printMin: totalMin, low, high,
    };
  }

  function estimateManual(shapeKey, x, y, z, infPct) {
    var shape = SHAPES[shapeKey];
    var volCm3 = shape.volume(x, y, z);
    var effFill = calcEffectiveFill(shapeKey, x, y, z, infPct);
    return buildEstimateResult(volCm3, volCm3 * effFill, z);
  }

  function getModelingCost(tier) {
    return CONFIG.MODELING[tier] || CONFIG.MODELING.lite;
  }

  function getMoldCost(tier) {
    return CONFIG.MOLD[tier] || CONFIG.MOLD.lite;
  }

  function getPackageFee(tier) {
    if (tier === 'custom') return null;
    var mc = getModelingCost(tier);
    var mold = getMoldCost(tier);
    return mc.fee + mold.fee;
  }

  function formatDimText(shapeKey, x, y, z) {
    var shape = SHAPES[shapeKey];
    if (!shape) return '—';
    return shape.useY ? (x + ' × ' + y + ' × ' + z + ' mm') : ('지름 ' + x + ' × 높이 ' + z + ' mm');
  }

  function getTotalRangeText(result, tier) {
    if (tier === 'custom') return '추후 협의';
    var packageFee = getPackageFee(tier);
    return fmt(packageFee + result.low) + '원 ~ ' + fmt(packageFee + result.high) + '원';
  }

  window.OrderEstimate = {
    FIXED_INFILL: 5,
    CONFIG,
    SHAPES,
    fmt,
    estimateManual,
    formatDimText,
    getTotalRangeText,
  };
})();
