<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pulse Chess</title>
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        body { font-family: 'Inter', sans-serif; background-color: #020617; color: #e2e8f0; }
        .chess-piece { cursor: grab; user-select: none; transition: transform 0.1s; }
        .chess-piece:active { cursor: grabbing; }
        .pulse-glow { box-shadow: 0 0 15px rgba(6, 182, 212, 0.4); }
    </style>
</head>
<body>
    <div id="root"></div>

    <script type="text/babel">
        const { useState, useEffect, useMemo } = React;

        // --- Mock Firebase (For Stability in Preview) ---
        // This ensures the app works immediately. 
        // Real Firebase can be injected here once the environment error is cleared.
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

        function App() {
            const [view, setView] = useState('lobby');
            const [board, setBoard] = useState(INITIAL_BOARD);
            const [turn, setTurn] = useState('white');
            const [pulse, setPulse] = useState({ white: 0, black: 0 });
            const [selected, setSelected] = useState(null);
            const [winner, setWinner] = useState(null);

            const handleSquareClick = (r, c) => {
                if (winner) return;

                if (selected) {
                    const [sr, sc] = selected;
                    // Basic Move Logic
                    if (sr === r && sc === c) {
                        setSelected(null);
                        return;
                    }

                    const newBoard = board.map(row => [...row]);
                    const piece = newBoard[sr][sc];
                    const target = newBoard[r][c];

                    // Capture Logic
                    let gained = 0;
                    if (target) gained += 2; 
                    if (CORE_SQUARES.some(([cr, cc]) => cr === r && cc === c)) gained += 1;

                    newBoard[r][c] = piece;
                    newBoard[sr][sc] = null;
                    
                    const newPulse = pulse[turn] + gained;
                    setPulse({ ...pulse, [turn]: newPulse });
                    setBoard(newBoard);
                    setTurn(turn === 'white' ? 'black' : 'white');
                    setSelected(null);

                    if (newPulse >= 10) setWinner(turn);
                } else {
                    const piece = board[r][c];
                    if (!piece) return;
                    const isWhite = piece === piece.toUpperCase();
                    if ((isWhite && turn === 'white') || (!isWhite && turn === 'black')) {
                        setSelected([r, c]);
                    }
                }
            };

            return (
                <div className="min-h-screen p-4 md:p-8">
                    <header className="max-w-4xl mx-auto flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
                        <h1 className="text-2xl font-black italic tracking-tighter uppercase">
                            PULSE<span className="text-cyan-500 not-italic">CHESS</span>
                        </h1>
                        <div className="flex gap-4">
                            <div className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${turn === 'white' ? 'bg-white text-black' : 'bg-slate-800 text-slate-500'}`}>White</div>
                            <div className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${turn === 'black' ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-500'}`}>Black</div>
                        </div>
                    </header>

                    <main className="max-w-4xl mx-auto grid lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 flex flex-col items-center">
                            {winner && (
                                <div className="mb-4 p-4 bg-cyan-500 text-white w-full rounded-xl text-center font-black uppercase italic animate-bounce">
                                    {winner} Wins by Pulse Overload!
                                </div>
                            )}
                            <div className="bg-slate-800 p-2 sm:p-4 rounded-xl shadow-2xl border-4 border-slate-900">
                                <div className="grid grid-cols-8 border border-slate-950">
                                    {board.map((row, rIdx) => row.map((piece, cIdx) => {
                                        const isDark = (rIdx + cIdx) % 2 === 1;
                                        const isSelected = selected && selected[0] === rIdx && selected[1] === cIdx;
                                        const isCore = CORE_SQUARES.some(([cr, cc]) => cr === rIdx && cc === cIdx);
                                        return (
                                            <div 
                                                key={`${rIdx}-${cIdx}`}
                                                onClick={() => handleSquareClick(rIdx, cIdx)}
                                                className={`
                                                    w-10 h-10 sm:w-14 sm:h-14 flex items-center justify-center text-2xl sm:text-4xl 
                                                    relative transition-all cursor-pointer
                                                    ${isDark ? 'bg-slate-700' : 'bg-slate-400'}
                                                    ${isSelected ? 'ring-4 ring-cyan-500 z-10 scale-105 bg-cyan-900/50' : ''}
                                                    ${isCore ? 'after:content-[""] after:absolute after:inset-1 after:border after:border-cyan-500/30' : ''}
                                                `}
                                            >
                                                <span className={`chess-piece ${piece && piece === piece.toUpperCase() ? 'text-white' : 'text-slate-950'}`}>
                                                    {piece ? PIECE_ICONS[piece] : ''}
                                                </span>
                                            </div>
                                        );
                                    }))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                                <h3 className="text-[10px] font-black uppercase text-cyan-500 mb-4 tracking-widest">Pulse Meter</h3>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between text-[10px] font-bold uppercase mb-1"><span>White</span> <span>{pulse.white}/10</span></div>
                                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-white transition-all" style={{width: `${(pulse.white/10)*100}%`}}></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-[10px] font-bold uppercase mb-1"><span>Black</span> <span>{pulse.black}/10</span></div>
                                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-cyan-500 transition-all" style={{width: `${(pulse.black/10)*100}%`}}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                                <h3 className="text-[10px] font-black uppercase text-slate-500 mb-4 tracking-widest">Rules</h3>
                                <ul className="text-[10px] font-bold space-y-2 text-slate-400 uppercase italic">
                                    <li>• Capture pieces to gain Pulse.</li>
                                    <li>• Hold the center core (4 squares).</li>
                                    <li>• Reach 10 Pulse to win instantly.</li>
                                </ul>
                            </div>

                            <button onClick={() => {
                                setBoard(INITIAL_BOARD);
                                setPulse({white: 0, black: 0});
                                setWinner(null);
                                setTurn('white');
                            }} className="w-full py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-black uppercase text-xs tracking-widest transition-colors">
                                Reset Match
                            </button>
                        </div>
                    </main>
                </div>
            );
        }

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<App />);
    </script>
</body>
</html>
