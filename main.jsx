import React from 'react'
import ReactDOM from 'react-dom/client'

/**
 * THE SOLUTION:
 * This error often occurs when React is imported incorrectly or there is a version mismatch 
 * in the environment. We ensure we use the standard React 18 patterns.
 * I have also streamlined the Firebase imports to ensure stability.
 */

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken,
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot, 
  updateDoc
} from 'firebase/firestore';
import { 
  Zap, 
  Plus, 
  Loader2, 
  Activity, 
  Trophy 
} from 'lucide-react';

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'pulse-chess-v1';

// --- GAME CONSTANTS ---
const INITIAL_BOARD = [
  ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
  ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
  ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
];

const PIECE_ICONS = {
  'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟',
  'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙'
};

const CORE_SQUARES = [[3,3], [3,4], [4,3], [4,4]]; 

const PULSE_REWARDS = {
  p: 1, n: 2, b: 2, r: 3, q: 4,
  P: 1, N: 2, B: 2, R: 3, Q: 4
};

// --- MAIN GAME COMPONENT ---
function App() {
  const [user, setUser] = React.useState(null);
  const [view, setView] = React.useState('lobby'); 
  const [currentGameId, setCurrentGameId] = React.useState(null);
  const [gameData, setGameData] = React.useState(null);
  const [selectedSquare, setSelectedSquare] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth failed:", err);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    if (!user || !currentGameId) return;
    const gameDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'games', currentGameId);
    const unsubscribe = onSnapshot(gameDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGameData(data);
      } else {
        setView('lobby');
        setCurrentGameId(null);
      }
    }, (error) => console.error("Firestore error:", error));
    return () => unsubscribe();
  }, [user, currentGameId]);

  const createGame = async () => {
    if (!user) return;
    const newGameId = Math.random().toString(36).substring(2, 9).toUpperCase();
    const newGame = {
      id: newGameId,
      board: JSON.stringify(INITIAL_BOARD),
      turn: 'white',
      players: { white: user.uid, black: null },
      pulsePoints: { white: 0, black: 0 },
      status: 'waiting',
      winner: null,
      createdAt: Date.now()
    };
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'games', newGameId);
      await setDoc(docRef, newGame);
      setCurrentGameId(newGameId);
      setView('game');
    } catch (err) { console.error(err); }
  };

  const joinGame = async (gameId) => {
    if (!user) return;
    const gId = gameId.toUpperCase();
    try {
      const gameDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'games', gId);
      await updateDoc(gameDocRef, { 'players.black': user.uid, 'status': 'active' });
      setCurrentGameId(gId);
      setView('game');
    } catch (err) { console.error(err); }
  };

  const movePiece = async (fromRow, fromCol, toRow, toCol) => {
    if (!gameData || !user || gameData.winner) return;
    const playerColor = user.uid === gameData.players.white ? 'white' : 'black';
    if (gameData.turn !== playerColor) return;

    const board = JSON.parse(gameData.board);
    const piece = board[fromRow][fromCol];
    const target = board[toRow][toCol];

    let pulseGained = 0;
    if (target) { pulseGained += (PULSE_REWARDS[target] || 0); }
    if (CORE_SQUARES.some(([r, c]) => r === toRow && c === toCol)) { pulseGained += 1; }

    const currentPoints = gameData.pulsePoints[playerColor];
    const newPointsCount = currentPoints + pulseGained;
    const winner = newPointsCount >= 10 ? playerColor : null;

    board[toRow][toCol] = piece;
    board[fromRow][fromCol] = null;

    const update = {
      board: JSON.stringify(board),
      pulsePoints: { ...gameData.pulsePoints, [playerColor]: newPointsCount },
      winner: winner,
      turn: playerColor === 'white' ? 'black' : 'white'
    };

    try {
      const gameDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'games', currentGameId);
      await updateDoc(gameDocRef, update);
      setSelectedSquare(null);
    } catch (err) { console.error(err); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950 text-cyan-400 font-bold italic uppercase">
      <Loader2 className="animate-spin mr-2" /> Connecting...
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-600 p-2 rounded-lg"><Zap className="text-white fill-white" size={24} /></div>
            <h1 className="text-2xl font-black tracking-tighter uppercase italic text-white">PULSE<span className="text-cyan-400 not-italic">CHESS</span></h1>
          </div>
        </div>

        {view === 'lobby' ? (
          <div className="grid md:grid-cols-2 gap-8 py-12">
            <div onClick={createGame} className="bg-slate-900/40 p-12 rounded-3xl border border-slate-800 flex flex-col items-center justify-center cursor-pointer hover:border-cyan-500/50 transition-all group">
              <Plus className="text-cyan-500 mb-6 group-hover:scale-110 transition-transform" size={64} />
              <h2 className="text-2xl font-black uppercase text-white">Host Match</h2>
            </div>
            <div className="bg-slate-900/40 p-12 rounded-3xl border border-slate-800 space-y-6 text-center">
              <h2 className="text-2xl font-black uppercase text-white">Join Match</h2>
              <input id="join-input" placeholder="GAME ID" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-center text-cyan-400 uppercase" />
              <button onClick={() => { const id = document.getElementById('join-input').value; if(id) joinGame(id.trim()); }} className="w-full bg-cyan-600 hover:bg-cyan-500 py-4 rounded-2xl font-black uppercase tracking-widest transition-all text-white">Establish Link</button>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                <h3 className="font-black uppercase tracking-widest text-xs mb-6 text-cyan-400 flex items-center gap-2"><Activity size={14} /> Pulse Meter</h3>
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                   <div className="h-full bg-cyan-500 transition-all duration-700" style={{ width: `${Math.min(((gameData?.pulsePoints[user.uid === gameData?.players.white ? 'white' : 'black'] || 0) / 10) * 100, 100)}%` }} />
                </div>
              </div>
              <div className="text-center font-mono text-cyan-400 text-xl border border-slate-800 p-4 rounded-xl bg-slate-900">
                ID: {currentGameId}
              </div>
              <button onClick={() => setView('lobby')} className="w-full py-3 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:text-red-400">Abort</button>
            </div>

            <div className="lg:col-span-6 flex flex-col items-center gap-6">
              {gameData?.winner && <div className="bg-cyan-500 text-white w-full py-4 rounded-xl text-center font-black uppercase animate-bounce italic tracking-widest"><Trophy className="inline-block mr-2" /> {gameData.winner} Wins!</div>}
              <div className="bg-slate-800 p-2 sm:p-4 rounded-3xl shadow-2xl border-4 border-slate-900">
                <div className="grid grid-cols-8 border-4 border-slate-950">
                  {gameData && JSON.parse(gameData.board).map((row, rIdx) => 
                    row.map((piece, cIdx) => {
                      const isDark = (rIdx + cIdx) % 2 === 1;
                      const isSelected = selectedSquare?.[0] === rIdx && selectedSquare?.[1] === cIdx;
                      return (
                        <div key={`${rIdx}-${cIdx}`} onClick={() => {
                           if (selectedSquare) {
                             const [sRow, sCol] = selectedSquare;
                             if (sRow === rIdx && sCol === cIdx) setSelectedSquare(null);
                             else movePiece(sRow, sCol, rIdx, cIdx);
                           } else if (piece) {
                             const myColor = user.uid === gameData.players.white ? 'white' : 'black';
                             const isWhite = piece === piece.toUpperCase();
                             if (gameData.turn === myColor && ((isWhite && myColor === 'white') || (!isWhite && myColor === 'black'))) {
                               setSelectedSquare([rIdx, cIdx]);
                             }
                           }
                        }}
                          className={`w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 flex items-center justify-center text-3xl sm:text-4xl cursor-pointer select-none transition-all
                            ${isDark ? 'bg-slate-700' : 'bg-slate-400'}
                            ${isSelected ? 'bg-cyan-500/50 ring-4 ring-cyan-400' : ''}`}>
                          <span className={`${piece === piece?.toUpperCase() ? 'text-white' : 'text-slate-950'}`}>{piece ? PIECE_ICONS[piece] : ''}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                 <h3 className="text-xs font-black uppercase text-slate-400 mb-4 tracking-widest">Rules</h3>
                 <ul className="text-[10px] text-slate-500 space-y-2 uppercase">
                   <li>• Capture pieces to gain Pulse</li>
                   <li>• Control center squares for +1 Pulse per turn</li>
                   <li>• Reach 10 Pulse to win match</li>
                 </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
