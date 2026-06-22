import React from 'react';
import { Helmet } from 'react-helmet';
import { useLocation } from 'react-router-dom';
import WordSearchGame from '@/components/journey/WordSearchGame';
import { motion } from 'framer-motion';

const WordSearchGamePage = () => {
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
                <title>Desafio: Caça ao Tesouro - CurrículoJá</title>
                <meta name="description" content="Encontre as palavras-chave para o sucesso." />
            </Helmet>
            <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex flex-col items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-8 text-center"
                >
                    <h1 className="text-3xl font-bold gradient-text mb-4">Caça ao Tesouro</h1>
                    <p className="text-gray-600 mb-8">Encontre as palavras-chave que vão te destacar no mercado de trabalho!</p>
                    <WordSearchGame onComplete={onComplete} />
                </motion.div>
            </div>
        </>
    );
};

export default WordSearchGamePage;