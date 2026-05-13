import { useState, useCallback } from 'react';
import { Equal, Plus, Minus, X, Divide } from 'lucide-react';

export default function Calculator() {
  const [display, setDisplay] = useState('0');
  const [prev, setPrev] = useState('');
  const [op, setOp] = useState('');
  const [fresh, setFresh] = useState(true);

  const inputNum = useCallback(
    (num: string) => {
      if (fresh) {
        setDisplay(num);
        setFresh(false);
      } else {
        setDisplay(display === '0' ? num : display + num);
      }
    },
    [display, fresh]
  );

  const inputOp = useCallback(
    (operator: string) => {
      setPrev(display);
      setOp(operator);
      setFresh(true);
    },
    [display]
  );

  const calculate = useCallback(() => {
    if (!op || !prev) return;
    const a = parseFloat(prev);
    const b = parseFloat(display);
    let result = 0;
    switch (op) {
      case '+':
        result = a + b;
        break;
      case '-':
        result = a - b;
        break;
      case '*':
        result = a * b;
        break;
      case '/':
        result = b !== 0 ? a / b : NaN;
        break;
    }
    setDisplay(String(result));
    setOp('');
    setPrev('');
    setFresh(true);
  }, [display, op, prev]);

  const clear = useCallback(() => {
    setDisplay('0');
    setPrev('');
    setOp('');
    setFresh(true);
  }, []);

  const buttons = [
    { label: 'C', action: clear, className: 'bg-[#f87171]/10 text-[#f87171]' },
    { label: '%', action: () => setDisplay(String(parseFloat(display) / 100)), className: 'text-[#9090a8]' },
    { label: '/', action: () => inputOp('/'), className: 'text-[#fbbf24]', icon: Divide },
    { label: '7', action: () => inputNum('7') },
    { label: '8', action: () => inputNum('8') },
    { label: '9', action: () => inputNum('9') },
    { label: '*', action: () => inputOp('*'), className: 'text-[#fbbf24]', icon: X },
    { label: '4', action: () => inputNum('4') },
    { label: '5', action: () => inputNum('5') },
    { label: '6', action: () => inputNum('6') },
    { label: '-', action: () => inputOp('-'), className: 'text-[#fbbf24]', icon: Minus },
    { label: '1', action: () => inputNum('1') },
    { label: '2', action: () => inputNum('2') },
    { label: '3', action: () => inputNum('3') },
    { label: '+', action: () => inputOp('+'), className: 'text-[#fbbf24]', icon: Plus },
    { label: '0', action: () => inputNum('0'), span: 2 },
    { label: '.', action: () => inputNum('.') },
    { label: '=', action: calculate, className: 'bg-[#7c6bff] text-white', icon: Equal },
  ];

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f]">
      {/* Display */}
      <div className="flex-1 flex flex-col justify-end px-5 pb-4">
        <div className="text-[10px] text-[#585870] text-right h-4">
          {prev} {op}
        </div>
        <div className="text-3xl font-light text-[#e8e8f0] text-right tracking-tight break-all">
          {display}
        </div>
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-4 gap-px bg-white/[0.04] p-2 rounded-t-2xl">
        {buttons.map((btn, i) => {
          const Icon = btn.icon;
          return (
            <button
              key={i}
              onClick={btn.action}
              className={`h-12 rounded-lg text-sm font-medium transition-all active:scale-95 flex items-center justify-center ${
                btn.className || 'bg-[#12121a] text-[#e8e8f0] hover:bg-[#1a1a25]'
              } ${btn.span === 2 ? 'col-span-2' : ''}`}
              style={btn.span === 2 ? { gridColumn: 'span 2' } : undefined}
            >
              {Icon ? <Icon className="w-4 h-4" /> : btn.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
