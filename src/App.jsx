import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReconnectingWebSocket from 'reconnecting-websocket';
import './App.css';

function App() {
  const params = new URLSearchParams(window.location.search);

  const getBackgroundColorFromUrl = () => {
    // ?color=ffffff のように指定。指定がない場合は 'transparent'（透明）にする
    return params.get('color') || 'transparent';
  };

  // 音量設定: ?vol=50 のように指定。デフォルトは0で無効。
  const volumeParam = params.get('vol');
  const soundVolume = volumeParam !== null ? parseInt(volumeParam, 10) / 100 : 0;

  const [backgroundColor] = useState(getBackgroundColorFromUrl());
  const [total, setTotal] = useState(0);
  const [undone, setUndone] = useState(0);
  const [inputValue, setInputValue] = useState(1);
  const [animateTotal, setAnimateTotal] = useState(false);
  const [animateUndone, setAnimateUndone] = useState(false);
  
  // パーティクル管理用のステート（配列）
  const [totalParticles, setTotalParticles] = useState([]);
  const [undoneParticles, setUndoneParticles] = useState([]);

  const socketRef = useRef(null);

  // --- 音声ファイルの定義 ---
  const popSoundUrl = '/pa1.mp3'; 
  const audioRef = useRef(new Audio(popSoundUrl));

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

  const playPopSound = useCallback(() => {
    // 音量が0なら何もしない
    if (soundVolume <= 0) return;

    // 再生位置を最初に戻して再生（連打に対応）
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(e => console.log("Audio play blocked:", e));
  }, [soundVolume]);

  const triggerAnimate = useCallback((target) => {
    playPopSound();

    if (target === 'total') {
      setAnimateTotal(true);
      setTimeout(() => setAnimateTotal(false), 400);
      createParticles('total');
    } else if (target === 'undone') {
      setAnimateUndone(true);
      setTimeout(() => setAnimateUndone(false), 400);
      createParticles('undone');
    }
  }, [playPopSound]);

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

  // 音量の初期設定
  useEffect(() => {
    audioRef.current.volume = Math.min(Math.max(soundVolume, 0), 1);
  }, [soundVolume]);

  useEffect(() => {
    const rws = new ReconnectingWebSocket('ws://localhost:38696/workout');
    socketRef.current = rws;

    rws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'SYNC_STATE':
            // 初回接続時の全データ同期
            setTotal(data.total);
            setUndone(data.undone);
            break;
          case 'DIGEST':
            // 消化処理：両方を更新するが、アニメーションはTotal（増える方）のみ
            setTotal(data.total);
            setUndone(data.undone);
            triggerAnimate('total'); // 総数が増えたので星を飛ばす
            break;
          case 'UPDATE_TOTAL':
            setTotal(prev => {
              // 数値が増えた場合のみアニメーションを実行
              if (data.value > prev) triggerAnimate('total');
              return data.value;
            });
            break;
          case 'UPDATE_UNDONE':
            setUndone(prev => {
              // 未消化数が増えた（追加された）場合のみアニメーションを実行
              if (data.value > prev) triggerAnimate('undone');
              return data.value;
            });
            break;
          case 'ADD_UNDONE':
            // このタイプは常に「増える」のでアニメーションを呼ぶ
            setUndone(prev => prev + data.value);
            triggerAnimate('undone');
            break;
          default:
            console.warn("Unknown message type:", data.type);
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    };

    return () => {
      rws.close();
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
        <span>&nbsp;</span>
        <button onClick={digestWorkoutAll}>全消化</button>
      </div>
    </div>
  );
}

export default App;
