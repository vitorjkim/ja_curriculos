import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { RefreshCw, ArrowLeft } from 'lucide-react';

const DinoGame = ({ onComplete }) => {
    const canvasRef = useRef(null);
    const [score, setScore] = useState(0);
    const [isGameOver, setIsGameOver] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [gameOverMessage, setGameOverMessage] = useState('');

    const motivationalWords = ["Não desista!", "Tente de novo, você consegue!", "A persistência leva ao sucesso!", "Cada falha é um aprendizado."];

    const gameLoop = useRef(null);
    const player = useRef(null);
    const obstacles = useRef([]);
    const clouds = useRef([]);
    const frameCount = useRef(0);
    const animationFrameId = useRef(null);

    const resetGame = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        player.current = {
            x: 50,
            y: canvas.height - 30,
            width: 20,
            height: 30,
            dy: 0,
            gravity: 0.6,
            jumpForce: -12,
            isJumping: false,
            speed: 4
        };

        obstacles.current = [];
        clouds.current = [
            { x: 100, y: 30, size: 15, speed: 0.5 },
            { x: 300, y: 50, size: 20, speed: 0.8 },
            { x: 450, y: 20, size: 18, speed: 0.6 },
        ];
        
        frameCount.current = 0;
        setScore(0);
        setIsGameOver(false);
        setGameOverMessage('');
    }, []);

    const startGame = useCallback(() => {
        resetGame();
        setIsRunning(true);
    }, [resetGame]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = 500;
        canvas.height = 150;

        gameLoop.current = () => {
            if (!isRunning || !canvas) {
                return;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            bgGradient.addColorStop(0, '#e0f7fa');
            bgGradient.addColorStop(1, '#b2ebf2');
            ctx.fillStyle = bgGradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            clouds.current.forEach(cloud => {
                cloud.x -= cloud.speed;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.beginPath();
                ctx.arc(cloud.x, cloud.y, cloud.size, 0, Math.PI * 2);
                ctx.arc(cloud.x + cloud.size * 1.2, cloud.y, cloud.size * 1.2, 0, Math.PI * 2);
                ctx.arc(cloud.x + cloud.size * 0.5, cloud.y - cloud.size * 0.5, cloud.size * 0.8, 0, Math.PI * 2);
                ctx.fill();
                if (cloud.x < -cloud.size * 2) {
                    cloud.x = canvas.width + cloud.size;
                }
            });

            if (player.current) {
                player.current.y += player.current.dy;
                if (player.current.y < canvas.height - player.current.height) {
                    player.current.dy += player.current.gravity;
                } else {
                    player.current.y = canvas.height - player.current.height;
                    player.current.dy = 0;
                    player.current.isJumping = false;
                }
                ctx.fillStyle = '#3b82f6';
                ctx.fillRect(player.current.x, player.current.y, player.current.width, player.current.height);
            }

            for (let i = obstacles.current.length - 1; i >= 0; i--) {
                const obs = obstacles.current[i];
                obs.x -= player.current.speed;
                ctx.fillStyle = '#f97316';
                ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

                if (obs.x + obs.width < 0) {
                    obstacles.current.splice(i, 1);
                    setScore(prevScore => prevScore + 1);
                }

                if (player.current &&
                    player.current.x < obs.x + obs.width &&
                    player.current.x + player.current.width > obs.x &&
                    player.current.y < obs.y + obs.height &&
                    player.current.y + player.current.height > obs.y) {
                    setIsRunning(false);
                    setIsGameOver(true);
                    setGameOverMessage(motivationalWords[Math.floor(Math.random() * motivationalWords.length)]);
                    if (onComplete) onComplete();
                    return;
                }
            }

            frameCount.current++;
            if (frameCount.current % 120 === 0) {
                const obsHeight = 25;
                obstacles.current.push({ x: canvas.width, width: 20, height: obsHeight, y: canvas.height - obsHeight });
            }

            animationFrameId.current = requestAnimationFrame(gameLoop.current);
        };

        if (isRunning) {
            animationFrameId.current = requestAnimationFrame(gameLoop.current);
        }

        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [isRunning, onComplete, motivationalWords]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === 'Space' && player.current && !player.current.isJumping && isRunning) {
                player.current.isJumping = true;
                player.current.dy = player.current.jumpForce;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isRunning]);

    useEffect(() => {
        startGame();
    }, [startGame]);

    return (
        <div className="flex flex-col items-center justify-center w-full">
            <div className="relative w-full max-w-[500px]">
                <canvas ref={canvasRef} className="border rounded-lg"></canvas>
            </div>
            <div className="mt-4 text-lg font-semibold">Obstáculos pulados: {score}</div>
            <p className="mt-2 text-gray-600">Pressione 'Espaço' para pular!</p>
            <AnimatePresence>
                {isGameOver && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4 flex flex-col items-center">
                        <p className="text-xl font-bold text-red-600 mb-2">Fim de Jogo!</p>
                        <p className="text-md font-semibold text-gray-700 mb-4">{gameOverMessage}</p>
                        <div className="flex gap-4">
                            <Button onClick={startGame}>
                                <RefreshCw className="mr-2 h-4 w-4" /> Tentar Novamente
                            </Button>
                            <Link to="/candidate-journey">
                                <Button variant="outline" className="rounded-2xl border-gray-200 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 hover:shadow-md transition-all duration-200">
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar à Jornada
                                </Button>
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DinoGame;