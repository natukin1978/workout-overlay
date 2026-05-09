import React, { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [total, setTotal] = useState(0);
  const [undone, setUndone] = useState(0);
  const [inputValue, setInputValue] = useState(1);
  const [animateTotal, setAnimateTotal] = useState(false);
  const [animateUndone, setAnimateUndone] = useState(false);
  
  // パーティクル管理用のステート（配列）
  const [totalParticles, setTotalParticles] = useState([]);
  const [undoneParticles, setUndoneParticles] = useState([]);

  // 星を生成する共通関数
  const createParticles = (target) => {
    const newParticles = [];
    const count = 12;
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 360;
      const distance = 80 + Math.random() * 40;
      const tx = Math.cos(angle * (Math.PI / 180)) * distance + "px";
      const ty = Math.sin(angle * (Math.PI / 180)) * distance + "px";
      
      newParticles.push({
        id: Date.now() + i,
        tx,
        ty,
        color: ["#ff6b6b", "#4ecdc4", "#ffbd39", "#ffffff"][i % 4]
      });
    }
    
    if (target === 'total') {
      setTotalParticles(newParticles);
      setTimeout(() => setTotalParticles([]), 800);
    } else {
      setUndoneParticles(newParticles);
      setTimeout(() => setUndoneParticles([]), 800);
    }
  };

  const triggerAnimate = (target) => {
    if (target === 'total') {
      setAnimateTotal(true);
      setTimeout(() => setAnimateTotal(false), 400);
      createParticles('total');
    } else if (target === 'undone') {
      setAnimateUndone(true);
      setTimeout(() => setAnimateUndone(false), 400);
      createParticles('undone');
    }
  };

  const setTotalDirect = () => {
    setTotal(Number(inputValue));
    triggerAnimate('total');
  };

  const setUndoneDirect = () => {
    setUndone(Number(inputValue));
    triggerAnimate('undone');
  };

  const setUndoneAdd = () => {
    setUndone(prev => prev + Number(inputValue));
    triggerAnimate('undone');
  };

  const digestWorkout = () => {
    const amount = Number(inputValue);
    const actualDigest = Math.min(undone, amount);
    if (actualDigest > 0) {
      setUndone(prev => prev - actualDigest);
      setTotal(prev => prev + actualDigest);
      // 両方の数値をアニメーションさせ、星を出す
      triggerAnimate('total');
      triggerAnimate('undone');
    }
  };

  const digestWorkoutAll = () => {
    const actualDigest = undone;
    if (actualDigest > 0) {
      setUndone(prev => prev - actualDigest);
      setTotal(prev => prev + actualDigest);
      // 両方の数値をアニメーションさせ、星を出す
      triggerAnimate('total');
      triggerAnimate('undone');
    }
  };

  // --- WebSocket通信の実装 ---
  useEffect(() => {
    // Python側で立てるサーバーのURL (ポート番号は例)
    const socket = new WebSocket('ws://localhost:38696/workout');

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // 送られてきたデータに応じて数値を更新
      if (data.type === 'UPDATE_TOTAL') {
        setTotal(data.value);
        triggerAnimate('total');
      } else if (data.type === 'UPDATE_UNDONE') {
        setUndone(data.value);
        triggerAnimate('undone');
      } else if (data.type === 'ADD_UNDONE') {
        setUndone(value => value + data.value);
        triggerAnimate('undone');
      }
    };

    return () => socket.close(); // コンポーネント終了時に接続を閉じる
  }, []);

  return (
    <div className="overlay-container">
      <div className="row">
        <div className="label-today">今日の</div>
      </div>

      {/* 総筋トレ回数セクション */}
      <div className="row">
        <div className="label-badge" style={{ backgroundColor: '#4ecdc4' }}>総筋トレ回数</div>
        <div className="counter-wrapper">
          <div className={`count-display ${animateTotal ? 'bounce' : ''}`}>
            {total}
          </div>
          {totalParticles.map(p => (
            <span key={p.id} className="particle" style={{ '--tx': p.tx, '--ty': p.ty, color: p.color }}>★</span>
          ))}
        </div>
      </div>

      {/* 未消化セクション */}
      <div className="row">
        <div className="label-badge">未消化</div>
        <div className="counter-wrapper">
          <div className={`count-display ${animateUndone ? 'bounce' : ''}`}>
            {undone}
          </div>
          {undoneParticles.map(p => (
            <span key={p.id} className="particle" style={{ '--tx': p.tx, '--ty': p.ty, color: p.color }}>★</span>
          ))}
        </div>
      </div>

      <div className="debug-panel">
        <input 
          type="number" 
          value={inputValue} 
          onChange={(e) => setInputValue(e.target.value)} 
          style={{ width: '50px', fontSize: '16px' }}
        />
        <button onClick={setTotalDirect}>総数設定</button>
        <button onClick={setUndoneDirect}>未消化設定</button>
        <button onClick={setUndoneAdd}>未消化加算</button>
        <button onClick={digestWorkout}>消化</button>
        <button onClick={digestWorkoutAll}>全消化</button>
      </div>
    </div>
  );
}

export default App;
