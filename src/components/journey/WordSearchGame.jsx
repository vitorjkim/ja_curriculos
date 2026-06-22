import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { RefreshCw, ArrowLeft } from 'lucide-react';

const WordSearchGame = ({ onComplete }) => {
    const words = ["CURRÍCULO", "ENTREVISTA", "TRABALHO", "ESTÁGIO"];
    const gridSize = 12;
    const [grid, setGrid] = useState([]);
    const [foundWords, setFoundWords] = useState([]);
    const [selectedCells, setSelectedCells] = useState([]);
    const [isGameStarted, setIsGameStarted] = useState(false);
    const [isGameWon, setIsGameWon] = useState(false);
    const [isMouseDown, setIsMouseDown] = useState(false);

    const placeWord = (word, grid) => {
        const directions = [
            { x: 1, y: 0 },   // Horizontal
            { x: 0, y: 1 },   // Vertical
            { x: 1, y: 1 },   // Diagonal
        ];
        let attempts = 0;
        while(attempts < 100) {
            const dir = directions[Math.floor(Math.random() * directions.length)];
            const startCol = Math.floor(Math.random() * (gridSize - (dir.x > 0 ? word.length : 0)));
            const startRow = Math.floor(Math.random() * (gridSize - (dir.y > 0 ? word.length : 0)));
            
            let canPlace = true;
            for (let i = 0; i < word.length; i++) {
                const cell = grid[startRow + i * dir.y][startCol + i * dir.x];
                if (cell !== null && cell !== word[i]) {
                    canPlace = false;
                    break;
                }
            }
            if(canPlace) {
                for (let i = 0; i < word.length; i++) {
                    grid[startRow + i * dir.y][startCol + i * dir.x] = word[i];
                }
                return true;
            }
            attempts++;
        }
        return false;
    };

    const initializeGrid = () => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let newGrid = Array(gridSize).fill(0).map(() => Array(gridSize).fill(null));
        words.forEach(word => {
            placeWord(word.toUpperCase(), newGrid);
        });
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                if (newGrid[i][j] === null) {
                    newGrid[i][j] = chars.charAt(Math.floor(Math.random() * chars.length));
                }
            }
        }
        setGrid(newGrid);
    }
    
    const startGame = () => {
        initializeGrid();
        setFoundWords([]);
        setSelectedCells([]);
        setIsGameStarted(true);
        setIsGameWon(false);
    };

    const handleMouseDown = (row, col) => {
        if (!isGameStarted || isGameWon) return;
        setIsMouseDown(true);
        setSelectedCells([{ row, col }]);
    };

    const handleMouseEnter = (row, col) => {
        if (!isGameStarted || !isMouseDown || isGameWon) return;
        
        const lastCell = selectedCells[selectedCells.length - 1];
        if (!lastCell) return;
        
        const dx = col - lastCell.col;
        const dy = row - lastCell.row;

        if (selectedCells.length > 1) {
            const firstCell = selectedCells[0];
            const secondCell = selectedCells[1];
            const firstDx = secondCell.col - firstCell.col;
            const firstDy = secondCell.row - firstCell.row;

            if (dx !== firstDx || dy !== firstDy) {
                return;
            }
        }
        
        if (!selectedCells.some(c => c.row === row && c.col === col)) {
             setSelectedCells(prev => [...prev, { row, col }]);
        }
    };

    const handleMouseUp = () => {
        if (!isGameStarted || isGameWon) return;
        setIsMouseDown(false);
        const selectedWord = selectedCells.map(cell => grid[cell.row][cell.col]).join('');
        const reversedSelectedWord = [...selectedWord].reverse().join('');
        
        const wordToFind = words.find(w => w === selectedWord || w === reversedSelectedWord);

        if (wordToFind && !foundWords.includes(wordToFind)) {
            setFoundWords(prev => [...prev, wordToFind]);
        }
        setSelectedCells([]);
    };

    useEffect(() => {
        if (isGameStarted && foundWords.length === words.length) {
            setIsGameWon(true);
            onComplete(true);
        }
    }, [foundWords, words, onComplete, isGameStarted]);
    
    const isCellInFoundWord = (row, col) => {
        // This is complex, for now we just highlight selection
        return false; 
    };

    const isCellSelected = (row, col) => selectedCells.some(c => c.row === row && c.col === col);
    
    if (!isGameStarted) {
        return (
            <div className="flex flex-col items-center">
                <Button onClick={startGame}>Iniciar Caça-Palavras</Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
            <div className="grid grid-cols-12 gap-1 p-2 bg-blue-100 rounded-lg shadow-inner select-none">
                {grid.map((row, i) => row.map((cell, j) => (
                    <motion.div 
                        key={`${i}-${j}`} 
                        onMouseDown={() => handleMouseDown(i, j)}
                        onMouseEnter={() => handleMouseEnter(i, j)}
                        className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center border border-blue-200 font-bold text-xs sm:text-sm cursor-pointer transition-colors duration-200 ${isCellSelected(i, j) ? 'bg-yellow-400' : 'bg-white'}`}
                        whileHover={{ scale: 1.1 }}
                    >
                        {cell}
                    </motion.div>
                )))}
            </div>
            <div className="mt-4 text-center">
                <p className="font-semibold mb-2 text-gray-700">Encontre as palavras:</p>
                <div className="flex flex-wrap justify-center gap-3">
                    {words.map(word => (
                        <span key={word} className={`px-3 py-1 rounded-full text-sm font-semibold transition-all duration-300 ${foundWords.includes(word.toUpperCase()) ? 'bg-green-500 text-white line-through' : 'bg-gray-200 text-gray-800'}`}>
                            {word}
                        </span>
                    ))}
                </div>
            </div>
            {isGameWon && (
                <div className="text-center mt-4">
                    <p className="text-green-600 font-bold text-xl">Excelente! Você encontrou todas!</p>
                     <div className="flex gap-4 mt-4">
                        <Button onClick={startGame}>
                           <RefreshCw className="mr-2 h-4 w-4" /> Jogar Novamente
                        </Button>
                         <Link to="/candidate-journey">
                            <Button variant="outline" className="rounded-2xl border-gray-200 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 hover:shadow-md transition-all duration-200">
                               <ArrowLeft className="mr-2 h-4 w-4" /> Voltar à Jornada
                            </Button>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WordSearchGame;