const isFiniteNumber = (n) => typeof n === 'number' && Number.isFinite(n);

const formatAmountForInput = (n, { maxDecimals = 2 } = {}) => {
  const num = Number(n);
  if (!isFiniteNumber(num)) return '';
  const fixed = num.toFixed(Math.max(0, Math.min(8, maxDecimals)));
  // Trim trailing zeros (and trailing dot).
  return fixed.replace(/\.?0+$/, '');
};

const normalizeExpression = (raw) => {
  if (raw === null || typeof raw === 'undefined') return '';
  let s = String(raw);
  // Strip currency symbols and spaces/commas.
  s = s.replace(/[\s,]/g, '');
  s = s.replace(/[₹$€£¥₩₽₺₫₴₦₱₲₵₡₭₮₸₼₾]/g, '');
  // Normalize operators.
  s = s.replace(/[xX×]/g, '*');
  s = s.replace(/[÷]/g, '/');
  return s;
};

const tokenize = (expr) => {
  const out = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if ((ch >= '0' && ch <= '9') || ch === '.') {
      let j = i + 1;
      while (j < expr.length) {
        const c = expr[j];
        if ((c >= '0' && c <= '9') || c === '.') j += 1;
        else break;
      }
      const raw = expr.slice(i, j);
      const n = Number(raw);
      if (!Number.isFinite(n)) throw new Error('Invalid number');
      out.push({ t: 'num', v: n, pct: false });
      i = j;
      continue;
    }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '(' || ch === ')' || ch === '%') {
      out.push({ t: ch });
      i += 1;
      continue;
    }
    throw new Error('Invalid character');
  }
  return out;
};

const precedence = (op) => {
  if (op === 'pct') return 5;
  if (op === 'u+' || op === 'u-') return 4;
  if (op === '*' || op === '/') return 3;
  if (op === '+' || op === '-') return 2;
  return 0;
};

const isRightAssoc = (op) => op === 'u+' || op === 'u-';

const toRpn = (tokens) => {
  const output = [];
  const stack = [];
  let prevType = 'start'; // start | num | op | lparen | rparen

  const pushOp = (op) => {
    const p1 = precedence(op);
    while (stack.length) {
      const top = stack[stack.length - 1];
      if (top.t !== 'op') break;
      const op2 = top.op;
      const p2 = precedence(op2);
      if (p2 > p1 || (p2 === p1 && !isRightAssoc(op))) {
        output.push(stack.pop());
        continue;
      }
      break;
    }
    stack.push({ t: 'op', op });
  };

  for (const tok of tokens) {
    if (tok.t === 'num') {
      output.push(tok);
      prevType = 'num';
      continue;
    }

    if (tok.t === '(') {
      stack.push({ t: 'lparen' });
      prevType = 'lparen';
      continue;
    }

    if (tok.t === ')') {
      let found = false;
      while (stack.length) {
        const top = stack.pop();
        if (top.t === 'lparen') {
          found = true;
          break;
        }
        output.push(top);
      }
      if (!found) throw new Error('Mismatched parentheses');
      prevType = 'rparen';
      continue;
    }

    if (tok.t === '%') {
      // Postfix percent operator.
      pushOp('pct');
      prevType = 'op';
      continue;
    }

    if (tok.t === '+' || tok.t === '-' || tok.t === '*' || tok.t === '/') {
      const isUnary = prevType === 'start' || prevType === 'op' || prevType === 'lparen';
      const op = isUnary && (tok.t === '+' || tok.t === '-') ? (tok.t === '+' ? 'u+' : 'u-') : tok.t;
      pushOp(op);
      prevType = 'op';
      continue;
    }

    throw new Error('Invalid token');
  }

  while (stack.length) {
    const top = stack.pop();
    if (top.t === 'lparen') throw new Error('Mismatched parentheses');
    output.push(top);
  }

  return output;
};

const applyBinary = (op, a, b) => {
  const av = a.v;
  const bv = b.v;
  const aIsPct = !!a.pct;
  const bIsPct = !!b.pct;

  // Calculator-style percent for +/-
  if (op === '+' || op === '-') {
    if (bIsPct) {
      const delta = av * (bv / 100);
      return { v: op === '+' ? av + delta : av - delta, pct: false };
    }
    return { v: op === '+' ? av + bv : av - bv, pct: false };
  }

  // For other ops, treat percent as a fraction.
  const left = aIsPct ? av / 100 : av;
  const right = bIsPct ? bv / 100 : bv;

  if (op === '*') return { v: left * right, pct: false };
  if (op === '/') {
    if (right === 0) throw new Error('Division by zero');
    return { v: left / right, pct: false };
  }
  throw new Error('Unknown operator');
};

export const evaluateAmountExpression = (raw) => {
  const normalized = normalizeExpression(raw);
  if (!normalized) return { ok: false, value: null, error: 'Enter an amount' };
  if (!/^[0-9.+\-*/()%]*$/.test(normalized)) return { ok: false, value: null, error: 'Invalid characters' };

  try {
    const tokens = tokenize(normalized);
    const rpn = toRpn(tokens);
    const stack = [];

    for (const tok of rpn) {
      if (tok.t === 'num') {
        stack.push({ v: tok.v, pct: false });
        continue;
      }

      if (tok.t === 'op') {
        const op = tok.op;
        if (op === 'u+' || op === 'u-') {
          const a = stack.pop();
          if (!a) throw new Error('Invalid expression');
          stack.push({ v: op === 'u-' ? -a.v : a.v, pct: a.pct });
          continue;
        }
        if (op === 'pct') {
          const a = stack.pop();
          if (!a) throw new Error('Invalid expression');
          stack.push({ v: a.v, pct: true });
          continue;
        }

        const b = stack.pop();
        const a = stack.pop();
        if (!a || !b) throw new Error('Invalid expression');
        stack.push(applyBinary(op, a, b));
        continue;
      }

      throw new Error('Invalid expression');
    }

    if (stack.length !== 1) throw new Error('Invalid expression');
    const result = stack[0];
    const value = result.pct ? result.v / 100 : result.v;
    if (!isFiniteNumber(value)) throw new Error('Invalid expression');
    return { ok: true, value, error: null };
  } catch (e) {
    return { ok: false, value: null, error: e?.message || 'Invalid expression' };
  }
};

export const hasMathOperators = (raw) => {
  const normalized = normalizeExpression(raw);
  return /[+\-*/()%]/.test(normalized);
};

export { formatAmountForInput, normalizeExpression };
