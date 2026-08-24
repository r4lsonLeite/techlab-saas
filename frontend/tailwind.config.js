/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta solida "suave": mesmos tons da interface, porem dessaturados,
        // para os botoes nao competirem com o conteudo.
        suave: {
          verde: '#3a8a6f',
          'verde-hover': '#45997d',
          azul: '#4a7ba7',
          'azul-hover': '#5589b6',
          ambar: '#9c7038',
          'ambar-hover': '#ab7e42',
          vermelho: '#a85a5a',
          'vermelho-hover': '#b56767',
          roxo: '#6b5aa0',
          'roxo-hover': '#7a6aae',
          grafite: '#31415c',
          'grafite-hover': '#3b4d6b',
        },
      },
    },
  },
  plugins: [],
}
