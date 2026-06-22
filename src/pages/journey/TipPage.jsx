import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lightbulb, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TipPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const query = new URLSearchParams(location.search);
    const stepIndex = query.get('step');
    const title = query.get('title');
    const description = query.get('description');

    useEffect(() => {
        const saved = localStorage.getItem('completedJourneySteps');
        const completedSteps = saved ? JSON.parse(saved) : [];
        if (stepIndex !== null && !completedSteps.includes(parseInt(stepIndex))) {
            const newCompletedSteps = [...completedSteps, parseInt(stepIndex)].sort((a,b) => a-b);
            localStorage.setItem('completedJourneySteps', JSON.stringify(newCompletedSteps));
        }
    }, [stepIndex]);

    const handleGoBack = () => {
        window.close();
        // Fallback for browsers that don't allow window.close()
        if (!window.closed) {
            navigate('/candidate-journey');
        }
    };
    
    return (
        <>
            <Helmet>
                <title>{title || 'Dica Rápida'} - CurrículoJá</title>
                <meta name="description" content={description || 'Uma dica para sua jornada de sucesso.'} />
            </Helmet>
            <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 flex flex-col items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-8 text-center"
                >
                    <Lightbulb className="w-16 h-16 mx-auto mb-6 text-yellow-400" />
                    <h1 className="text-3xl font-bold gradient-text mb-4">{title}</h1>
                    <p className="text-gray-700 text-lg leading-relaxed mb-8">{description}</p>
                    <Button onClick={handleGoBack} className="btn-primary text-white">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar para a Jornada
                    </Button>
                </motion.div>
            </div>
        </>
    );
};

export default TipPage;