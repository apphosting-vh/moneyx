/* ══════════════════════════════════════════════════════════════════════════
   Technical Indicators Library — Pure calculation functions
   Accepts arrays of { o, h, l, c, v } candle objects (or plain close arrays).
   All functions return arrays; the last element is the "current" value.
   ══════════════════════════════════════════════════════════════════════════ */
window.TechIndicators = (function () {

  /* ── Helpers ────────────────────────────────────────────────────────────── */

  function closes(candles) { return candles.map(function (c) { return c.c; }); }
  function highs(candles) { return candles.map(function (c) { return c.h; }); }
  function lows(candles) { return candles.map(function (c) { return c.l; }); }
  function opens(candles) { return candles.map(function (c) { return c.o; }); }
  function volumes(candles) { return candles.map(function (c) { return c.v; }); }

  function sma(arr, period) {
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      if (i < period - 1) { out.push(null); continue; }
      var sum = 0;
      for (var j = i - period + 1; j <= i; j++) sum += arr[j];
      out.push(sum / period);
    }
    return out;
  }

  function ema(arr, period) {
    var out = [];
    var k = 2 / (period + 1);
    var prev = null;
    for (var i = 0; i < arr.length; i++) {
      if (i < period - 1) { out.push(null); continue; }
      if (prev === null) {
        var sum = 0;
        for (var j = i - period + 1; j <= i; j++) sum += arr[j];
        prev = sum / period;
      } else {
        prev = arr[i] * k + prev * (1 - k);
      }
      out.push(prev);
    }
    return out;
  }

  function round(val, dec) {
    if (val === null || val === undefined || isNaN(val)) return null;
    var f = Math.pow(10, dec || 2);
    return Math.round(val * f) / f;
  }

  /* ═══ 1. SMA — Simple Moving Average ══════════════════════════════════════ */
  function calcSMA(candles, period) {
    period = period || 20;
    var cl = closes(candles);
    return sma(cl, period);
  }

  /* ═══ 2. EMA — Exponential Moving Average ═════════════════════════════════ */
  function calcEMA(candles, period) {
    period = period || 20;
    var cl = closes(candles);
    return ema(cl, period);
  }

  /* ═══ 3. WMA — Weighted Moving Average ════════════════════════════════════ */
  function calcWMA(candles, period) {
    period = period || 20;
    var cl = closes(candles);
    var out = [];
    var denom = period * (period + 1) / 2;
    for (var i = 0; i < cl.length; i++) {
      if (i < period - 1) { out.push(null); continue; }
      var sum = 0;
      for (var j = 0; j < period; j++) {
        sum += cl[i - period + 1 + j] * (j + 1);
      }
      out.push(sum / denom);
    }
    return out;
  }

  /* ═══ 4. VWAP — Volume Weighted Average Price ═════════════════════════════ */
  function calcVWAP(candles) {
    var out = [];
    var cumTPVol = 0;
    var cumVol = 0;
    for (var i = 0; i < candles.length; i++) {
      var tp = (candles[i].h + candles[i].l + candles[i].c) / 3;
      cumTPVol += tp * candles[i].v;
      cumVol += candles[i].v;
      out.push(cumVol > 0 ? round(cumTPVol / cumVol, 2) : null);
    }
    return out;
  }

  /* ═══ 5. RSI — Relative Strength Index ════════════════════════════════════ */
  function calcRSI(candles, period) {
    period = period || 14;
    var cl = closes(candles);
    var out = [];
    if (cl.length < period + 1) return cl.map(function () { return null; });

    var gains = [], losses = [];
    for (var i = 1; i < cl.length; i++) {
      var diff = cl[i] - cl[i - 1];
      gains.push(diff > 0 ? diff : 0);
      losses.push(diff < 0 ? -diff : 0);
    }

    var avgGain = 0, avgLoss = 0;
    for (var i = 0; i < period; i++) {
      avgGain += gains[i];
      avgLoss += losses[i];
    }
    avgGain /= period;
    avgLoss /= period;

    out.push(null); // first candle has no RSI
    for (var i = 0; i < period - 1; i++) out.push(null);

    if (avgLoss === 0) out.push(100);
    else out.push(round(100 - 100 / (1 + avgGain / avgLoss), 2));

    for (var i = period; i < gains.length; i++) {
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
      if (avgLoss === 0) out.push(100);
      else out.push(round(100 - 100 / (1 + avgGain / avgLoss), 2));
    }
    return out;
  }

  /* ═══ 6. MACD — Moving Average Convergence Divergence ═════════════════════ */
  function calcMACD(candles, fast, slow, signal) {
    fast = fast || 12;
    slow = slow || 26;
    signal = signal || 9;
    var cl = closes(candles);
    var emaFast = ema(cl, fast);
    var emaSlow = ema(cl, slow);
    var macdLine = [];
    for (var i = 0; i < cl.length; i++) {
      if (emaFast[i] === null || emaSlow[i] === null) { macdLine.push(null); continue; }
      macdLine.push(emaFast[i] - emaSlow[i]);
    }
    // signal line = EMA of MACD line
    var validMacd = [];
    var validIdx = [];
    for (var i = 0; i < macdLine.length; i++) {
      if (macdLine[i] !== null) { validMacd.push(macdLine[i]); validIdx.push(i); }
    }
    var sigEma = ema(validMacd, signal);
    var signalLine = macdLine.map(function () { return null; });
    for (var i = 0; i < sigEma.length; i++) {
      signalLine[validIdx[i]] = sigEma[i];
    }
    var histogram = [];
    for (var i = 0; i < cl.length; i++) {
      if (macdLine[i] === null || signalLine[i] === null) { histogram.push(null); continue; }
      histogram.push(round(macdLine[i] - signalLine[i], 4));
    }
    return {
      macd: macdLine.map(function (v) { return v !== null ? round(v, 4) : null; }),
      signal: signalLine.map(function (v) { return v !== null ? round(v, 4) : null; }),
      histogram: histogram
    };
  }

  /* ═══ 7. ATR — Average True Range ════════════════════════════════════════ */
  function calcATR(candles, period) {
    period = period || 14;
    var tr = [];
    for (var i = 0; i < candles.length; i++) {
      if (i === 0) {
        tr.push(candles[i].h - candles[i].l);
        continue;
      }
      var hl = candles[i].h - candles[i].l;
      var hc = Math.abs(candles[i].h - candles[i - 1].c);
      var lc = Math.abs(candles[i].l - candles[i - 1].c);
      tr.push(Math.max(hl, hc, lc));
    }
    var out = [];
    var atr = null;
    for (var i = 0; i < tr.length; i++) {
      if (i < period - 1) { out.push(null); continue; }
      if (atr === null) {
        var sum = 0;
        for (var j = i - period + 1; j <= i; j++) sum += tr[j];
        atr = sum / period;
      } else {
        atr = (atr * (period - 1) + tr[i]) / period;
      }
      out.push(round(atr, 4));
    }
    return out;
  }

  /* ═══ 8. Bollinger Bands ══════════════════════════════════════════════════ */
  function calcBollingerBands(candles, period, mult) {
    period = period || 20;
    mult = mult || 2;
    var cl = closes(candles);
    var mid = sma(cl, period);
    var upper = [], lower = [];
    for (var i = 0; i < cl.length; i++) {
      if (mid[i] === null) { upper.push(null); lower.push(null); continue; }
      var sumSq = 0;
      for (var j = i - period + 1; j <= i; j++) {
        sumSq += Math.pow(cl[j] - mid[i], 2);
      }
      var std = Math.sqrt(sumSq / period);
      upper.push(round(mid[i] + mult * std, 2));
      lower.push(round(mid[i] - mult * std, 2));
    }
    return {
      upper: upper,
      middle: mid.map(function (v) { return v !== null ? round(v, 2) : null; }),
      lower: lower
    };
  }

  /* ═══ 9. ADX — Average Directional Index ═════════════════════════════════ */
  function calcADX(candles, period) {
    period = period || 14;
    if (candles.length < period + 1) return candles.map(function () { return null; });

    var plusDM = [], minusDM = [], trArr = [];
    for (var i = 1; i < candles.length; i++) {
      var upMove = candles[i].h - candles[i - 1].h;
      var downMove = candles[i - 1].l - candles[i].l;
      plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
      minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
      var hl = candles[i].h - candles[i].l;
      var hc = Math.abs(candles[i].h - candles[i - 1].c);
      var lc = Math.abs(candles[i].l - candles[i - 1].c);
      trArr.push(Math.max(hl, hc, lc));
    }

    // Smoothed TR, +DM, -DM
    var smTR = [], smPDM = [], smMDM = [];
    var sTR = 0, sPDM = 0, sMDM = 0;
    for (var i = 0; i < period; i++) {
      sTR += trArr[i]; sPDM += plusDM[i]; sMDM += minusDM[i];
    }
    smTR.push(sTR); smPDM.push(sPDM); smMDM.push(sMDM);

    for (var i = period; i < trArr.length; i++) {
      smTR.push(smTR[smTR.length - 1] - smTR[smTR.length - 1] / period + trArr[i]);
      smPDM.push(smPDM[smPDM.length - 1] - smPDM[smPDM.length - 1] / period + plusDM[i]);
      smMDM.push(smMDM[smMDM.length - 1] - smMDM[smMDM.length - 1] / period + minusDM[i]);
    }

    var plusDI = smPDM.map(function (v, i) { return smTR[i] > 0 ? 100 * v / smTR[i] : 0; });
    var minusDI = smMDM.map(function (v, i) { return smTR[i] > 0 ? 100 * v / smTR[i] : 0; });

    var dx = plusDI.map(function (v, i) {
      var sum = v + minusDI[i];
      return sum > 0 ? 100 * Math.abs(v - minusDI[i]) / sum : 0;
    });

    // ADX = smoothed DX
    var adxArr = [];
    if (dx.length < period) return candles.map(function () { return null; });
    var adxSum = 0;
    for (var i = 0; i < period; i++) adxSum += dx[i];
    adxArr.push(round(adxSum / period, 2));

    for (var i = period; i < dx.length; i++) {
      adxArr.push(round((adxArr[adxArr.length - 1] * (period - 1) + dx[i]) / period, 2));
    }

    // Pad to match candle length
    var out = [];
    var padLen = candles.length - adxArr.length;
    for (var i = 0; i < padLen; i++) out.push(null);
    for (var i = 0; i < adxArr.length; i++) out.push(adxArr[i]);
    return out;
  }

  /* ═══ 10. SuperTrend ══════════════════════════════════════════════════════ */
  function calcSuperTrend(candles, period, multiplier) {
    period = period || 10;
    multiplier = multiplier || 3;
    var atr = calcATR(candles, period);
    var out = [];
    var prevUpper = null, prevLower = null, prevST = null;

    for (var i = 0; i < candles.length; i++) {
      if (atr[i] === null) { out.push(null); continue; }
      var hl2 = (candles[i].h + candles[i].l) / 2;
      var rawUpper = hl2 + multiplier * atr[i];
      var rawLower = hl2 - multiplier * atr[i];

      var upperBand = (prevUpper !== null && rawUpper < prevUpper) ? rawUpper : (prevUpper !== null ? Math.min(rawUpper, prevUpper) : rawUpper);
      var lowerBand = (prevLower !== null && rawLower > prevLower) ? rawLower : (prevLower !== null ? Math.max(rawLower, prevLower) : rawLower);

      var st;
      if (prevST === null) {
        st = candles[i].c > upperBand ? lowerBand : upperBand;
      } else {
        if (prevST === prevUpper) {
          st = candles[i].c > upperBand ? lowerBand : upperBand;
        } else {
          st = candles[i].c < lowerBand ? upperBand : lowerBand;
        }
      }

      prevUpper = upperBand;
      prevLower = lowerBand;
      prevST = st;
      out.push(round(st, 2));
    }
    return out;
  }

  /* ═══ 11. Ichimoku Cloud ══════════════════════════════════════════════════ */
  function calcIchimoku(candles) {
    function periodHL(arr, len, idx) {
      var hi = -Infinity, lo = Infinity;
      for (var j = idx - len + 1; j <= idx; j++) {
        if (arr[j].h > hi) hi = arr[j].h;
        if (arr[j].l < lo) lo = arr[j].l;
      }
      return (hi + lo) / 2;
    }

    var tenkan = [], kijun = [], senkouA = [], senkouB = [], chikou = [];
    var n = candles.length;

    for (var i = 0; i < n; i++) {
      if (i < 8) { tenkan.push(null); kijun.push(null); senkouA.push(null); senkouB.push(null); chikou.push(null); continue; }
      tenkan.push(round(periodHL(candles, 9, i), 2));
      kijun.push(i >= 25 ? round(periodHL(candles, 26, i), 2) : null);
      var ta = periodHL(candles, 9, i);
      var kj = i >= 25 ? periodHL(candles, 26, i) : null;
      senkouA.push(kj !== null ? round((ta + kj) / 2, 2) : null);
      senkouB.push(i >= 51 ? round(periodHL(candles, 52, i), 2) : null);
      chikou.push(i >= 26 ? round(candles[i - 26].c, 2) : null);
    }

    // Shift Senkou A & B forward by 26 periods
    var senkouAShifted = candles.map(function () { return null; });
    var senkouBShifted = candles.map(function () { return null; });
    for (var i = 0; i < senkouA.length; i++) {
      if (senkouA[i] !== null && i + 26 < n) {
        senkouAShifted[i + 26] = senkouA[i];
      }
      if (senkouB[i] !== null && i + 26 < n) {
        senkouBShifted[i + 26] = senkouB[i];
      }
    }

    return {
      tenkan_sen: tenkan,
      kijun_sen: kijun,
      senkou_span_a: senkouAShifted,
      senkou_span_b: senkouBShifted,
      chikou_span: chikou
    };
  }

  /* ═══ 12. Donchian Channels ══════════════════════════════════════════════ */
  function calcDonchianChannels(candles, period) {
    period = period || 20;
    var upper = [], lower = [], middle = [];
    for (var i = 0; i < candles.length; i++) {
      if (i < period - 1) { upper.push(null); lower.push(null); middle.push(null); continue; }
      var hi = -Infinity, lo = Infinity;
      for (var j = i - period + 1; j <= i; j++) {
        if (candles[j].h > hi) hi = candles[j].h;
        if (candles[j].l < lo) lo = candles[j].l;
      }
      upper.push(round(hi, 2));
      lower.push(round(lo, 2));
      middle.push(round((hi + lo) / 2, 2));
    }
    return { upper: upper, middle: middle, lower: lower };
  }

  /* ═══ 13. Keltner Channels ═══════════════════════════════════════════════ */
  function calcKeltnerChannels(candles, period, mult) {
    period = period || 20;
    mult = mult || 1.5;
    var cl = closes(candles);
    var mid = ema(cl, period);
    var atr = calcATR(candles, period);
    var upper = [], lower = [];
    for (var i = 0; i < candles.length; i++) {
      if (mid[i] === null || atr[i] === null) { upper.push(null); lower.push(null); continue; }
      upper.push(round(mid[i] + mult * atr[i], 2));
      lower.push(round(mid[i] - mult * atr[i], 2));
    }
    return {
      upper: upper,
      middle: mid.map(function (v) { return v !== null ? round(v, 2) : null; }),
      lower: lower
    };
  }

  /* ═══ 14. OBV — On Balance Volume ════════════════════════════════════════ */
  function calcOBV(candles) {
    var out = [0];
    for (var i = 1; i < candles.length; i++) {
      if (candles[i].c > candles[i - 1].c) {
        out.push(out[i - 1] + candles[i].v);
      } else if (candles[i].c < candles[i - 1].c) {
        out.push(out[i - 1] - candles[i].v);
      } else {
        out.push(out[i - 1]);
      }
    }
    return out;
  }

  /* ═══ 15. CMF — Chaikin Money Flow ═══════════════════════════════════════ */
  function calcCMF(candles, period) {
    period = period || 20;
    var out = [];
    for (var i = 0; i < candles.length; i++) {
      if (i < period - 1) { out.push(null); continue; }
      var mfvSum = 0, volSum = 0;
      for (var j = i - period + 1; j <= i; j++) {
        var hl = candles[j].h - candles[j].l;
        var mfv = hl > 0 ? ((candles[j].c - candles[j].l) - (candles[j].h - candles[j].c)) / hl * candles[j].v : 0;
        mfvSum += mfv;
        volSum += candles[j].v;
      }
      out.push(volSum > 0 ? round(mfvSum / volSum, 4) : null);
    }
    return out;
  }

  /* ═══ 16. Stochastic RSI ═════════════════════════════════════════════════ */
  function calcStochasticRSI(candles, rsiPeriod, stochPeriod, kSmooth, dSmooth) {
    rsiPeriod = rsiPeriod || 14;
    stochPeriod = stochPeriod || 14;
    kSmooth = kSmooth || 3;
    dSmooth = dSmooth || 3;

    var rsi = calcRSI(candles, rsiPeriod);
    var n = rsi.length;
    var stochK = [], stochD = [];

    // Stochastic of RSI
    var rawK = [];
    for (var i = 0; i < n; i++) {
      if (rsi[i] === null || i < stochPeriod - 1) { rawK.push(null); continue; }
      var hi = -Infinity, lo = Infinity;
      for (var j = i - stochPeriod + 1; j <= i; j++) {
        if (rsi[j] === null) continue;
        if (rsi[j] > hi) hi = rsi[j];
        if (rsi[j] < lo) lo = rsi[j];
      }
      rawK.push(hi - lo > 0 ? 100 * (rsi[i] - lo) / (hi - lo) : 50);
    }

    // Smooth K
    var validK = [];
    var validIdx = [];
    for (var i = 0; i < rawK.length; i++) {
      if (rawK[i] !== null) { validK.push(rawK[i]); validIdx.push(i); }
    }
    var smK = sma(validK, kSmooth);
    var kOut = rawK.map(function () { return null; });
    for (var i = 0; i < smK.length; i++) {
      kOut[validIdx[i]] = smK[i] !== null ? round(smK[i], 2) : null;
    }

    // Smooth D (SMA of K)
    var validK2 = [];
    var validIdx2 = [];
    for (var i = 0; i < kOut.length; i++) {
      if (kOut[i] !== null) { validK2.push(kOut[i]); validIdx2.push(i); }
    }
    var smD = sma(validK2, dSmooth);
    var dOut = kOut.map(function () { return null; });
    for (var i = 0; i < smD.length; i++) {
      dOut[validIdx2[i]] = smD[i] !== null ? round(smD[i], 2) : null;
    }

    return { k: kOut, d: dOut };
  }

  /* ═══ 17. CCI — Commodity Channel Index ══════════════════════════════════ */
  function calcCCI(candles, period) {
    period = period || 20;
    var tp = candles.map(function (c) { return (c.h + c.l + c.c) / 3; });
    var out = [];
    for (var i = 0; i < tp.length; i++) {
      if (i < period - 1) { out.push(null); continue; }
      var sum = 0;
      for (var j = i - period + 1; j <= i; j++) sum += tp[j];
      var mean = sum / period;
      var mad = 0;
      for (var j = i - period + 1; j <= i; j++) mad += Math.abs(tp[j] - mean);
      mad /= period;
      out.push(mad > 0 ? round((tp[i] - mean) / (0.015 * mad), 2) : null);
    }
    return out;
  }

  /* ═══ 18. ROC — Rate of Change ═══════════════════════════════════════════ */
  function calcROC(candles, period) {
    period = period || 12;
    var cl = closes(candles);
    var out = [];
    for (var i = 0; i < cl.length; i++) {
      if (i < period || cl[i - period] === 0) { out.push(null); continue; }
      out.push(round(((cl[i] - cl[i - period]) / cl[i - period]) * 100, 2));
    }
    return out;
  }

  /* ═══ 19. Momentum ═══════════════════════════════════════════════════════ */
  function calcMomentum(candles, period) {
    period = period || 10;
    var cl = closes(candles);
    var out = [];
    for (var i = 0; i < cl.length; i++) {
      if (i < period) { out.push(null); continue; }
      out.push(round(cl[i] - cl[i - period], 2));
    }
    return out;
  }

  /* ═══ 20. Parabolic SAR ══════════════════════════════════════════════════ */
  function calcParabolicSAR(candles) {
    var n = candles.length;
    if (n < 2) return candles.map(function () { return null; });

    var out = [];
    var isLong = candles[1].c > candles[0].c;
    var af = 0.02;
    var afStep = 0.02;
    var afMax = 0.2;
    var ep = isLong ? candles[0].h : candles[0].l;
    var sar = isLong ? candles[0].l : candles[0].h;

    out.push(null); // first point
    out.push(round(sar, 2));

    for (var i = 1; i < n; i++) {
      var prevSar = sar;

      sar = prevSar + af * (ep - prevSar);

      if (isLong) {
        sar = Math.min(sar, candles[i - 1].l);
        if (i >= 2) sar = Math.min(sar, candles[i - 2].l);
      } else {
        sar = Math.max(sar, candles[i - 1].h);
        if (i >= 2) sar = Math.max(sar, candles[i - 2].h);
      }

      if (isLong) {
        if (candles[i].l < sar) {
          isLong = false;
          sar = ep;
          ep = candles[i].l;
          af = afStep;
        } else {
          if (candles[i].h > ep) { ep = candles[i].h; af = Math.min(af + afStep, afMax); }
        }
      } else {
        if (candles[i].h > sar) {
          isLong = true;
          sar = ep;
          ep = candles[i].h;
          af = afStep;
        } else {
          if (candles[i].l < ep) { ep = candles[i].l; af = Math.min(af + afStep, afMax); }
        }
      }

      out.push(round(sar, 2));
    }
    return out;
  }

  /* ═══ 21. HMA — Hull Moving Average ══════════════════════════════════════ */
  function calcHMA(candles, period) {
    period = period || 16;
    var cl = closes(candles);
    var halfWma = calcWMA(candles, Math.floor(period / 2));
    var fullWma = calcWMA(candles, period);
    var diff = [];
    for (var i = 0; i < cl.length; i++) {
      if (halfWma[i] === null || fullWma[i] === null) { diff.push(null); continue; }
      diff.push(2 * halfWma[i] - fullWma[i]);
    }
    // WMA of the diff with sqrt(period) length
    var sqrtP = Math.max(1, Math.floor(Math.sqrt(period)));
    var out = [];
    var denom = sqrtP * (sqrtP + 1) / 2;
    for (var i = 0; i < diff.length; i++) {
      if (diff[i] === null || i < sqrtP - 1) { out.push(null); continue; }
      var sum = 0; var valid = true;
      for (var j = 0; j < sqrtP; j++) {
        if (diff[i - sqrtP + 1 + j] === null) { valid = false; break; }
        sum += diff[i - sqrtP + 1 + j] * (j + 1);
      }
      out.push(valid ? round(sum / denom, 4) : null);
    }
    return out;
  }

  /* ═══ 22. KAMA — Kaufman's Adaptive Moving Average ══════════════════════ */
  function calcKAMA(candles, period) {
    period = period || 10;
    var cl = closes(candles);
    var fastSC = 2 / (2 + 1);
    var slowSC = 2 / (30 + 1);
    var out = [];
    var prev = null;
    for (var i = 0; i < cl.length; i++) {
      if (i < period) { out.push(null); continue; }
      var direction = Math.abs(cl[i] - cl[i - period]);
      var volatility = 0;
      for (var j = i - period + 1; j <= i; j++) {
        volatility += Math.abs(cl[j] - cl[j - 1]);
      }
      var er = volatility !== 0 ? direction / volatility : 0;
      var sc = Math.pow(er * (fastSC - slowSC) + slowSC, 2);
      if (prev === null) {
        prev = cl[i];
      } else {
        prev = prev + sc * (cl[i] - prev);
      }
      out.push(round(prev, 4));
    }
    return out;
  }

  /* ═══ 23. TSI — True Strength Index ══════════════════════════════════════ */
  function calcTSI(candles, longPeriod, shortPeriod) {
    longPeriod = longPeriod || 25;
    shortPeriod = shortPeriod || 13;
    var cl = closes(candles);
    if (cl.length < 3) return cl.map(function () { return null; });
    // First-order smoothed momentum
    var momentum = [null];
    for (var i = 1; i < cl.length; i++) momentum.push(cl[i] - cl[i - 1]);
    var smoothed1 = ema(momentum, longPeriod);
    var smoothed2 = ema(smoothed1, shortPeriod);
    // First-order smoothed |momentum|
    var absMom = momentum.map(function (m) { return m !== null ? Math.abs(m) : null; });
    var absSmoothed1 = ema(absMom, longPeriod);
    var absSmoothed2 = ema(absSmoothed1, shortPeriod);
    var out = [];
    for (var i = 0; i < cl.length; i++) {
      if (smoothed2[i] === null || absSmoothed2[i] === null || absSmoothed2[i] === 0) {
        out.push(null);
      } else {
        out.push(round(100 * smoothed2[i] / absSmoothed2[i], 2));
      }
    }
    return out;
  }

  /* ═══ 24. STC — Schaff Trend Cycle ══════════════════════════════════════ */
  function calcSTC(candles, macdFast, macdSlow, stochPeriod, kSmooth, dSmooth) {
    macdFast = macdFast || 23;
    macdSlow = macdSlow || 50;
    stochPeriod = stochPeriod || 10;
    kSmooth = kSmooth || 3;
    dSmooth = dSmooth || 3;
    var cl = closes(candles);
    var macdResult = calcMACD(candles, macdFast, macdSlow, 0);
    var macdLine = macdResult.macd;
    // Stochastic of MACD
    var rawK = [];
    for (var i = 0; i < macdLine.length; i++) {
      if (macdLine[i] === null || i < stochPeriod - 1) { rawK.push(null); continue; }
      var hi = -Infinity, lo = Infinity;
      for (var j = i - stochPeriod + 1; j <= i; j++) {
        if (macdLine[j] === null) continue;
        if (macdLine[j] > hi) hi = macdLine[j];
        if (macdLine[j] < lo) lo = macdLine[j];
      }
      rawK.push(hi - lo > 0 ? 100 * (macdLine[i] - lo) / (hi - lo) : 50);
    }
    // Smooth K then D, apply twice
    function smoothArr(arr, per) {
      var valid = []; var idx = [];
      for (var i = 0; i < arr.length; i++) { if (arr[i] !== null) { valid.push(arr[i]); idx.push(i); } }
      var sm = sma(valid, per);
      var out = arr.map(function () { return null; });
      for (var i = 0; i < sm.length; i++) out[idx[i]] = sm[i];
      return out;
    }
    var k1 = smoothArr(rawK, kSmooth);
    var d1 = smoothArr(k1, dSmooth);
    var k2 = smoothArr(d1, kSmooth);
    var stc = smoothArr(k2, dSmooth);
    return stc;
  }

  /* ═══ 25. MFI — Money Flow Index ════════════════════════════════════════ */
  function calcMFI(candles, period) {
    period = period || 14;
    if (candles.length < period + 1) return candles.map(function () { return null; });
    var tp = candles.map(function (c) { return (c.h + c.l + c.c) / 3; });
    var mf = [];
    for (var i = 0; i < candles.length; i++) {
      mf.push(tp[i] * candles[i].v);
    }
    var out = [null];
    for (var i = 1; i < candles.length; i++) {
      if (i < period) { out.push(null); continue; }
      var posMF = 0, negMF = 0;
      for (var j = i - period + 1; j <= i; j++) {
        if (mf[j] > mf[j - 1]) posMF += mf[j];
        else negMF += mf[j];
      }
      var ratio = negMF === 0 ? 100 : posMF / negMF;
      out.push(round(100 - 100 / (1 + ratio), 2));
    }
    return out;
  }

  /* ═══ 26. PVT — Price Volume Trend ══════════════════════════════════════ */
  function calcPVT(candles) {
    var out = [0];
    for (var i = 1; i < candles.length; i++) {
      if (candles[i - 1].c === 0) { out.push(out[i - 1]); continue; }
      var pctChg = (candles[i].c - candles[i - 1].c) / candles[i - 1].c;
      out.push(round(out[i - 1] + candles[i].v * pctChg, 0));
    }
    return out;
  }

  /* ═══ 27. KVO — Klinger Volume Oscillator ═══════════════════════════════ */
  function calcKVO(candles, fast, slow) {
    fast = fast || 34;
    slow = slow || 55;
    // Trend: high+low+close vs previous
    var trend = [];
    for (var i = 0; i < candles.length; i++) {
      if (i === 0) { trend.push(1); continue; }
      var hlMid = candles[i].h + candles[i].l + candles[i].c;
      var prevHL = candles[i - 1].h + candles[i - 1].l + candles[i - 1].c;
      trend.push(hlMid > prevHL ? 1 : -1);
    }
    // Volume Force = V * |2*(H-L)/(H+L+C) - 1| * trend * 100
    var vf = [];
    for (var i = 0; i < candles.length; i++) {
      var hlc = candles[i].h + candles[i].l + candles[i].c;
      var dm = Math.abs(2 * (candles[i].h - candles[i].l) / (hlc || 1) - 1);
      vf.push(candles[i].v * dm * trend[i] * 100);
    }
    var emaFast = ema(vf, fast);
    var emaSlow = ema(vf, slow);
    var out = [];
    for (var i = 0; i < candles.length; i++) {
      if (emaFast[i] === null || emaSlow[i] === null) { out.push(null); continue; }
      out.push(round(emaFast[i] - emaSlow[i], 0));
    }
    return out;
  }

  /* ═══ 28. Anchored VWAP ═════════════════════════════════════════════════ */
  function calcAnchoredVWAP(candles, anchorIdx) {
    anchorIdx = anchorIdx || 0;
    var out = [];
    var cumTPVol = 0, cumVol = 0;
    for (var i = 0; i < candles.length; i++) {
      if (i < anchorIdx) { out.push(null); continue; }
      var tp = (candles[i].h + candles[i].l + candles[i].c) / 3;
      cumTPVol += tp * candles[i].v;
      cumVol += candles[i].v;
      out.push(cumVol > 0 ? round(cumTPVol / cumVol, 2) : null);
    }
    return out;
  }

  /* ═══ 29. Volume Profile ════════════════════════════════════════════════ */
  function calcVolumeProfile(candles, numBins) {
    numBins = numBins || 12;
    if (!candles || candles.length < 2) return null;
    var hi = -Infinity, lo = Infinity;
    for (var i = 0; i < candles.length; i++) {
      if (candles[i].h > hi) hi = candles[i].h;
      if (candles[i].l < lo) lo = candles[i].l;
    }
    if (hi === lo) return null;
    var binSize = (hi - lo) / numBins;
    var bins = [];
    for (var b = 0; b < numBins; b++) {
      bins.push({ priceFrom: round(lo + b * binSize, 2), priceTo: round(lo + (b + 1) * binSize, 2), volume: 0 });
    }
    for (var i = 0; i < candles.length; i++) {
      var mid = (candles[i].h + candles[i].l) / 2;
      var binIdx = Math.min(numBins - 1, Math.max(0, Math.floor((mid - lo) / binSize)));
      bins[binIdx].volume += candles[i].v;
    }
    var maxVol = 0;
    for (var b = 0; b < bins.length; b++) { if (bins[b].volume > maxVol) maxVol = bins[b].volume; }
    for (var b = 0; b < bins.length; b++) {
      bins[b].pctOfMax = maxVol > 0 ? round(bins[b].volume / maxVol * 100, 1) : 0;
    }
    // POC = price level with highest volume
    var pocBin = bins[0];
    for (var b = 1; b < bins.length; b++) { if (bins[b].volume > pocBin.volume) pocBin = bins[b]; }
    return { bins: bins, poc: round((pocBin.priceFrom + pocBin.priceTo) / 2, 2), pocVolume: pocBin.volume };
  }

  /* ═══ 30. TTM Squeeze ═══════════════════════════════════════════════════ */
  function calcTTMSqueeze(candles, bbPeriod, bbMult, kcPeriod, kcMult) {
    bbPeriod = bbPeriod || 20; bbMult = bbMult || 2;
    kcPeriod = kcPeriod || 20; kcMult = kcMult || 1.5;
    var bb = calcBollingerBands(candles, bbPeriod, bbMult);
    var kc = calcKeltnerChannels(candles, kcPeriod, kcMult);
    var out = [];
    for (var i = 0; i < candles.length; i++) {
      if (bb.upper[i] === null || kc.upper[i] === null) { out.push(null); continue; }
      out.push(bb.upper[i] < kc.upper[i] && bb.lower[i] > kc.lower[i]); // true = squeeze on
    }
    return out;
  }

  /* ═══ 31. Squeeze Momentum Indicator ════════════════════════════════════ */
  function calcSqueezeMomentum(candles) {
    var squeeze = calcTTMSqueeze(candles);
    var cl = closes(candles);
    // Linear regression of (close - (highest_h + lowest_l)/2) over 20 periods
    var period = 20;
    var out = [];
    for (var i = 0; i < cl.length; i++) {
      if (i < period - 1) { out.push(null); continue; }
      var hh = -Infinity, ll = Infinity;
      for (var j = i - period + 1; j <= i; j++) {
        if (candles[j].h > hh) hh = candles[j].h;
        if (candles[j].l < ll) ll = candles[j].l;
      }
      var series = [];
      for (var j = i - period + 1; j <= i; j++) {
        series.push(cl[j] - (hh + ll) / 2);
      }
      // Simple linear regression value (last point)
      var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      for (var j = 0; j < period; j++) {
        sumX += j; sumY += series[j]; sumXY += j * series[j]; sumX2 += j * j;
      }
      var slope = (period * sumXY - sumX * sumY) / (period * sumX2 - sumX * sumX);
      var intercept = (sumY - slope * sumX) / period;
      var regVal = slope * (period - 1) + intercept;
      out.push(round(regVal, 4));
    }
    return { values: out, squeeze: squeeze };
  }

  /* ═══ 32. Darvas Box ════════════════════════════════════════════════════ */
  function calcDarvasBox(candles, boxPeriod) {
    boxPeriod = boxPeriod || 20;
    if (candles.length < boxPeriod) return null;
    // Find highest high and lowest low in the lookback period
    var recentHigh = -Infinity, recentLow = Infinity;
    var start = Math.max(0, candles.length - boxPeriod);
    for (var i = start; i < candles.length; i++) {
      if (candles[i].h > recentHigh) recentHigh = candles[i].h;
      if (candles[i].l < recentLow) recentLow = candles[i].l;
    }
    var lastC = candles[candles.length - 1].c;
    var position = lastC >= recentHigh ? "at_upper" : lastC <= recentLow ? "at_lower" : "inside";
    var boxHigh = round(recentHigh, 2);
    var boxLow = round(recentLow, 2);
    var boxRange = round(recentHigh - recentLow, 2);
    var pctFromTop = round((recentHigh - lastC) / (boxRange || 1) * 100, 1);
    var breakout = lastC > recentHigh ? "up" : lastC < recentLow ? "down" : "none";
    return { boxHigh: boxHigh, boxLow: boxLow, boxRange: boxRange, position: position, breakout: breakout, pctFromTop: pctFromTop };
  }

  /* ═══ 33. Smart Money Concepts ══════════════════════════════════════════ */
  function calcSmartMoney(candles) {
    if (!candles || candles.length < 10) return null;

    // Detect Order Blocks: last opposing candle before a strong move
    var orderBlocks = [];
    var threshold = 2; // ATR multiplier for "strong move"
    var atr = calcATR(candles, 14);
    for (var i = 3; i < candles.length; i++) {
      if (atr[i] === null || atr[i] === 0) continue;
      var body = Math.abs(candles[i].c - candles[i].o);
      if (body > threshold * atr[i]) {
        // Strong bullish candle: look for last bearish candle before it
        if (candles[i].c > candles[i].o && candles[i - 1].c < candles[i - 1].o) {
          orderBlocks.push({ type: "bullish_ob", high: candles[i - 1].h, low: candles[i - 1].l, idx: i - 1 });
        }
        // Strong bearish candle: look for last bullish candle before it
        if (candles[i].c < candles[i].o && candles[i - 1].c > candles[i - 1].o) {
          orderBlocks.push({ type: "bearish_ob", high: candles[i - 1].h, low: candles[i - 1].l, idx: i - 1 });
        }
      }
    }
    // Keep last 3 of each type
    var bullOBs = orderBlocks.filter(function (b) { return b.type === "bullish_ob"; }).slice(-3);
    var bearOBs = orderBlocks.filter(function (b) { return b.type === "bearish_ob"; }).slice(-3);

    // Break of Structure (BOS): price breaks the most recent swing high or swing low
    var swingHighs = [], swingLows = [];
    for (var i = 2; i < candles.length - 2; i++) {
      if (candles[i].h > candles[i - 1].h && candles[i].h > candles[i - 2].h &&
          candles[i].h > candles[i + 1].h && candles[i].h > candles[i + 2].h) {
        swingHighs.push({ price: candles[i].h, idx: i });
      }
      if (candles[i].l < candles[i - 1].l && candles[i].l < candles[i - 2].l &&
          candles[i].l < candles[i + 1].l && candles[i].l < candles[i + 2].l) {
        swingLows.push({ price: candles[i].l, idx: i });
      }
    }
    var lastC = candles[candles.length - 1].c;
    var lastSwingHigh = swingHighs.length > 0 ? swingHighs[swingHighs.length - 1] : null;
    var lastSwingLow = swingLows.length > 0 ? swingLows[swingLows.length - 1] : null;
    var bos = "none";
    if (lastSwingHigh && lastC > lastSwingHigh.price) bos = "bullish_bos";
    if (lastSwingLow && lastC < lastSwingLow.price) bos = "bearish_bos";

    // Change of Character (CHoCH): first break after trend reversal
    var choch = "none";
    if (swingHighs.length >= 2 && swingLows.length >= 2) {
      var prevHigh = swingHighs[swingHighs.length - 2];
      var prevLow = swingLows[swingLows.length - 2];
      if (lastSwingHigh && lastC > lastSwingHigh.price && lastSwingLow && lastSwingLow.idx > prevHigh.idx) {
        choch = "bullish_choch";
      }
      if (lastSwingLow && lastC < lastSwingLow.price && lastSwingHigh && lastSwingHigh.idx > prevLow.idx) {
        choch = "bearish_choch";
      }
    }

    return {
      orderBlocks: { bullish: bullOBs, bearish: bearOBs },
      bos: bos, choch: choch,
      swingHighs: swingHighs.slice(-3), swingLows: swingLows.slice(-3)
    };
  }

  /* ═══ 34. Multi-Timeframe Trend Alignment ══════════════════════════════ */
  function calcMTFAlignment(candles) {
    // Approximate MTF using different-period MAs on single timeframe
    // Short (5m equivalent): EMA 9, Medium (1h equivalent): EMA 21, Long (daily equivalent): EMA 50
    var ema9 = calcEMA(candles, 9);
    var ema21 = calcEMA(candles, 21);
    var ema50 = calcEMA(candles, 50);
    var sma100 = candles.length >= 100 ? calcSMA(candles, 100) : candles.map(function () { return null; });
    var sma200 = candles.length >= 200 ? calcSMA(candles, 200) : candles.map(function () { return null; });

    var out = [];
    for (var i = 0; i < candles.length; i++) {
      if (ema50[i] === null) { out.push(null); continue; }
      var score = 0; var total = 0;
      var cl = candles[i].c;
      // EMA 9 > EMA 21: +1
      if (ema9[i] !== null && ema21[i] !== null) { total++; if (ema9[i] > ema21[i]) score++; }
      // EMA 21 > EMA 50: +1
      if (ema21[i] !== null) { total++; if (ema21[i] > ema50[i]) score++; }
      // Price > EMA 50: +1
      total++; if (cl > ema50[i]) score++;
      // EMA 50 > SMA 100: +1
      if (sma100[i] !== null) { total++; if (ema50[i] > sma100[i]) score++; }
      // SMA 100 > SMA 200: +1
      if (sma200[i] !== null) { total++; if (sma100[i] > sma200[i]) score++; }
      // Price > SMA 200: +1
      if (sma200[i] !== null) { total++; if (cl > sma200[i]) score++; }

      out.push(total > 0 ? round(score / total * 100, 1) : null);
    }
    return out;
  }

  /* ═══ Compute all indicators at once ═════════════════════════════════════ */
  function computeAll(candles) {
    if (!candles || candles.length < 5) return null;

    var macd = calcMACD(candles);
    var bb = calcBollingerBands(candles);
    var ich = calcIchimoku(candles);
    var dc = calcDonchianChannels(candles);
    var kc = calcKeltnerChannels(candles);
    var stochRSI = calcStochasticRSI(candles);
    var supertrend = calcSuperTrend(candles);
    var squeezeMom = calcSqueezeMomentum(candles);
    var smc = calcSmartMoney(candles);

    function last(arr) {
      if (!arr) return null;
      if (Array.isArray(arr)) {
        for (var i = arr.length - 1; i >= 0; i--) {
          if (arr[i] !== null && arr[i] !== undefined) return arr[i];
        }
        return null;
      }
      return null;
    }

    function lastPair(obj) {
      return { k: last(obj.k), d: last(obj.d) };
    }

    function lastTriple(obj) {
      return { upper: last(obj.upper), middle: last(obj.middle), lower: last(obj.lower) };
    }

    function lastIch(obj) {
      return {
        tenkan: last(obj.tenkan_sen),
        kijun: last(obj.kijun_sen),
        senkouA: last(obj.senkou_span_a),
        senkouB: last(obj.senkou_span_b),
        chikou: last(obj.chikou_span)
      };
    }

    function lastMacd(obj) {
      return { macd: last(obj.macd), signal: last(obj.signal), histogram: last(obj.histogram) };
    }

    var cl = closes(candles);
    var lastClose = last(cl);

    return {
      sma_20: last(calcSMA(candles, 20)),
      sma_50: last(calcSMA(candles, 50)),
      sma_200: candles.length >= 200 ? last(calcSMA(candles, 200)) : null,
      ema_9: last(calcEMA(candles, 9)),
      ema_21: last(calcEMA(candles, 21)),
      ema_50: last(calcEMA(candles, 50)),
      wma_20: last(calcWMA(candles, 20)),
      hma_16: last(calcHMA(candles, 16)),
      kama_10: last(calcKAMA(candles, 10)),
      vwap: last(calcVWAP(candles)),
      rsi_14: last(calcRSI(candles, 14)),
      macd: lastMacd(macd),
      atr_14: last(calcATR(candles, 14)),
      bb: lastTriple(bb),
      adx_14: last(calcADX(candles, 14)),
      supertrend: last(supertrend),
      ichimoku: lastIch(ich),
      donchian: lastTriple(dc),
      keltner: lastTriple(kc),
      obv: last(calcOBV(candles)),
      cmf_20: last(calcCMF(candles, 20)),
      stochRSI: lastPair(stochRSI),
      cci_20: last(calcCCI(candles, 20)),
      roc_12: last(calcROC(candles, 12)),
      momentum_10: last(calcMomentum(candles, 10)),
      psar: last(calcParabolicSAR(candles)),
      tsi: last(calcTSI(candles)),
      stc: last(calcSTC(candles)),
      mfi_14: last(calcMFI(candles, 14)),
      pvt: last(calcPVT(candles)),
      kvo: last(calcKVO(candles)),
      anchored_vwap: last(calcAnchoredVWAP(candles)),
      volumeProfile: calcVolumeProfile(candles),
      ttmSqueeze: squeezeMom ? (function () { var sq = squeezeMom.squeeze; for (var i = sq.length - 1; i >= 0; i--) { if (sq[i] !== null) return sq[i]; } return null; })() : null,
      squeezeMomentum: last(squeezeMom ? squeezeMom.values : null),
      darvasBox: calcDarvasBox(candles),
      smartMoney: smc,
      mtfAlignment: last(calcMTFAlignment(candles)),
      lastClose: lastClose
    };
  }

  /* ═══ Signal interpretation ══════════════════════════════════════════════ */
  function interpret(ind) {
    if (!ind) return {};
    var signals = {};
    var lc = ind.lastClose;

    // SMA signals
    signals.sma_20 = lc > ind.sma_20 ? 'bullish' : 'bearish';
    signals.sma_50 = ind.sma_200 ? (lc > ind.sma_50 ? 'bullish' : 'bearish') : null;

    // EMA signals
    signals.ema_9 = lc > ind.ema_9 ? 'bullish' : 'bearish';
    signals.ema_21 = lc > ind.ema_21 ? 'bullish' : 'bearish';

    // RSI
    signals.rsi_14 = ind.rsi_14 > 70 ? 'overbought' : ind.rsi_14 < 30 ? 'oversold' : 'neutral';

    // MACD
    if (ind.macd.histogram !== null) {
      signals.macd = ind.macd.histogram > 0 ? 'bullish' : 'bearish';
    }

    // Bollinger
    if (ind.bb.upper && ind.bb.lower) {
      if (lc > ind.bb.upper) signals.bb = 'overbought';
      else if (lc < ind.bb.lower) signals.bb = 'oversold';
      else signals.bb = 'neutral';
    }

    // Stoch RSI
    if (ind.stochRSI.k !== null) {
      signals.stochRSI = ind.stochRSI.k > 80 ? 'overbought' : ind.stochRSI.k < 20 ? 'oversold' : 'neutral';
    }

    // ADX
    if (ind.adx_14 !== null) {
      signals.adx = ind.adx_14 > 25 ? 'trending' : 'ranging';
    }

    // SuperTrend
    if (ind.supertrend !== null) {
      signals.supertrend = lc > ind.supertrend ? 'bullish' : 'bearish';
    }

    // CCI
    if (ind.cci_20 !== null) {
      signals.cci = ind.cci_20 > 100 ? 'overbought' : ind.cci_20 < -100 ? 'oversold' : 'neutral';
    }

    // PSAR
    if (ind.psar !== null) {
      signals.psar = lc > ind.psar ? 'bullish' : 'bearish';
    }

    // Ichimoku
    if (ind.ichimoku.tenkan !== null && ind.ichimoku.kijun !== null) {
      signals.ichimoku = ind.ichimoku.tenkan > ind.ichimoku.kijun ? 'bullish' : 'bearish';
    }

    // Keltner
    if (ind.keltner.upper && ind.keltner.lower) {
      if (lc > ind.keltner.upper) signals.keltner = 'overbought';
      else if (lc < ind.keltner.lower) signals.keltner = 'oversold';
      else signals.keltner = 'neutral';
    }

    // Donchian
    if (ind.donchian.upper && ind.donchian.lower) {
      if (lc >= ind.donchian.upper) signals.donchian = 'bullish';
      else if (lc <= ind.donchian.lower) signals.donchian = 'bearish';
      else signals.donchian = 'neutral';
    }

    // HMA
    if (ind.hma_16 !== null) {
      signals.hma_16 = lc > ind.hma_16 ? 'bullish' : 'bearish';
    }

    // KAMA
    if (ind.kama_10 !== null) {
      signals.kama_10 = lc > ind.kama_10 ? 'bullish' : 'bearish';
    }

    // TSI
    if (ind.tsi !== null) {
      signals.tsi = ind.tsi > 0 ? 'bullish' : 'bearish';
    }

    // STC
    if (ind.stc !== null) {
      signals.stc = ind.stc > 50 ? 'bullish' : 'bearish';
    }

    // MFI
    if (ind.mfi_14 !== null) {
      signals.mfi_14 = ind.mfi_14 > 80 ? 'overbought' : ind.mfi_14 < 20 ? 'oversold' : 'neutral';
    }

    // KVO
    if (ind.kvo !== null) {
      signals.kvo = ind.kvo > 0 ? 'bullish' : 'bearish';
    }

    // TTM Squeeze
    if (ind.ttmSqueeze !== null) {
      signals.ttmSqueeze = ind.ttmSqueeze ? 'oversold' : 'neutral'; // squeeze on = potential explosion coming
    }

    // Squeeze Momentum
    if (ind.squeezeMomentum !== null) {
      signals.squeezeMomentum = ind.squeezeMomentum > 0 ? 'bullish' : 'bearish';
    }

    // Darvas Box
    if (ind.darvasBox) {
      signals.darvasBox = ind.darvasBox.breakout === 'up' ? 'bullish' : ind.darvasBox.breakout === 'down' ? 'bearish' : 'neutral';
    }

    // Smart Money
    if (ind.smartMoney) {
      signals.smartMoney = ind.smartMoney.bos === 'bullish_bos' || ind.smartMoney.choch === 'bullish_choch' ? 'bullish'
        : ind.smartMoney.bos === 'bearish_bos' || ind.smartMoney.choch === 'bearish_choch' ? 'bearish' : 'neutral';
    }

    // MTF Alignment
    if (ind.mtfAlignment !== null) {
      signals.mtfAlignment = ind.mtfAlignment >= 70 ? 'bullish' : ind.mtfAlignment <= 30 ? 'bearish' : 'neutral';
    }

    // Overall
    var bullCount = 0, bearCount = 0, total = 0;
    Object.keys(signals).forEach(function (k) {
      if (!signals[k]) return;
      total++;
      if (signals[k] === 'bullish' || signals[k] === 'oversold') bullCount++;
      if (signals[k] === 'bearish' || signals[k] === 'overbought') bearCount++;
    });
    signals._overall = total > 0 ? (bullCount > bearCount ? 'bullish' : bearCount > bullCount ? 'bearish' : 'neutral') : null;
    signals._score = { bull: bullCount, bear: bearCount, neutral: total - bullCount - bearCount, total: total };

    return signals;
  }

  /* ═══════════════════════════════════════════════════════════════════════
     EXIT SCORE — Momentum Trading Exit Scoring Engine (0–100)
     5 factors: Trend(35) + Momentum(25) + Volume(20) + Volatility(10) + Structure(10)
     ═══════════════════════════════════════════════════════════════════════ */
  function computeExitScore(candles, ind) {
    if (!candles || candles.length < 10 || !ind) return null;

    var lc = ind.lastClose;
    if (lc === null || lc === undefined) return null;

    /* ── Helper: get last N values from a raw array ── */
    function lastN(arr, n) {
      var out = [];
      for (var i = arr.length - 1; i >= 0 && out.length < n; i--) {
        if (arr[i] !== null && arr[i] !== undefined) out.unshift(arr[i]);
      }
      return out;
    }

    /* ── Raw arrays for slope/crossover detection ── */
    var obvArr = calcOBV(candles);
    var pvtArr = calcPVT(candles);
    var atrArr = calcATR(candles, 14);

    var obvLast2 = lastN(obvArr, 2);
    var pvtLast2 = lastN(pvtArr, 2);
    var atrLast2 = lastN(atrArr, 2);

    /* ── Prior indicators for crossover detection ── */
    var indPrior = candles.length >= 12 ? computeAll(candles.slice(0, -1)) : null;

    /* ═══════════════════════════════════════════════════════════════════
       1. TREND REVERSAL (Max 35 pts)
       ═══════════════════════════════════════════════════════════════════ */
    var trend = 0;

    if (ind.ema_9 !== null && lc < ind.ema_9) trend += 3;
    if (ind.ema_21 !== null && lc < ind.ema_21) trend += 4;
    if (ind.ema_50 !== null && lc < ind.ema_50) trend += 5;
    if (ind.sma_20 !== null && lc < ind.sma_20) trend += 2;
    if (ind.sma_50 !== null && lc < ind.sma_50) trend += 3;
    if (ind.supertrend !== null && lc < ind.supertrend) trend += 5;

    if (ind.ichimoku) {
      var cloudTop = Math.max(ind.ichimoku.senkouA || 0, ind.ichimoku.senkouB || 0);
      if (lc < cloudTop || (ind.ichimoku.kijun && lc < ind.ichimoku.kijun)) trend += 4;
    }

    if (ind.psar !== null && lc < ind.psar) trend += 2;
    if (ind.vwap !== null && lc < ind.vwap) trend += 2;
    if (ind.anchored_vwap !== null && lc < ind.anchored_vwap) trend += 3;
    if (ind.mtfAlignment !== null && ind.mtfAlignment <= 70) trend += 2;

    trend = Math.min(trend, 35);

    /* ═══════════════════════════════════════════════════════════════════
       2. MOMENTUM WEAKNESS (Max 25 pts)
       ═══════════════════════════════════════════════════════════════════ */
    var momentum = 0;

    if (ind.rsi_14 !== null && ind.rsi_14 < 60) momentum += 4;
    // MACD: Bearish Cross — histogram was ≥0 last bar, now <0
    if (ind.macd && ind.macd.histogram !== null && ind.macd.histogram < 0) {
      var macdCross = !indPrior || !indPrior.macd || indPrior.macd.histogram === null || indPrior.macd.histogram >= 0;
      if (macdCross) momentum += 5;
    }
    if (ind.stc !== null && ind.stc < 75) momentum += 3;
    // TSI: Bearish Cross — was >0 last bar, now ≤0
    if (ind.tsi !== null && ind.tsi <= 0) {
      var tsiCross = !indPrior || indPrior.tsi === null || indPrior.tsi > 0;
      if (tsiCross) momentum += 3;
    }
    if (ind.roc_12 !== null && ind.roc_12 < 0) momentum += 3;
    if (ind.momentum_10 !== null && ind.momentum_10 < 0) momentum += 2;
    // Stochastic RSI: Bearish Cross — K was ≥D last bar, now K < D
    if (ind.stochRSI && ind.stochRSI.k !== null && ind.stochRSI.d !== null && ind.stochRSI.k < ind.stochRSI.d) {
      var stochCross = !indPrior || !indPrior.stochRSI || indPrior.stochRSI.k === null || indPrior.stochRSI.d === null || indPrior.stochRSI.k >= indPrior.stochRSI.d;
      if (stochCross) momentum += 3;
    }
    if (ind.cci_20 !== null && ind.cci_20 < 100) momentum += 2;

    momentum = Math.min(momentum, 25);

    /* ═══════════════════════════════════════════════════════════════════
       3. VOLUME DISTRIBUTION (Max 20 pts)
       ═══════════════════════════════════════════════════════════════════ */
    var vol = 0;

    if (obvLast2.length === 2 && obvLast2[1] < obvLast2[0]) vol += 5;
    if (ind.cmf_20 !== null && ind.cmf_20 < 0) vol += 4;
    // MFI: Falls below 80 — was ≥80 last bar, now <80
    if (ind.mfi_14 !== null && ind.mfi_14 < 80) {
      var mfiCross = !indPrior || indPrior.mfi_14 === null || indPrior.mfi_14 >= 80;
      if (mfiCross) vol += 3;
    }
    if (pvtLast2.length === 2 && pvtLast2[1] < pvtLast2[0]) vol += 3;
    // KVO: Bearish Cross — was >0 last bar, now ≤0
    if (ind.kvo !== null && ind.kvo <= 0) {
      var kvoCross = !indPrior || indPrior.kvo === null || indPrior.kvo > 0;
      if (kvoCross) vol += 3;
    }

    if (ind.smartMoney) {
      var smBearish = ind.smartMoney.bos === 'bearish_bos' || ind.smartMoney.choch === 'bearish_choch';
      if (smBearish) vol += 2;
    }

    vol = Math.min(vol, 20);

    /* ═══════════════════════════════════════════════════════════════════
       4. VOLATILITY EXHAUSTION (Max 10 pts)
       ═══════════════════════════════════════════════════════════════════ */
    var vold = 0;

    if (atrLast2.length === 2 && atrLast2[1] > atrLast2[0] && ind.adx_14 !== null && ind.adx_14 < 25) vold += 2;

    if (ind.bb && ind.bb.upper !== null) {
      var lastCandle = candles[candles.length - 1];
      if (lastCandle && lastCandle.h >= ind.bb.upper && lc < ind.bb.upper) vold += 2;
    }

    if (ind.keltner && ind.keltner.upper !== null) {
      var lastCandle2 = candles[candles.length - 1];
      if (lastCandle2 && lastCandle2.h >= ind.keltner.upper && lc < ind.keltner.upper) vold += 2;
    }

    if (ind.donchian && ind.donchian.lower !== null && lc < ind.donchian.lower) vold += 2;
    if (ind.squeezeMomentum !== null && ind.squeezeMomentum < 0) vold += 2;

    vold = Math.min(vold, 10);

    /* ═══════════════════════════════════════════════════════════════════
       5. MARKET STRUCTURE (Max 10 pts)
       ═══════════════════════════════════════════════════════════════════ */
    var struct = 0;

    if (ind.volumeProfile && ind.volumeProfile.poc !== null && lc < ind.volumeProfile.poc) struct += 4;
    if (ind.darvasBox && ind.darvasBox.breakout === 'down') struct += 3;

    if (ind.smartMoney && ind.smartMoney.swingHighs && ind.smartMoney.swingLows) {
      var sh = ind.smartMoney.swingHighs;
      var sl = ind.smartMoney.swingLows;
      if (sh.length >= 2 && sl.length >= 2) {
        if (sh[sh.length - 1].price < sh[sh.length - 2].price && sl[sl.length - 1].price < sl[sl.length - 2].price) struct += 3;
      }
    }

    struct = Math.min(struct, 10);

    /* ═══════════════════════════════════════════════════════════════════
       TOTAL + DECISION
       ═══════════════════════════════════════════════════════════════════ */
    var total = trend + momentum + vol + vold + struct;

    var decision;
    if (total <= 20) decision = { label: "Hold Position", action: "hold", color: "#22c55e" };
    else if (total <= 35) decision = { label: "Tighten Trailing Stop", action: "tighten", color: "#84cc16" };
    else if (total <= 50) decision = { label: "Book 25% Profit", action: "book25", color: "#eab308" };
    else if (total <= 65) decision = { label: "Exit 50% Position", action: "exit50", color: "#f97316" };
    else if (total <= 80) decision = { label: "Exit Full Position", action: "exitAll", color: "#ef4444" };
    else decision = { label: "Immediate Exit", action: "exitNow", color: "#dc2626" };

    /* ═══════════════════════════════════════════════════════════════════
       CRITICAL OVERRIDES
       ═══════════════════════════════════════════════════════════════════ */
    var overrides = [];

    if (ind.supertrend !== null && lc < ind.supertrend && ind.ema_21 !== null && lc < ind.ema_21) {
      overrides.push("SuperTrend Sell + Close below EMA(21)");
    }

    var obvFalling = obvLast2.length === 2 && obvLast2[1] < obvLast2[0];
    if (ind.anchored_vwap !== null && lc < ind.anchored_vwap && obvFalling && ind.cmf_20 !== null && ind.cmf_20 < 0) {
      overrides.push("Close below AVWAP + OBV falling + CMF bearish");
    }

    var macdBearish = ind.macd && ind.macd.histogram !== null && ind.macd.histogram < 0;
    var tsiBearish = ind.tsi !== null && ind.tsi <= 0;
    var stcBearish = ind.stc !== null && ind.stc <= 50;
    if (macdBearish && tsiBearish && stcBearish) {
      overrides.push("MACD + TSI + STC all bearish simultaneously");
    }

    var vpBreak = ind.volumeProfile && ind.volumeProfile.poc !== null && lc < ind.volumeProfile.poc;
    var darvasBreak = ind.darvasBox && ind.darvasBox.breakout === 'down';
    if (vpBreak || darvasBreak) {
      var avgVol = 0, volCount = 0;
      for (var vi = Math.max(0, candles.length - 21); vi < candles.length - 1; vi++) {
        avgVol += candles[vi].v; volCount++;
      }
      avgVol = volCount > 0 ? avgVol / volCount : 0;
      if (avgVol > 0 && candles[candles.length - 1].v > avgVol * 1.5) {
        overrides.push(vpBreak ? "Volume Profile POC breakdown on strong volume" : "Darvas Box breakdown on strong volume");
      }
    }

    return {
      total: total, trend: trend, trendMax: 35,
      momentum: momentum, momentumMax: 25,
      volume: vol, volumeMax: 20,
      volatility: vold, volatilityMax: 10,
      structure: struct, structureMax: 10,
      decision: decision, overrides: overrides
    };
  }

  /* ═══════════════════════════════════════════════════════════════════════
     ENTRY SCORE — Momentum Trading Entry Scoring Engine (0–100)
     5 factors: Trend(35) + Momentum(25) + Volume(20) + Breakout(10) + Structure(10)
     ═══════════════════════════════════════════════════════════════════════ */
  function computeEntryScore(candles, ind, currentPrice) {
    if (!candles || candles.length < 12 || !ind) return null;

    var lc = (currentPrice && currentPrice > 0) ? currentPrice : ind.lastClose;
    if (lc === null || lc === undefined) return null;

    function lastN(arr, n) {
      var out = [];
      for (var i = arr.length - 1; i >= 0 && out.length < n; i--) {
        if (arr[i] !== null && arr[i] !== undefined) out.unshift(arr[i]);
      }
      return out;
    }

    function isRising(arr, lookback) {
      var vals = lastN(arr, lookback || 2);
      if (vals.length < 2) return false;
      return vals[vals.length - 1] > vals[vals.length - 2];
    }

    var obvArr = calcOBV(candles);
    var pvtArr = calcPVT(candles);
    var atrArr = calcATR(candles, 14);
    var obvLast2 = lastN(obvArr, 2);
    var pvtLast2 = lastN(pvtArr, 2);
    var atrLast2 = lastN(atrArr, 2);

    var indPrior = candles.length >= 12 ? computeAll(candles.slice(0, -1)) : null;
    var indPrior2 = candles.length >= 13 ? computeAll(candles.slice(0, -2)) : null;
    var indPrior3 = candles.length >= 14 ? computeAll(candles.slice(0, -3)) : null;

    function recentCrossover(p0, p1, p2, p3) {
      if (!p0) return false;
      if (p0 && !p1) return true;
      if (p0 && p1 && !p2) return true;
      if (p0 && p1 && p2 && !p3) return true;
      return false;
    }

    /* ═══════════════════════════════════════════════════════════════════
       STAGE 1: ELIGIBILITY FILTER (All 5 must pass)
       ═══════════════════════════════════════════════════════════════════ */
    var eligible = true;
    var eligibilityDetails = [];
    if (ind.ema_21 === null || ind.ema_50 === null || ind.ema_21 <= ind.ema_50) { eligible = false; eligibilityDetails.push("EMA(21) below EMA(50)"); }
    if (ind.supertrendDir !== "up") { eligible = false; eligibilityDetails.push("SuperTrend not Buy"); }
    if (ind.mtfAlignment === null || ind.mtfAlignment < 70) { eligible = false; eligibilityDetails.push("MTF Alignment not Bullish"); }
    if (ind.ema_21 === null || lc <= ind.ema_21) { eligible = false; eligibilityDetails.push("Price below EMA(21)"); }
    var resistances = [];
    if (ind.bb && ind.bb.upper) resistances.push(ind.bb.upper);
    if (ind.keltner && ind.keltner.upper) resistances.push(ind.keltner.upper);
    if (ind.donchian && ind.donchian.upper) resistances.push(ind.donchian.upper);
    if (ind.ichimoku) {
      var cloudTop = Math.max(ind.ichimoku.senkouA || 0, ind.ichimoku.senkouB || 0);
      if (cloudTop > 0) resistances.push(cloudTop);
    }
    var nearResistance = false;
    for (var ri = 0; ri < resistances.length; ri++) {
      if (resistances[ri] > 0 && lc > 0 && resistances[ri] <= lc * 1.05 && resistances[ri] >= lc * 0.97) {
        nearResistance = true; break;
      }
    }
    if (nearResistance) { eligible = false; eligibilityDetails.push("Major resistance within 3-5%"); }

    /* ═══════════════════════════════════════════════════════════════════
       STAGE 2: MOMENTUM SCORE (0–100)
       ═══════════════════════════════════════════════════════════════════ */

    /* ── 2a. MOMENTUM CONFIRMATION (Max 35 pts) ── */
    var mom = 0;
    if (ind.macd && ind.macd.histogram !== null && ind.macd.histogram > 0) {
      var macdCross = !indPrior || !indPrior.macd || indPrior.macd.histogram === null || indPrior.macd.histogram <= 0;
      var macdCross3 = recentCrossover(
        ind.macd && ind.macd.histogram > 0,
        indPrior && indPrior.macd && indPrior.macd.histogram > 0,
        indPrior2 && indPrior2.macd && indPrior2.macd.histogram > 0,
        indPrior3 && indPrior3.macd && indPrior3.macd.histogram > 0
      );
      if (macdCross3) mom += 8;
    }
    var rsiRising = ind.rsi_14 !== null && indPrior && indPrior.rsi_14 !== null && ind.rsi_14 > indPrior.rsi_14;
    if (ind.rsi_14 !== null && ind.rsi_14 >= 55 && ind.rsi_14 <= 68 && rsiRising) mom += 6;
    if (ind.tsi !== null && ind.tsi > 0) mom += 5;
    if (ind.stc !== null && ind.stc > 75) mom += 5;
    if (ind.roc_12 !== null && ind.roc_12 > 0) mom += 4;
    if (ind.stochRSI && ind.stochRSI.k !== null && ind.stochRSI.d !== null && ind.stochRSI.k > ind.stochRSI.d) mom += 4;
    if (ind.cci_20 !== null && ind.cci_20 > 100) mom += 3;
    mom = Math.min(mom, 35);

    /* ── 2b. VOLUME ACCUMULATION (Max 25 pts) ── */
    var vol = 0;
    var obvRising = obvLast2.length === 2 && obvLast2[1] > obvLast2[0];
    if (obvRising) vol += 7;
    if (ind.cmf_20 !== null && ind.cmf_20 > 0) vol += 5;
    if (ind.smartMoney) {
      var smBullish = ind.smartMoney.bos === 'bullish_bos' || ind.smartMoney.choch === 'bullish_choch';
      if (smBullish) vol += 5;
    }
    var pvtRising = pvtLast2.length === 2 && pvtLast2[1] > pvtLast2[0];
    if (pvtRising) vol += 4;
    if (ind.kvo !== null && ind.kvo > 0) vol += 2;
    if (ind.mfi_14 !== null && ind.mfi_14 >= 55 && ind.mfi_14 <= 80) vol += 2;
    vol = Math.min(vol, 25);

    /* ── 2c. TREND STRENGTH (Max 20 pts) ── */
    var trend = 0;
    if (ind.ema_21 !== null && lc > ind.ema_21) trend += 6;
    if (ind.ema_9 !== null && ind.ema_21 !== null && ind.ema_9 > ind.ema_21) trend += 4;
    if (ind.supertrendDir === "up") trend += 4;
    if (ind.anchored_vwap !== null && lc > ind.anchored_vwap) trend += 3;
    if (ind.vwap !== null && lc > ind.vwap) trend += 2;
    if (ind.ichimoku) {
      var cloudTop2 = Math.max(ind.ichimoku.senkouA || 0, ind.ichimoku.senkouB || 0);
      if (lc > cloudTop2) trend += 1;
    }
    trend = Math.min(trend, 20);

    /* ── 2d. BREAKOUT & VOLATILITY (Max 15 pts) ── */
    var brk = 0;
    if (ind.darvasBox && ind.darvasBox.breakout === 'up') brk += 5;
    if (ind.ttmSqueeze === false && indPrior && indPrior.ttmSqueeze === true) brk += 4;
    else if (ind.squeezeMomentum !== null && ind.squeezeMomentum > 0 && indPrior && indPrior.squeezeMomentum !== null && indPrior.squeezeMomentum <= 0) brk += 4;
    if (ind.donchian && ind.donchian.upper !== null && lc >= ind.donchian.upper) brk += 3;
    if (atrLast2.length === 2 && atrLast2[1] > atrLast2[0]) brk += 2;
    var bbExpand = ind.bb && ind.bb.upper !== null && ind.bb.lower !== null && ind.keltner && ind.keltner.upper !== null && ind.keltner.lower !== null;
    if (bbExpand) {
      var bbWidth = ind.bb.upper - ind.bb.lower;
      var kcWidth = ind.keltner.upper - ind.keltner.lower;
      if (bbWidth > kcWidth) brk += 1;
    }
    brk = Math.min(brk, 15);

    /* ── 2e. MARKET STRUCTURE (Max 5 pts) ── */
    var struct = 0;
    if (ind.volumeProfile && ind.volumeProfile.poc !== null && lc > ind.volumeProfile.poc) struct += 3;
    if (ind.smartMoney && ind.smartMoney.swingHighs && ind.smartMoney.swingLows) {
      var sh = ind.smartMoney.swingHighs;
      var sl = ind.smartMoney.swingLows;
      if (sh.length >= 2 && sl.length >= 2) {
        if (sh[sh.length - 1].price > sh[sh.length - 2].price && sl[sl.length - 1].price > sl[sl.length - 2].price) struct += 2;
      }
    }
    struct = Math.min(struct, 5);

    /* ── FRESH SIGNAL BONUS (Max +10 pts) ── */
    var freshBonus = 0;
    var freshSignals = [];

    var macdNow = ind.macd && ind.macd.histogram !== null && ind.macd.histogram > 0;
    var macdP1 = indPrior && indPrior.macd && indPrior.macd.histogram !== null && indPrior.macd.histogram > 0;
    var macdP2 = indPrior2 && indPrior2.macd && indPrior2.macd.histogram !== null && indPrior2.macd.histogram > 0;
    var macdP3 = indPrior3 && indPrior3.macd && indPrior3.macd.histogram !== null && indPrior3.macd.histogram > 0;
    if (macdNow && recentCrossover(macdNow, macdP1, macdP2, macdP3)) {
      freshBonus += 2; freshSignals.push("MACD crossover (last 3 sessions)");
    }

    if (ind.supertrendDir === "up") {
      var stNow = true;
      var stP1 = indPrior && indPrior.supertrendDir === "up";
      var stP2 = indPrior2 && indPrior2.supertrendDir === "up";
      var stP3 = indPrior3 && indPrior3.supertrendDir === "up";
      if (recentCrossover(stNow, stP1, stP2, stP3)) {
        freshBonus += 2; freshSignals.push("SuperTrend Buy (last 3 sessions)");
      }
    }

    var ttmNow = ind.ttmSqueeze === false;
    var ttmP1 = indPrior && indPrior.ttmSqueeze === false;
    var ttmP2 = indPrior2 && indPrior2.ttmSqueeze === false;
    var ttmP3 = indPrior3 && indPrior3.ttmSqueeze === false;
    if (ttmNow && recentCrossover(ttmNow, ttmP1, ttmP2, ttmP3)) {
      freshBonus += 2; freshSignals.push("TTM Squeeze release (last 3 sessions)");
    }

    var ema9xNow = ind.ema_9 !== null && ind.ema_21 !== null && ind.ema_9 > ind.ema_21;
    var ema9xP1 = indPrior && indPrior.ema_9 !== null && indPrior.ema_21 !== null && indPrior.ema_9 > indPrior.ema_21;
    var ema9xP2 = indPrior2 && indPrior2.ema_9 !== null && indPrior2.ema_21 !== null && indPrior2.ema_9 > indPrior2.ema_21;
    var ema9xP3 = indPrior3 && indPrior3.ema_9 !== null && indPrior3.ema_21 !== null && indPrior3.ema_9 > indPrior3.ema_21;
    if (ema9xNow && recentCrossover(ema9xNow, ema9xP1, ema9xP2, ema9xP3)) {
      freshBonus += 2; freshSignals.push("EMA9 crossed EMA21 (last 3 sessions)");
    }

    var darvasNow = ind.darvasBox && ind.darvasBox.breakout === 'up';
    var darvasP1 = indPrior && indPrior.darvasBox && indPrior.darvasBox.breakout === 'up';
    var darvasP2 = indPrior2 && indPrior2.darvasBox && indPrior2.darvasBox.breakout === 'up';
    if (darvasNow && recentCrossover(darvasNow, darvasP1, darvasP2, false)) {
      freshBonus += 2; freshSignals.push("Darvas breakout (last 2 sessions)");
    }

    freshBonus = Math.min(freshBonus, 10);

    /* ═══════════════════════════════════════════════════════════════════
       TOTAL + DECISION
       ═══════════════════════════════════════════════════════════════════ */
    var total = mom + vol + trend + brk + struct + freshBonus;
    total = Math.min(total, 100);

    var decision;
    if (total >= 92) decision = { label: "Strong Buy", action: "strongBuy", color: "#15803d" };
    else if (total >= 85) decision = { label: "Buy", action: "buy", color: "#22c55e" };
    else if (total >= 78) decision = { label: "Buy on Breakout/Pullback", action: "pullback", color: "#84cc16" };
    else if (total >= 70) decision = { label: "Watchlist", action: "watchlist", color: "#eab308" };
    else decision = { label: "Avoid", action: "avoid", color: "#ef4444" };

    return {
      total: total,
      eligible: eligible, eligibilityDetails: eligibilityDetails,
      momentum: mom, momentumMax: 35,
      volume: vol, volumeMax: 25,
      trend: trend, trendMax: 20,
      breakout: brk, breakoutMax: 15,
      structure: struct, structureMax: 5,
      freshBonus: freshBonus, freshBonusMax: 10, freshSignals: freshSignals,
      decision: decision,
      overrides: freshSignals
    };
  }

  /* ═══════════════════════════════════════════════════════════════════════
     STAGE 3: EXECUTION SCORE (Hourly)
     ═══════════════════════════════════════════════════════════════════════ */
  function computeExecutionScore(candles, ind) {
    if (!candles || !ind) return null;
    var lc = ind.lastClose;
    if (lc === null || lc === undefined) return null;

    var obvArr = calcOBV(candles);
    var obvLast2 = [];
    for (var i = obvArr.length - 1; i >= 0 && obvLast2.length < 2; i--) {
      if (obvArr[i] !== null && obvArr[i] !== undefined) obvLast2.unshift(obvArr[i]);
    }

    var checks = [];
    var passed = 0;
    var total = 6;

    if (ind.ema_9 !== null && ind.ema_21 !== null && ind.ema_9 > ind.ema_21) { passed++; checks.push({ label: "EMA9 > EMA21", ok: true }); }
    else checks.push({ label: "EMA9 > EMA21", ok: false });

    if (ind.vwap !== null && lc > ind.vwap) { passed++; checks.push({ label: "Price above VWAP", ok: true }); }
    else checks.push({ label: "Price above VWAP", ok: false });

    if (ind.macd && ind.macd.histogram !== null && ind.macd.histogram > 0) { passed++; checks.push({ label: "MACD bullish", ok: true }); }
    else checks.push({ label: "MACD bullish", ok: false });

    if (obvLast2.length === 2 && obvLast2[1] > obvLast2[0]) { passed++; checks.push({ label: "OBV rising", ok: true }); }
    else checks.push({ label: "OBV rising", ok: false });

    var atrArr = calcATR(candles, 14);
    var atrLast2 = [];
    for (var j = atrArr.length - 1; j >= 0 && atrLast2.length < 2; j--) {
      if (atrArr[j] !== null && atrArr[j] !== undefined) atrLast2.unshift(atrArr[j]);
    }
    if (atrLast2.length === 2 && atrLast2[1] > atrLast2[0]) { passed++; checks.push({ label: "Volume expansion", ok: true }); }
    else checks.push({ label: "Volume expansion", ok: false });

    if (ind.donchian && ind.donchian.upper !== null && lc >= ind.donchian.upper) { passed++; checks.push({ label: "No overhead resistance", ok: true }); }
    else if (ind.bb && ind.bb.upper !== null && lc > ind.bb.upper) { passed++; checks.push({ label: "No overhead resistance", ok: true }); }
    else checks.push({ label: "No overhead resistance", ok: false });

    var score = total > 0 ? Math.round((passed / total) * 100) : 0;

    return { score: score, passed: passed, total: total, checks: checks };
  }

  /* ═══════════════════════════════════════════════════════════════════════
     MULTI-TIMEFRAME ENTRY SCORE
     Weekly(10%) + Daily(55%) + Hourly(35%)
     ═══════════════════════════════════════════════════════════════════════ */
  function computeMultiTFEntryScore(candlesWeekly, indW, candlesDaily, indD, candlesHourly, indH, currentPrice) {
    var weekly = candlesWeekly && indW ? computeEntryScore(candlesWeekly, indW, currentPrice) : null;
    var daily = candlesDaily && indD ? computeEntryScore(candlesDaily, indD, currentPrice) : null;
    var hourly = candlesHourly && indH ? computeEntryScore(candlesHourly, indH, currentPrice) : null;
    var execution = candlesHourly && indH ? computeExecutionScore(candlesHourly, indH) : null;

    var wTotal = weekly ? weekly.total : 0;
    var dTotal = daily ? daily.total : 0;
    var hTotal = hourly ? hourly.total : 0;

    var wCount = weekly ? 1 : 0;
    var dCount = daily ? 1 : 0;
    var hCount = hourly ? 1 : 0;
    var denom = wCount * 0.10 + dCount * 0.55 + hCount * 0.35;

    var finalScore = denom > 0 ? Math.round((wTotal * 0.10 + dTotal * 0.55 + hTotal * 0.35) / denom) : 0;

    var decision;
    if (finalScore >= 92) decision = { label: "Strong Buy", action: "strongBuy", color: "#15803d" };
    else if (finalScore >= 85) decision = { label: "Buy", action: "buy", color: "#22c55e" };
    else if (finalScore >= 78) decision = { label: "Buy on Breakout/Pullback", action: "pullback", color: "#84cc16" };
    else if (finalScore >= 70) decision = { label: "Watchlist", action: "watchlist", color: "#eab308" };
    else decision = { label: "Avoid", action: "avoid", color: "#ef4444" };

    var eligible = daily ? daily.eligible : false;

    var allOverrides = [].concat(daily ? daily.freshSignals : [], hourly ? hourly.freshSignals : []);

    return {
      weekly: weekly, daily: daily, hourly: hourly,
      execution: execution,
      finalScore: finalScore, decision: decision,
      eligible: eligible, eligibilityDetails: daily ? daily.eligibilityDetails : [],
      overrides: allOverrides
    };
  }

  return {
    calcSMA: calcSMA,
    calcEMA: calcEMA,
    calcWMA: calcWMA,
    calcVWAP: calcVWAP,
    calcRSI: calcRSI,
    calcMACD: calcMACD,
    calcATR: calcATR,
    calcBollingerBands: calcBollingerBands,
    calcADX: calcADX,
    calcSuperTrend: calcSuperTrend,
    calcIchimoku: calcIchimoku,
    calcDonchianChannels: calcDonchianChannels,
    calcKeltnerChannels: calcKeltnerChannels,
    calcOBV: calcOBV,
    calcCMF: calcCMF,
    calcStochasticRSI: calcStochasticRSI,
    calcCCI: calcCCI,
    calcROC: calcROC,
    calcMomentum: calcMomentum,
    calcParabolicSAR: calcParabolicSAR,
    calcHMA: calcHMA,
    calcKAMA: calcKAMA,
    calcTSI: calcTSI,
    calcSTC: calcSTC,
    calcMFI: calcMFI,
    calcPVT: calcPVT,
    calcKVO: calcKVO,
    calcAnchoredVWAP: calcAnchoredVWAP,
    calcVolumeProfile: calcVolumeProfile,
    calcTTMSqueeze: calcTTMSqueeze,
    calcSqueezeMomentum: calcSqueezeMomentum,
    calcDarvasBox: calcDarvasBox,
    calcSmartMoney: calcSmartMoney,
    calcMTFAlignment: calcMTFAlignment,
    computeAll: computeAll,
    interpret: interpret,
    computeExitScore: computeExitScore,
    computeEntryScore: computeEntryScore,
    computeExecutionScore: computeExecutionScore,
    computeMultiTFEntryScore: computeMultiTFEntryScore,
    round: round
  };
})();
