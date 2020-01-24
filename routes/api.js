const express = require('express');
const router = express.Router();
const {isNumeric, isFractionString, isRadixString, toRational, toRadix, toDecimal, toLSD, fromLSD } = require('../lib/convert');

router.get("/radix/:base/:decval", async (req, res) => {
  const {base, decval} = req.params;
  let data = {
    valid: false
  };
  let valid = isNumeric(base);
  if (valid) {
    const baseVal = parseInt(base);
    if (isNumeric(decval) || isFractionString(decval)) {
      data = await toRadix(decval, baseVal, 1024);
    }
  }
  res.send(data);
});

router.get("/decimal/:base/:radixval", async (req, res) => {
  const {base, radixval} = req.params;
  let data = {
    valid: false
  };
  let valid = isNumeric(base);
  if (valid) {
    const base_val = parseInt(base);
    if (isRadixString(radixval, base_val)) {
      data = await toDecimal(radixval, base_val, 1024);
    }
  }
  res.send(data);
});

router.get("/rational/:decimal/:precision", async (req, res) => {
  const {decimal, precision} = req.params;
  let data = {
    valid: false
  };
  let valid = isNumeric(decimal);
  if (valid) {
    const dec_val = parseInt(decimal);
    let prec_val = 1024;
    if (isNumeric(precision)) {
      const prec_int = parseInt(precision);
      if (prec_int > 9) {
        prec_val = prec_int;
      }
    }
    data = await toRational(dec_val, prec_val);
  }
  res.send(data);
});


module.exports = router;
