# CompatibilidadeCard

Componente React que exibe análise detalhada de compatibilidade entre um candidato e uma vaga de emprego, com sistema de gamificação através de checklist interativo e sugestões da IA.

## 📦 Dependências

```bash
npm install recharts lucide-react
```

## 🎨 Tecnologias

- **React** - Hooks (useState, useMemo)
- **Tailwind CSS** - Estilização responsiva
- **Recharts** - Gráfico donut interativo
- **Lucide React** - Ícones

## 🚀 Como Usar

### Importação Básica

```jsx
import CompatibilidadeCard from '@/components/jobs/CompatibilidadeCard';

function MinhaPage() {
  return <CompatibilidadeCard />;
}
```

### Visualizar no Navegador

Acesse: `http://localhost:3000/teste-compatibilidade`

## 🧩 Estrutura do Componente

### 1. **Cabeçalho** (Donut + Título + Status)
- Gráfico donut 64×64px mostrando score percentual
- Cores dinâmicas baseadas no score:
  - 🔴 Vermelho (`#ef4444`) - score < 45%
  - 🟡 Amarelo (`#f59e0b`) - score 45-69%
  - 🟢 Verde (`#22c55e`) - score ≥ 70%
- Indicação de níveis: Vaga vs Candidato
- Botão de colapsar/expandir

### 2. **Barra de Progresso**
- Barra horizontal animada (transition 500ms)
- Atualiza em tempo real conforme score muda
- Mesma lógica de cores do donut

### 3. **Cards de Nível** (Grid 2 colunas)
- **Card Esquerdo**: Nível da vaga (Pleno - 5/10)
- **Card Direito**: Seu nível (Júnior - 3/10) com destaque azul

### 4. **"Por que esse score?"** (Badges Verdes)
Badges colapsáveis que explicam os pontos fortes:
- ✅ Tecnologia Frontend
- ✅ Senioridade
- ✅ Capacitação

Cada badge expande ao clicar, mostrando explicação detalhada.

### 5. **"O que falta para 100%?"** (Badges Vermelhos)
Badges colapsáveis que mostram gaps:
- ⚡ Design UX/UI
- ⚡ Idioma
- ⚡ Localização

### 6. **Plano de Melhoria da IA** (Checklist Interativo)
Sistema gamificado com 3 itens:

| Item | Ganho | Cor | Curso |
|------|-------|-----|-------|
| Inglês intermediário | +18% | Azul (`#2563eb`) | Coursera |
| UX/UI Design | +12% | Laranja (`#d97706`) | Udemy |
| Pacote Office | +3% | Cinza (`#6b7a90`) | Alura |

**Funcionalidades:**
- ✅ Marcar/desmarcar itens
- 📈 Score atualiza em tempo real
- 🔗 Links para cursos aparecem ao marcar
- 🎨 Cores dinâmicas no checkbox e badge

## 🎯 Lógica de Estado

```javascript
// Score base inicial
const BASE_SCORE = 24;

// Estados React
const [checkedItems, setCheckedItems] = useState(new Set());
const [openGreen, setOpenGreen] = useState(new Set());
const [openRed, setOpenRed] = useState(new Set());
const [isCollapsed, setIsCollapsed] = useState(false);

// Score calculado dinamicamente
const currentScore = BASE_SCORE + soma_dos_ganhos_marcados;
```

## 🎨 Paleta de Cores

### Scores
- 🔴 `#ef4444` - Pouca compatibilidade (< 45%)
- 🟡 `#f59e0b` - Compatibilidade razoável (45-69%)
- 🟢 `#22c55e` - Boa compatibilidade (≥ 70%)

### Badges Verdes
- Background: `#f0fdf4`
- Border: `#bbf7d0`
- Text: `#166534`
- Expanded: `#dcfce7`

### Badges Vermelhos
- Background: `#fff5f5`
- Border: `#fecaca`
- Text: `#991b1b`
- Expanded: `#fee2e2`

### Card da IA
- Background: `#f5f7ff`
- Border: `#e0e7ff`
- Icon color: `#7c3aed` (roxo)
- Badge BETA: `#f5f3ff`

## 📊 Exemplo de Comportamento

```
Score Inicial: 24%
↓
Marca "Inglês intermediário" (+18%)
↓
Score Atual: 42% (ainda vermelho)
↓
Marca "UX/UI Design" (+12%)
↓
Score Atual: 54% (agora amarelo!)
↓
Marca "Pacote Office" (+3%)
↓
Score Atual: 57% (máximo atingível)
```

## 🔧 Personalização

### Alterar Score Base

```jsx
const BASE_SCORE = 30; // Ajuste conforme necessário
```

### Adicionar Novos Itens de Melhoria

```jsx
const IMPROVEMENT_ITEMS = [
  // ...itens existentes,
  {
    id: 4,
    label: 'Certificação AWS',
    gain: 15,
    color: '#f97316',
    colorLight: '#fed7aa',
    course: {
      name: 'AWS Certified Solutions Architect',
      url: 'https://aws.amazon.com/certification/'
    }
  }
];
```

### Ajustar Badges de Feedback

```jsx
const GREEN_BADGES = [
  // Adicione mais badges conforme necessário
  {
    id: 4,
    keyword: 'Soft Skills',
    text: 'Candidato demonstra excelente comunicação.'
  }
];
```

## 🎭 Interatividade

- **Colapsar Card**: Clique no chevron no topo direito
- **Expandir Badges**: Clique em qualquer badge verde/vermelho
- **Marcar Checklist**: Clique no item ou no checkbox
- **Acessar Cursos**: Links aparecem automaticamente ao marcar item

## 📱 Responsividade

O componente usa Tailwind CSS e é totalmente responsivo:
- Grid adapta em telas menores
- Badges fazem wrap automaticamente
- Texto e ícones escalam proporcionalmente

## 🚀 Melhorias Futuras

- [ ] Receber props para dados dinâmicos (score, níveis, badges)
- [ ] Integração com API para salvar progresso do checklist
- [ ] Animações ao marcar/desmarcar itens
- [ ] Compartilhar resultado nas redes sociais
- [ ] Modo dark
- [ ] Exportar card como imagem

## 📝 Notas Técnicas

- O gráfico donut usa `Recharts` com `PieChart` e `Pie`
- Transições suaves com `transition-all duration-300/500`
- Estado gerenciado com `Set` para performance
- `useMemo` para otimizar cálculo do score
- Acessibilidade: botões semânticos, hover states

## 🐛 Troubleshooting

**Gráfico não aparece:**
```bash
npm install recharts
```

**Ícones faltando:**
```bash
npm install lucide-react
```

**Tailwind não funciona:**
Certifique-se que `tailwind.config.js` está configurado corretamente.

---

**Autor:** Desenvolvido com especificações detalhadas
**Versão:** 1.0.0
**Licença:** MIT
