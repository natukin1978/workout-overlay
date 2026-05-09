import React, { useState } from 'react';
import './App.css';

function App() {
  const [total, setTotal] = useState(0);
  const [undone, setUndone] = useState(0);
  const [inputValue, setInputValue] = useState(1);
  const [animateTotal, setAnimateTotal] = useState(false);
  const [animateUndone, setAnimateUndone] = useState(false);
  
  // パーティクルを管理する配列
  const [particles, setParticles] = useState([]);

  // 星を生成する関数
  const createParticles = () => {
    const newParticles = [];
    const count = 12; // 一回に出す星の数
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 360; // 全方位に飛ばすための角度
      const distance = 100 + Math.random() * 50; // 飛ぶ距離
      const tx = Math.cos(angle * (Math.PI / 180)) * distance + "px";
      const ty = Math.sin(angle * (Math.PI / 180)) * distance + "px";
      
      newParticles.push({
        id: Date.now() + i,
        tx,
        ty,
        color: ["#ff6b6b", "#4ecdc4", "#ffbd39", "#ffffff"][i % 4]
      });
    }
    
    setParticles(newParticles);
    
    // 800ms後にパーティクルデータを消去してメモリを節約
    setTimeout(() => {
      setParticles([]);
    }, 800);
  };

  const triggerAnimate = (target) => {
    if (target === 'total') {
      setAnimateTotal(true);
      setTimeout(() => setAnimateTotal(false), 400);
    } else {
      setAnimateUndone(true);
      setTimeout(() => setAnimateUndone(false), 400);
    }
    createParticles(); // アニメーションに合わせて星を出す
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
      triggerAnimate('total');
      triggerAnimate('undone');
    }
  };

  return (
    <div className="overlay-container">
      <div className="row">
        <div className="label-today">今日の</div>
      </div>

      <div className="row">
        <div className="label-badge" style={{ backgroundColor: '#4ecdc4' }}>総筋トレ回数</div>
        <div className={`count-display ${animateTotal ? 'bounce' : ''}`}>
          {total}
        </div>
      </div>

      <div className="row">
        <div className="label-badge">未消化</div>
        <div className="undone-count-wrapper">
          <div className={`count-display ${animateUndone ? 'bounce' : ''}`}>
            {undone}
          </div>
          
          {/* パーティクルの描画 */}
          {particles.map(p => (
            <span
              key={p.id}
              className="particle"
              style={{
                '--tx': p.tx,
                '--ty': p.ty,
                color: p.color
              }}
            >
              ★
            </span>
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
      </div>
    </div>
  );
}

export default App;
