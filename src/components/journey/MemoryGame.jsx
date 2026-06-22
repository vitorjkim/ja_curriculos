import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { BrainCircuit, RefreshCw, ArrowLeft } from 'lucide-react';

const MemoryGame = ({ onComplete }) => {
    const items = [
        { name: 'React' },
        { name: 'Vaga' },
        { name: 'Node' },
        { name: 'Job' },
        { name: 'Skill' },
        { name: 'Teste' },
    ];
    const [cards, setCards] = useState([]);
    const [flipped, setFlipped] = useState([]);
    const [solved, setSolved] = useState([]);
    const [isBlocked, setIsBlocked] = useState(false);
    const [isGameStarted, setIsGameStarted] = useState(false);
    const [isGameWon, setIsGameWon] = useState(false);

    const startGame = () => {
        setCards([...items, ...items].map((item, id) => ({id, item})).sort(() => Math.random() - 0.5));
        setFlipped([]);
        setSolved([]);
        setIsGameStarted(true);
        setIsGameWon(false);
    };

    const handleClick = (index) => {
        if (!isGameStarted || isBlocked || flipped.includes(index) || solved.includes(cards[index].item.name)) return;

        const newFlipped = [...flipped, index];
        setFlipped(newFlipped);

        if (newFlipped.length === 2) {
            setIsBlocked(true);
            const [firstIndex, secondIndex] = newFlipped;
            if (cards[firstIndex].item.name === cards[secondIndex].item.name) {
                setSolved(prev => [...prev, cards[firstIndex].item.name]);
                setFlipped([]);
                setIsBlocked(false);
            } else {
                setTimeout(() => {
                    setFlipped([]);
                    setIsBlocked(false);
                }, 1000);
            }
        }
    };
    
    useEffect(() => {
        if (isGameStarted && solved.length === items.length) {
            setIsGameWon(true);
            setTimeout(() => onComplete(true), 500);
        }
    }, [solved, items.length, onComplete, isGameStarted]);

    if (!isGameStarted) {
        return (
            <div className="flex flex-col items-center">
                <Button onClick={startGame}>Iniciar Jogo da Memória</Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center">
            <div className="grid grid-cols-4 gap-4 p-4 bg-blue-50 rounded-lg">
                {cards.map((card, index) => (
                    <motion.div key={index} onClick={() => handleClick(index)}
                        className="w-20 h-20 sm:w-24 sm:h-24 cursor-pointer"
                        style={{ perspective: 1000 }}>
                        <motion.div className="relative w-full h-full"
                            style={{ transformStyle: 'preserve-3d' }}
                            animate={{ rotateY: flipped.includes(index) || solved.includes(card.item.name) ? 180 : 0 }}
                            transition={{ duration: 0.6 }}>
                            <div className="absolute w-full h-full flex items-center justify-center rounded-lg bg-[var(--color1)] text-white shadow-lg" style={{ backfaceVisibility: 'hidden' }}>
                                <BrainCircuit className="w-10 h-10"/>
                            </div>
                            <div className={`absolute w-full h-full flex items-center justify-center rounded-lg text-white font-bold text-lg p-2 shadow-lg ${solved.includes(card.item.name) ? 'bg-green-500' : 'bg-blue-500'}`} style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                                <span className="text-center">{card.item.name}</span>
                            </div>
                        </motion.div>
                    </motion.div>
                ))}
            </div>
             {isGameWon && (
                <div className="text-center mt-4">
                    <p className="text-green-600 font-bold text-xl">Parabéns, você tem uma ótima memória!</p>
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

export default MemoryGame;