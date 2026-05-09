import React, { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';

function App() {
  const getBackgroundColorFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    // ?color=ffffff のように指定。指定がない場合は 'transparent'（透明）にする
    return params.get('color') || 'transparent';
  };

  const [backgroundColor] = useState(getBackgroundColorFromUrl());
  const [total, setTotal] = useState(0);
  const [undone, setUndone] = useState(0);
  const [inputValue, setInputValue] = useState(1);
  const [animateTotal, setAnimateTotal] = useState(false);
  const [animateUndone, setAnimateUndone] = useState(false);
  
  // パーティクル管理用のステート（配列）
  const [totalParticles, setTotalParticles] = useState([]);
  const [undoneParticles, setUndoneParticles] = useState([]);

  const reconnectTimerRef = useRef(null);
  const socketRef = useRef(null);

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

  const triggerAnimate = useCallback((target) => {
    if (target === 'total') {
      setAnimateTotal(true);
      setTimeout(() => setAnimateTotal(false), 400);
      createParticles('total');
    } else if (target === 'undone') {
      setAnimateUndone(true);
      setTimeout(() => setAnimateUndone(false), 400);
      createParticles('undone');
    }
  }, []);

  // サーバーへリクエストを送る共通関数
  const sendRequest = (type, value) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, value }));
    }
  };

  // 各ボタンの処理をリクエスト送信に変更
  const setTotalDirect = () => {
    sendRequest("REQUEST_UPDATE_TOTAL", Number(inputValue));
  };

  const setUndoneDirect = () => {
    sendRequest("REQUEST_UPDATE_UNDONE", Number(inputValue));
  };

  const setUndoneAdd = () => {
    sendRequest("REQUEST_ADD_UNDONE", Number(inputValue));
  };

  const digestWorkout = () => {
    const amount = Number(inputValue);
    const actualDigest = Math.min(undone, amount);
    if (actualDigest > 0) {
      // 消化処理（未消化を減らし、総数を増やす）
      // 複雑な連鎖移動も、サーバーにリクエストを送って一括同期します
      sendRequest("REQUEST_UPDATE_UNDONE", undone - actualDigest);
      sendRequest("REQUEST_UPDATE_TOTAL", total + actualDigest);
    }
  };

  const digestWorkoutAll = () => {
    if (undone > 0) {
      sendRequest("REQUEST_UPDATE_UNDONE", 0);
      sendRequest("REQUEST_UPDATE_TOTAL", total + undone);
    }
  };

  // --- WebSocket通信の実装 ---
  useEffect(() => {
    // 接続処理を定義
    const connect = () => {
      // 既存の接続がある、または再接続待機中の場合は何もしない
      if (socketRef.current?.readyState === WebSocket.OPEN || socketRef.current?.readyState === WebSocket.CONNECTING) {
        return;
      }

      const socket = new WebSocket('ws://localhost:38696/workout');
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('Connected to Workout Server');
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'SYNC_STATE') {
          // 初期接続時の同期
          setTotal(data.total);
          setUndone(data.undone);
        } else if (data.type === 'UPDATE_TOTAL') {
          setTotal(data.value);
          triggerAnimate('total');
        } else if (data.type === 'UPDATE_UNDONE') {
          setUndone(data.value);
          triggerAnimate('undone');
        } else if (data.type === 'ADD_UNDONE') {
          setUndone(prev => prev + data.value);
          triggerAnimate('undone');
        }
      };

      socket.onclose = (event) => {
        // 意図的な切断（アンマウント）でなければ再接続
        if (event.wasClean) {
          console.log('Connection closed cleanly');
        } else {
          console.log('Connection lost. Reconnecting in 5s...');
          if (!reconnectTimerRef.current) {
            reconnectTimerRef.current = setTimeout(connect, 5000);
          }
        }
      };

      socket.onerror = () => {
        socket.close(); // oncloseを誘発させて再接続ロジックへ流す
      };
    };

    // 初回実行
    connect();

    // クリーンアップ
    return () => {
      if (socketRef.current) {
        // close() を呼ぶ前に onclose を無効化して、アンマウント時の再接続を防ぐ
        socketRef.current.onclose = null; 
        socketRef.current.close();
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [triggerAnimate]);

  return (
    <div className="overlay-container" style={{ backgroundColor: backgroundColor }}>
      <div className="row">
        <div className="label-today">今日の筋トレ</div>
      </div>

      {/* 総筋トレ回数セクション */}
      <div className="row">
        <div className="label-badge" style={{ backgroundColor: '#4ecdc4' }}>総回数</div>
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
