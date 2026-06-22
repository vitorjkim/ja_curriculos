import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Bold, Italic, Underline, Strikethrough, List, ListOrdered, Copy, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * RichTextarea - Editor de texto rico com toolbar flutuante (estilo Word/Notion)
 * Usa contentEditable para suportar formatação visual real
 */
export const RichTextarea = forwardRef(({
  value = '',
  onChange,
  placeholder,
  rows = 3,
  className,
  name,
  id,
  ...props
}, ref) => {
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const toolbarRef = useRef(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [isEmpty, setIsEmpty] = useState(!value);
  const [isFormatting, setIsFormatting] = useState(false);

  // Calcular altura mínima baseada em rows
  const minHeight = rows * 24; // ~24px por linha

  // Sincronizar valor inicial
  useEffect(() => {
    if (editorRef.current && value && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
      setIsEmpty(!value);
    }
  }, []);

  // Detectar seleção de texto
  const checkSelection = () => {
    setTimeout(() => {
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0 && editorRef.current?.contains(selection.anchorNode)) {
        setShowToolbar(true);
      } else {
        setShowToolbar(false);
      }
    }, 10);
  };

  // Limpar HTML de atributos indesejados (data-*, style, etc)
  const sanitizeHTML = (html) => {
    if (!html) return '';
    // Remove atributos data-*, style, class de parágrafos/listas
    return html
      .replace(/\s*data-[a-z-]+="[^"]*"/gi, '')
      .replace(/\s*style="[^"]*"/gi, '')
      .replace(/<span[^>]*>([^<]*)<\/span>/gi, '$1'); // Remove spans desnecessários
  };

  // Handler para mudanças no conteúdo
  const handleInput = () => {
    if (editorRef.current && onChange) {
      const rawContent = editorRef.current.innerHTML;
      const content = sanitizeHTML(rawContent);
      const plainText = editorRef.current.innerText;
      setIsEmpty(!plainText || plainText === '\n');
      
      onChange({
        target: {
          name,
          value: content
        }
      });
    }
  };

  // Aplicar formatação usando execCommand
  const applyFormat = (command, value = null) => {
    editorRef.current?.focus();
    
    // Restaurar seleção se existir
    const selection = window.getSelection();
    if (selection.rangeCount === 0) {
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    document.execCommand(command, false, value);
    handleInput();
    
    // Manter toolbar aberto se ainda há seleção
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.toString().length === 0) {
        setShowToolbar(false);
      }
    }, 10);
  };

  // Inserir lista (função específica para listas)
  const insertList = (ordered = false) => {
    const editor = editorRef.current;
    if (!editor) return;
    
    // Salvar a seleção atual
    const selection = window.getSelection();
    const savedRange = selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
    
    // Focar no editor
    editor.focus();
    
    // Restaurar a seleção
    if (savedRange) {
      selection.removeAllRanges();
      selection.addRange(savedRange);
    }
    
    // Usar execCommand
    const command = ordered ? 'insertOrderedList' : 'insertUnorderedList';
    const result = document.execCommand(command, false, null);
    
    console.log('insertList result:', result, 'command:', command);
    
    handleInput();
    setShowToolbar(false);
  };

  // Função de formatação inteligente
  const smartFormat = () => {
    const editor = editorRef.current;
    if (!editor) return;
    
    setIsFormatting(true);
    
    // Obter texto puro
    const plainText = editor.innerText || '';
    
    if (!plainText.trim()) {
      setIsFormatting(false);
      return;
    }
    
    // Dividir em linhas
    const lines = plainText.split('\n').map(l => l.trim()).filter(l => l);
    
    if (lines.length === 0) {
      setIsFormatting(false);
      return;
    }
    
    // Palavras-chave de títulos de seção
    const sectionKeywords = [
      'responsabilidades', 'atividades', 'principais atividades', 'funções',
      'requisitos', 'requisitos desejáveis', 'requisitos obrigatórios', 'pré-requisitos', 'requisitos da vaga',
      'benefícios', 'oferecemos', 'o que oferecemos',
      'perfil', 'perfil desejado', 'diferenciais', 'competências',
      'horário', 'local', 'salário', 'remuneração',
      'atividades do estágio', 'principais responsabilidades', 'atribuições',
      'descrição da vaga', 'descrição do cargo', 'sobre a vaga', 'sobre o cargo',
      'qualificações', 'formação', 'experiência', 'habilidades',
      'o que buscamos', 'o que esperamos', 'seu perfil', 'sua missão',
      'atividades principais', 'responsabilidades principais', 'desafios',
      'diferenciais desejados', 'será um diferencial', 'diferencial',
      'informações adicionais', 'observações', 'contrato', 'jornada',
      'etapas do processo', 'processo seletivo', 'como se candidatar'
    ];
    
    // Padrões de início de título (mesmo sem palavra-chave exata)
    const titleStartPatterns = [
      /^requisitos\b/i,
      /^descrição\b/i,
      /^atividades\b/i,
      /^responsabilidades\b/i,
      /^benefícios\b/i,
      /^qualificações\b/i,
      /^formação\b/i,
      /^experiência\b/i,
      /^habilidades\b/i,
      /^perfil\b/i,
      /^sobre\s+(a|o)\s+(vaga|cargo|empresa)/i,
      /^o\s+que\s+(buscamos|oferecemos|esperamos)/i,
      /^sua?\s+(missão|perfil|responsabilidade)/i,
      /^principais\b/i,
      /^diferenciais?\b/i,
      /^etapas\b/i,
      /^processo\b/i,
      /^informações\b/i,
      /^observações?\b/i,
      /^contrato\b/i,
      /^jornada\b/i,
      /^salário\b/i,
      /^remuneração\b/i,
      /^local\b/i,
      /^horário\b/i
    ];
    
    // Função para verificar se uma linha é um título de seção
    const isSectionTitle = (line) => {
      if (!line) return false;
      const lower = line.toLowerCase().replace(/[:–\-]+$/, '').trim();
      
      // Títulos são geralmente curtos (max 80 chars para permitir "Descrição da Vaga – Técnico em Mecânica")
      if (line.length > 100) return false;
      
      // Verificar se começa com padrão de título
      if (titleStartPatterns.some(pattern => pattern.test(lower))) {
        return true;
      }
      
      // Verificar se contém palavra-chave de seção
      if (sectionKeywords.some(kw => lower === kw || lower.startsWith(kw) || lower.includes(kw))) {
        return true;
      }
      
      // Verificar se termina com : ou – (indicativo de título)
      if ((line.endsWith(':') || line.endsWith('–') || line.endsWith('-')) && line.length < 80) {
        return true;
      }
      
      return false;
    };
    
    // Função para verificar se uma linha parece ser um item de lista
    const isListItem = (line) => {
      const trimmed = line.trim();
      // Linhas curtas que não terminam com dois pontos e não são títulos
      return trimmed.length > 0 && 
             trimmed.length < 150 && 
             !trimmed.endsWith(':') && 
             !isSectionTitle(trimmed);
    };
    
    // Função para verificar se é parágrafo introdutório/descritivo (linha longa)
    const isDescriptiveParagraph = (line, isAfterTitle = false) => {
      // Parágrafos descritivos geralmente têm mais de 100 chars e não são títulos
      // MAS não é descritivo se contém múltiplos itens separados por vírgula
      if (isCommaSeparatedList(line, isAfterTitle)) {
        return false;
      }
      if (line.length > 100 && !isSectionTitle(line)) {
        return true;
      }
      // Ou começam com palavras típicas de descrição
      return line.match(/^(buscamos|estamos|procuramos|somos|nossa|nosso|o estagiário|o profissional|a empresa|vaga para|cargo de|contratamos|precisamos|o técnico|o analista|o assistente|será responsável|atuará|trabalhará)/i);
    };
    
    // Função para detectar lista separada por vírgulas (ex: "Item1, Item2, Item3")
    // Detecta baseado em: quantidade de vírgulas, tamanho dos segmentos, e contexto
    const isCommaSeparatedList = (line, isAfterTitle = false) => {
      if (!line || line.length < 30) return false;
      
      // Contar vírgulas na linha
      const commaCount = (line.match(/,/g) || []).length;
      
      // Se tiver 3 ou mais vírgulas, provavelmente é uma lista
      if (commaCount >= 3) {
        // Verificar se os segmentos têm tamanho razoável (não muito curtos)
        const segments = line.split(',').map(s => s.trim());
        const avgLength = segments.reduce((sum, s) => sum + s.length, 0) / segments.length;
        // Segmentos de lista geralmente têm mais de 15 caracteres em média
        if (avgLength > 15 && segments.length >= 3) {
          return true;
        }
      }
      
      // Se estiver após um título e tiver 2+ vírgulas, também considerar como lista
      if (isAfterTitle && commaCount >= 2) {
        const segments = line.split(',').map(s => s.trim());
        const avgLength = segments.reduce((sum, s) => sum + s.length, 0) / segments.length;
        if (avgLength > 10 && segments.length >= 2) {
          return true;
        }
      }
      
      return false;
    };
    
    // Função para dividir linha com itens separados por vírgulas em array
    const splitCommaSeparatedList = (line) => {
      // Dividir por vírgula
      const items = line.split(',');
      return items.map(item => item.trim()).filter(item => item.length > 0);
    };
    
    // Processar linhas e montar HTML formatado
    let html = '';
    let currentListItems = [];
    let afterTitle = false;
    
    const flushList = () => {
      if (currentListItems.length > 0) {
        html += '<ul style="list-style-type: disc; padding-left: 1.5rem; margin: 0.5rem 0;">';
        currentListItems.forEach(item => {
          html += `<li style="display: list-item; margin-bottom: 0.25rem;">${item}</li>`;
        });
        html += '</ul>';
        currentListItems = [];
      }
    };
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = lines[i + 1];
      
      // Verificar se é título de seção
      if (isSectionTitle(line)) {
        flushList();
        // Adicionar título em negrito (remover : ou – do final se já existir, e adicionar :)
        let titleText = line.replace(/[:–\-]+\s*$/, '').trim();
        titleText = titleText + ':';
        html += `<p style="margin: 1rem 0 0.5rem 0;"><strong>${titleText}</strong></p>`;
        afterTitle = true;
        continue;
      }
      
      // Verificar se é uma lista separada por vírgulas (ex: "item1, item2, item3")
      if (isCommaSeparatedList(line, afterTitle)) {
        flushList();
        const items = splitCommaSeparatedList(line);
        items.forEach(item => {
          currentListItems.push(item);
        });
        // Manter afterTitle para caso tenha mais itens na próxima linha
        continue;
      }
      
      // Parágrafo descritivo longo - não formatar como lista nem negrito
      if (isDescriptiveParagraph(line, afterTitle)) {
        flushList();
        afterTitle = false;
        html += `<p style="margin: 0.5rem 0;">${line}</p>`;
        continue;
      }
      
      // Após um título, as próximas linhas curtas são itens de lista
      if (afterTitle && isListItem(line)) {
        currentListItems.push(line);
      } else if (!afterTitle && isListItem(line) && nextLine && isListItem(nextLine)) {
        // Início de uma lista sem título (múltiplos itens curtos seguidos)
        currentListItems.push(line);
        afterTitle = true;
      } else if (currentListItems.length > 0 && isListItem(line)) {
        // Continuar lista existente
        currentListItems.push(line);
      } else {
        // É um parágrafo normal
        flushList();
        afterTitle = false;
        html += `<p style="margin: 0.5rem 0;">${line}</p>`;
      }
    }
    
    // Flush final
    flushList();
    
    // Limpar HTML de tags vazias
    html = html.replace(/<p[^>]*>\s*<\/p>/g, '').replace(/<ul[^>]*>\s*<\/ul>/g, '');
    
    // Atualizar editor
    editor.innerHTML = html;
    handleInput();
    
    setIsFormatting(false);
  };

  // Copiar texto selecionado
  const copySelection = async () => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      try {
        await navigator.clipboard.writeText(selection.toString());
        setShowToolbar(false);
      } catch (e) {
        console.error('Falha ao copiar:', e);
      }
    }
  };

  // Fechar toolbar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowToolbar(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowToolbar(false);
      }
    };

    // Esconder toolbar quando não há seleção
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.toString().length === 0) {
        setShowToolbar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('selectionchange', handleSelectionChange);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  // Botão do toolbar
  const ToolbarButton = ({ icon: Icon, onClick, title, active }) => {
    // Salvar seleção antes do mousedown
    const handleMouseDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Executar a ação imediatamente
      onClick();
    };
    
    return (
      <button
        type="button"
        onMouseDown={handleMouseDown}
        title={title}
        className={cn(
          "p-1.5 rounded hover:bg-gray-100 transition-colors",
          active ? "bg-gray-100 text-blue-600" : "text-gray-700 hover:text-gray-900"
        )}
      >
        <Icon className="w-4 h-4" />
      </button>
    );
  };

  // Expor métodos via ref
  useImperativeHandle(ref, () => ({
    smartFormat,
    isEmpty,
    isFormatting,
    FormatButton: () => (
      <button
        type="button"
        onClick={smartFormat}
        disabled={isFormatting || isEmpty}
        title="Formatar texto automaticamente"
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200",
          isFormatting 
            ? "bg-gray-100 text-gray-400 cursor-wait" 
            : isEmpty
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-300 cursor-pointer"
        )}
      >
        <Sparkles className={cn("w-3.5 h-3.5", isFormatting && "animate-spin")} />
        {isFormatting ? 'Formatando...' : 'Formatar'}
      </button>
    )
  }), [smartFormat, isEmpty, isFormatting]);

  return (
    <div ref={containerRef} className="relative">
      {/* Editor */}
      <div
        ref={editorRef}
        id={id}
        contentEditable
        onInput={handleInput}
        onPaste={(e) => {
          // Atualizar isEmpty após o paste ser processado
          setTimeout(() => {
            const plainText = editorRef.current?.innerText;
            setIsEmpty(!plainText || plainText === '\n');
            handleInput();
          }, 0);
        }}
        onMouseUp={checkSelection}
        onKeyUp={checkSelection}
        onFocus={() => setIsEmpty(!editorRef.current?.innerText || editorRef.current?.innerText === '\n')}
        onBlur={() => setIsEmpty(!editorRef.current?.innerText || editorRef.current?.innerText === '\n')}
        data-placeholder={placeholder}
        className={cn(
          "w-full rounded-xl border-2 bg-white px-4 py-3 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all duration-200 overflow-auto",
          "prose prose-sm max-w-none",
          "[&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-gray-500 [&:empty]:before:pointer-events-none",
          isEmpty && "before:content-[attr(data-placeholder)] before:text-gray-500 before:pointer-events-none before:absolute before:top-3 before:left-4",
          className
        )}
        style={{ 
          minHeight: `${minHeight}px`,
          position: 'relative'
        }}
        suppressContentEditableWarning
        {...props}
      />

      {/* Floating Toolbar */}
      {showToolbar && (
        <div
          ref={toolbarRef}
          className="absolute z-50 left-1/2 -translate-x-1/2 animate-in fade-in-0 zoom-in-95 duration-150"
          style={{ top: '-48px' }}
        >
          <div className="flex items-center gap-0.5 bg-white rounded-xl shadow-lg border border-gray-200 px-1.5 py-1">
            <ToolbarButton
              icon={Bold}
              onClick={() => applyFormat('bold')}
              title="Negrito (Ctrl+B)"
            />
            <ToolbarButton
              icon={Italic}
              onClick={() => applyFormat('italic')}
              title="Itálico (Ctrl+I)"
            />
            <ToolbarButton
              icon={Underline}
              onClick={() => applyFormat('underline')}
              title="Sublinhado (Ctrl+U)"
            />
            <ToolbarButton
              icon={Strikethrough}
              onClick={() => applyFormat('strikeThrough')}
              title="Riscado"
            />
            
            <div className="w-px h-5 bg-gray-200 mx-1" />
            
            <ToolbarButton
              icon={List}
              onClick={() => insertList(false)}
              title="Lista com marcadores"
            />
            <ToolbarButton
              icon={ListOrdered}
              onClick={() => insertList(true)}
              title="Lista numerada"
            />
            
            <div className="w-px h-5 bg-gray-200 mx-1" />
            
            <ToolbarButton
              icon={Copy}
              onClick={copySelection}
              title="Copiar"
            />
          </div>
        </div>
      )}
    </div>
  );
});

RichTextarea.displayName = 'RichTextarea';

export default RichTextarea;
