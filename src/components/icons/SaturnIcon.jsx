import React from 'react';

/**
 * Ícone de Saturno customizado (outline/vazado) - Versão 2
 * Com anéis duplos mais proeminentes
 */
const SaturnIcon = ({ className = "w-6 h-6", ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* Planeta (menor e mais ao centro) */}
    <circle cx="12" cy="13" r="4" />
    
    {/* Anel interno de Saturno */}
    <ellipse cx="12" cy="13" rx="8" ry="3" transform="rotate(-20 12 13)" />
    
    {/* Anel externo de Saturno */}
    <ellipse cx="12" cy="13" rx="11" ry="4.5" transform="rotate(-20 12 13)" />
    
    {/* Estrelas decorativas */}
    <path d="M6 6l.3-.9L7.2 5l-.9-.1L6 4l-.3.9L4.8 5l.9.1z" />
    <path d="M19 8l.3-.9L20.2 7l-.9-.1L19 6l-.3.9L17.8 7l.9.1z" />
    <circle cx="17" cy="18" r="0.8" />
    
    {/* Ponto decorativo */}
    <circle cx="18" cy="5" r="0.5" fill="currentColor" />
  </svg>
);

export default SaturnIcon;
