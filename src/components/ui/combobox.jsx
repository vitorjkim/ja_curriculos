import React, { useState, useRef, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, Search } from 'lucide-react';
import { CardColorContext } from '@/components/resume/ResumeCard';
import { useTemplateTheme } from '@/contexts/TemplateThemeContext';

const getColorClasses = (color) => {
  const colorMap = {
    blue: {
      input: 'border-blue-500 focus:border-blue-600 focus:ring-blue-500/20',
      dropdown: 'border-blue-200',
      selected: 'bg-blue-50 text-blue-700',
      hover: 'hover:bg-blue-50'
    },
    green: {
      input: 'border-green-500 focus:border-green-600 focus:ring-green-500/20',
      dropdown: 'border-green-200',
      selected: 'bg-green-50 text-green-700',
      hover: 'hover:bg-green-50'
    },
    purple: {
      input: 'border-purple-500 focus:border-purple-600 focus:ring-purple-500/20',
      dropdown: 'border-purple-200',
      selected: 'bg-purple-50 text-purple-700',
      hover: 'hover:bg-purple-50'
    },
    orange: {
      input: 'border-orange-500 focus:border-orange-600 focus:ring-orange-500/20',
      dropdown: 'border-orange-200',
      selected: 'bg-orange-50 text-orange-700',
      hover: 'hover:bg-orange-50'
    },
    red: {
      input: 'border-red-500 focus:border-red-600 focus:ring-red-500/20',
      dropdown: 'border-red-200',
      selected: 'bg-red-50 text-red-700',
      hover: 'hover:bg-red-50'
    },
    yellow: {
      input: 'border-yellow-500 focus:border-yellow-600 focus:ring-yellow-500/20',
      dropdown: 'border-yellow-200',
      selected: 'bg-yellow-50 text-yellow-700',
      hover: 'hover:bg-yellow-50'
    }
  };
  return colorMap[color] || colorMap.blue;
};

const Combobox = React.forwardRef(({ 
  className, 
  options = [], 
  value, 
  onChange, 
  placeholder = "Selecione uma opção...", 
  searchable = true,
  color,
  variant = 'default', // 'default' | 'minimal'
  emptyMessage = 'Nenhuma opção encontrada',
  ...inputProps 
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  
  const contextColor = useContext(CardColorContext);
  const { name: templateName } = useTemplateTheme?.() || { name: 'default' };
  const cardColor = color || contextColor || 'blue';
  const colorClasses = getColorClasses(cardColor);
  const inputColorClasses = templateName === 'default' ? '' : colorClasses.input;

  // Calcular posição do dropdown quando abrir
  useEffect(() => {
    if (isOpen && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      
      // Sempre tentar mostrar embaixo primeiro
      let top = rect.bottom + window.scrollY + 4;
      let maxHeight = Math.min(240, spaceBelow - 20);
      
      // Se não há espaço embaixo suficiente, mostrar em cima
      if (spaceBelow < 150 && rect.top > 150) {
        top = rect.top + window.scrollY - 240 - 4;
        maxHeight = Math.min(240, rect.top - 20);
      }
      
      setDropdownStyle({
        position: 'absolute',
        left: rect.left + window.scrollX,
        top: top,
        width: rect.width,
        maxHeight: maxHeight + 'px',
        zIndex: 99999
      });
    }
  }, [isOpen]);

  // Filtrar opções baseado no termo de busca
  const filteredOptions = searchable 
    ? options.filter(option => 
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  // Encontrar a opção selecionada
  const selectedOption = options.find(option => option.value === value);

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target;
      const clickedInput = inputRef.current && inputRef.current.contains(target);
      const clickedDropdown = dropdownRef.current && dropdownRef.current.contains(target);
      if (!clickedInput && !clickedDropdown) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Navegação por teclado
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        setIsOpen(true);
        setHighlightedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        inputRef.current?.blur();
        break;
    }
  };

  const handleSelect = (option) => {
    onChange?.(option.value);
    setIsOpen(false);
    setSearchTerm('');
    inputRef.current?.blur();
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setHighlightedIndex(0);
    if (!isOpen) setIsOpen(true);
  };

  const displayValue = searchable && isOpen 
    ? searchTerm 
    : selectedOption?.label || '';
  const showLeadingInInput = !!selectedOption?.leading && !(searchable && isOpen);
  const leftPadClass = showLeadingInInput ? 'pl-10' : '';

  return (
    <>
      <div className="relative" ref={inputRef}>
        <input
          ref={ref}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          readOnly={!searchable}
          className={cn(
            variant === 'minimal'
              ? `flex h-11 w-full rounded-xl border ${templateName==='modern' ? 'bg-white/70 backdrop-blur-md border-black/5' : templateName==='classic' ? 'bg-stone-50 border-stone-300' : templateName==='professional' ? 'bg-slate-50/60 border-slate-200' : 'bg-white border-gray-200'} px-4 pr-10 text-sm text-gray-700 placeholder-gray-400 cursor-pointer focus:outline-none ${templateName==='modern' ? 'focus:ring-4 focus:ring-blue-100 focus:border-blue-500' : templateName==='classic' ? 'focus:ring-2 focus:ring-stone-200 focus:border-stone-500' : templateName==='professional' ? 'focus:ring-2 focus:ring-blue-200 focus:border-blue-400' : 'focus:ring-2 focus:ring-gray-200 focus:border-gray-500'} transition-colors duration-200`
              : `flex h-12 w-full ${templateName==='professional' ? 'h-10 rounded-2xl border border-slate-200 bg-slate-50/60 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-400 focus:ring-blue-200' : templateName==='modern' ? 'rounded-xl border bg-white/80 backdrop-blur' : templateName==='default' ? 'rounded-xl border bg-white/5 text-gray-200 placeholder-gray-400' : templateName==='colorful' ? 'h-11 rounded-xl border-2 border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:border-blue-300 focus:ring-blue-100' : 'rounded-xl border-2 bg-white'} px-4 py-3 pr-10 text-sm ring-offset-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 ${inputColorClasses}`,
            leftPadClass,
            className
          )}
          {...inputProps}
        />
        {showLeadingInInput && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="shrink-0 flex items-center justify-center">
              {selectedOption.leading}
            </span>
          </div>
        )}
        
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          {searchable && isOpen ? (
            <Search className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          )}
        </div>
      </div>

      {/* Dropdown usando Portal */}
      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          data-combobox-dropdown
          className={cn(
            templateName === 'colorful' ? 'overflow-hidden rounded-2xl' : 'overflow-auto rounded-xl',
            (templateName==='modern') && 'bg-white border border-gray-200 shadow-lg',
            (templateName==='default') && 'bg-[#1c2128] border border-[#30363d] shadow-xl',
            (templateName==='classic') && 'bg-stone-50 border border-stone-200 shadow-lg',
            (templateName==='minimal') && 'bg-white border border-gray-200 shadow-md',
            (templateName==='professional') && 'bg-white border border-gray-200 shadow-lg',
            (templateName==='colorful') && 'bg-white border-2 border-blue-200 shadow-[0_8px_30px_rgba(37,99,235,0.12)]',
            !templateName && 'bg-white border border-gray-200 shadow-lg'
          )}
          style={templateName === 'colorful'
            ? { position: dropdownStyle.position, left: dropdownStyle.left, top: dropdownStyle.top, width: dropdownStyle.width, zIndex: dropdownStyle.zIndex }
            : dropdownStyle
          }
        >
          {filteredOptions.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-500 text-center">
              <Search className="h-5 w-5 mx-auto mb-2 text-gray-400" />
              <p>{emptyMessage}</p>
            </div>
          ) : (
            <div className={templateName === 'colorful' ? 'overflow-auto pt-1.5 pb-2' : 'py-1'}
              style={templateName === 'colorful' ? { maxHeight: dropdownStyle.maxHeight } : undefined}
            >
              {filteredOptions.map((option, index) => (
                <div
                  key={option.value}
                  onClick={() => handleSelect(option)}
                  className={cn(
                    templateName === 'colorful'
                      ? 'cursor-pointer select-none py-2.5 px-3 mx-1.5 my-0.5 text-sm transition-colors duration-100 rounded-xl flex items-center justify-between'
                      : 'cursor-pointer select-none py-2.5 px-3 mx-1 my-0.5 text-sm transition-colors duration-100 rounded-lg flex items-center justify-between',
                    templateName==='default' ? 'text-gray-200 hover:bg-[#262c36]' : templateName==='colorful' ? 'text-slate-700 hover:bg-blue-50' : 'hover:bg-gray-100',
                    highlightedIndex === index && (templateName==='default' ? 'bg-[#262c36]' : templateName==='colorful' ? 'bg-blue-50' : 'bg-gray-100'),
                    option.value === value && (templateName==='default' ? 'bg-[#1f6feb]/20 text-[#58a6ff]' : templateName==='colorful' ? 'bg-blue-100 text-blue-700 font-semibold' : 'bg-blue-50 text-blue-600')
                  )}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <div className="min-w-0">
                    <span className="font-medium">{option.label}</span>
                    {option.description && (
                      <span className={cn('ml-2 text-xs', templateName==='default' ? 'text-gray-500' : 'text-gray-400')}>
                        — {option.description}
                      </span>
                    )}
                  </div>
                  {option.value === value && (
                    <Check className={cn('h-4 w-4 shrink-0 ml-2', templateName==='default' ? 'text-[#58a6ff]' : templateName==='colorful' ? 'text-blue-600' : 'text-blue-600')} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
});

Combobox.displayName = 'Combobox';

export { Combobox };
