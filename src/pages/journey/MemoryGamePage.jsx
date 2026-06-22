import React from 'react';
import { Helmet } from 'react-helmet';
import { useLocation } from 'react-router-dom';
import MemoryGame from '@/components/journey/MemoryGame';
import { motion } from 'framer-motion';

const MemoryGamePage = () => {
    const location = useLocation();
    const query = new URLSearchParams(location.search);
    const stepIndex = query.get('step');
    
    const onComplete = () => {
        const saved = localStorage.getItem('completedJourneySteps');
        const completedSteps = saved ? JSON.parse(saved) : [];
        if (stepIndex !== null && !completedSteps.includes(parseInt(stepIndex))) {
            const newCompletedSteps = [...completedSteps, parseInt(stepIndex)].sort((a,b) => a-b);
            localStorage.setItem('completedJourneySteps', JSON.stringify(newCompletedSteps));
        }
    };

    return (
        <>
            <Helmet>
                <title>Desafio: Memória Profissional - CurrículoJá</title>
                <meta name="description" content="Teste sua memória com termos chave do mercado." />
            </Helmet>
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50 flex flex-col items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-8 text-center"
                >
                    <h1 className="text-3xl font-bold gradient-text mb-4">Memória Profissional</h1>
                    <p className="text-gray-600 mb-8">Encontre os pares e fortaleça sua memória para os termos do mercado!</p>
                    <MemoryGame onComplete={onComplete} />
                </motion.div>
            </div>
        </>
    );
};

export default MemoryGamePage;