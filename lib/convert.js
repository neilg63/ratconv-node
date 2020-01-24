const util = require('util');
const exec = util.promisify(require('child_process').exec);

const config = require('../.env');

const isNumeric = (num) => {
  let dt = typeof num;
  if (num !== null && num !== undefined && (dt === 'number' || dt === 'string')) {
    return !isNaN(parseFloat(num)) && isFinite(num);
  } else {
    return false;
  }
}

const isFractionString = (str) => {
  let valid = false;
  if (typeof str === 'string') {
    if (str.indexOf('/') > 0) {
      valid = /^\d+\/\d+$/.test(str.trim()) || !/^\/0+$/.test(str.trim());
    }
  }
  return valid;
}

const isRadixString = (str, base) => {
  let valid = false;
  if (typeof str === 'string') {
    const radixStr = str.trim().toLowerCase();
    if (base <= 36) {
      let letterRange = '';
      if (base > 10) {
        const maxLetter = String.fromCharCode(86 + base);
        letterRange = 'a-' + maxLetter;
      }
      const charRange = '[0-9'+letterRange+']';
      const rgx = new RegExp('^'+charRange+'+(\.'+charRange+'+)?(/'+charRange+')?$');
      valid = rgx.test(radixStr);
    } else if (base <= 60) {
      const rgx = new RegExp('^([0-9][0-9]?:)*([0-9][0-9]?)(./([0-9][0-9]?)?(:[0-9][0-9]?)*)?$');
      valid = rgx.test(radixStr);
    }
  }
  return valid;
}

const convert = async (mode, first, second, third = null) => {
  let parts = [config.command, mode, first, second];
  if (third) {
    parts.push(third);
  }
  const data = await exec(parts.join(' '));
  let result = {valid: false};
  if (data.stdout) {
    const json = data.stdout;
    if (typeof json === 'string') {
      if (json.indexOf('{') >= 0 && json.indexOf('}') > 10) {
        result = JSON.parse(json);
      }
    }
  }
  return result;
}

const toRational = async (num = 0, precision = 512) => {
  if (isNumeric(num)) {
    if (!isNumeric(precision)) {
      precision = 512;
    }
    const result = await convert('f', num, precision);
    if (result.ratnum) {
      if (result.ratnum instanceof Object) {
        return {valid: true, ...result.ratnum};
      }
    }
  }
  return {valid: false};
}

const toDecimal = async (radix, base = 10, precision = 512) => {
  if (isNumeric(base)) {
    if (!isNumeric(precision)) {
      precision = 512;
    }
    const result = await convert('d', radix, base, precision);
    if (result.ratnum) {
      const {ratnum} = result;
      return {valid: true, display: ratnum.display, value: ratnum.value,source: radix, base};
    }
  } else {
    return { valid: false };
  }
}

const toRadix = async (decimal, base = 16, precision = 512) => {
  let frac_str = "";
  if (typeof decimal === "string") {
    if (decimal.indexOf('/') > 0) {
      const frac = await parseFraction(decimal);
      if (frac.denom > 0) {
        frac_str = decimal;
        decimal = frac.numer / frac.denom;
      }
    }
  }
  if (isNumeric(decimal)) {
    if (!isNumeric(precision)) {
      precision = 512;
    }
    if (typeof decimal === "string") {
      decimal = parseFloat(decimal);
    }
    const in_val = frac_str.length > 1? frac_str : decimal;
    const result = await convert('r', in_val, base, precision);
    if (result.radval) {
      const {radval, ratnum} = result;
      return { valid: true, display: radval.value, dec_val: radval.dec_val, frac: radval.frac, numer: ratnum.numer, denom: ratnum.denom }
    }
  } else {
    return { valid: false };
  }
}

const toLSD = async (decimal) => {
  if (isNumeric(decimal)) {
    const pounds = Math.floor(decimal); 
    const dec_shillings = (decimal - pounds) * 20;
    const shillings = Math.floor(dec_shillings);
    const dec_pennies = Math.ceil((dec_shillings - shillings) * 12 * 1000000) / 1000000;
    let pennies = 0;
    let penny_numer = 0;
    let penny_denom = 0;
    if (dec_pennies !== 0) {
      const pennyData = await convert('f', dec_pennies);
      const {ratnum} = pennyData;
      if (ratnum) {
        pennies = Math.floor(ratnum.value);
        penny_denom = parseInt(ratnum.denom);
        penny_numer = Math.ceil(pennies) % penny_denom;
        
      }
    }
   return {pounds, shillings, pennies, dec_pennies, penny_numer, penny_denom};
  } else {
    return { valid: false };
  }
}

const fromLSD = async (pounds = 0, shillings = 0, pennies = 0) => {
  let dec_pounds = 0;
  if (isNumeric(pounds)) {
    dec_pounds = parseFloat(pounds);
  }
  if (isNumeric(shillings)) {
    dec_pounds += parseFloat(shillings) / 20;
  }
  if (isNumeric(pennies)) {
    dec_pounds += parseFloat(pennies) / 240;
  }
  return dec_pounds;
}

const precisionDivide = (numer, denom) => {
  const scale = 1000000000000000n;
  const result = (BigInt(numer) * scale) / BigInt(denom); 
  return parseFloat(result) / parseFloat(scale);
}

const parseFraction = async (str) => {
  let numer = 0;
  let denom = 0;
  let integer = 0;
  let multiple = 0;
  let decimal = 0;
  let frac_str = "";
  if (typeof str === 'string') {
    let parts = str.trim().split(/\s+/);
    if (parts.length > 1 && isNumeric(parts[0])) {
      integer = parseInt(parts[0]);
      frac_str = parts[1].trim();
    } else {
      frac_str = str.trim();
    }
    if (frac_str.indexOf('/') > 0) {
      parts = frac_str.split('/');
      if (parts.length > 1) {
        if (isNumeric(parts[0]) && isNumeric(parts[1])) {
          const dn = parseInt(parts[1]);
          const nm = parseInt(parts[0]);
          if (dn > 0 && nm > 0) {
            denom = dn;
            multiple = nm;
            numer = nm + (integer * dn);
            decimal = precisionDivide(denom, numer);
          }
        }
      }
    }
  }
  return {numer, denom, integer, multiple, decimal};
}


module.exports = {isNumeric, isFractionString, isRadixString, toRational, toRadix, toDecimal, toLSD, fromLSD };