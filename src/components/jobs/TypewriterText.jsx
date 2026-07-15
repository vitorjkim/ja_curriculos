import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * Componente que anima texto como se estivesse sendo digitado
 * @param {string} text - Texto a ser animado
 * @param {string} className - Classes CSS adicionais
 * @param {number} speed - Velocidade da digitação em ms por caractere (padrão: 20ms)
 */
const TypewriterText = ({ text = '', className = '', speed = 10 }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    if (!text) {
      setDisplayedText('');
      return;
    }

    let index = 0;
    const interval = setInterval(() => {
      if (index <= text.length) {
        setDisplayedText(text.slice(0, index));
        index++;
      } else {
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <motion.p
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {displayedText}
      {displayedText.length < text.length && (
        <motion.span
          className="inline-block w-2.5 h-2.5 bg-current ml-1"
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      )}
    </motion.p>
  );
};

export default TypewriterText;
