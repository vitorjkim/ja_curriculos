import React, { createContext, useContext } from 'react';

const TemplateThemeContext = createContext({ name: 'default' });

export const TemplateThemeProvider = ({ name = 'default', children }) => {
  return (
    <TemplateThemeContext.Provider value={{ name }}>
      {children}
    </TemplateThemeContext.Provider>
  );
};

export const useTemplateTheme = () => useContext(TemplateThemeContext);

export default TemplateThemeContext;
