const SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='92' height='28'><rect width='92' height='28' rx='6' fill='%23222' fill-opacity='0.75'/><line x1='12' y1='6' x2='12' y2='22' stroke='white' stroke-width='1.5' stroke-linecap='round'/><line x1='4' y1='14' x2='20' y2='14' stroke='white' stroke-width='1.5' stroke-linecap='round'/><text x='28' y='19' font-family='system-ui,sans-serif' font-size='13' fill='#666'>Add Text</text></svg>`;

export const TEXT_CURSOR_URL = `url("data:image/svg+xml,${encodeURIComponent(SVG)}") 12 14, text`;

const SECTION_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='110' height='28'><rect width='110' height='28' rx='6' fill='%23222' fill-opacity='0.75'/><line x1='12' y1='6' x2='12' y2='22' stroke='white' stroke-width='1.5' stroke-linecap='round'/><line x1='4' y1='14' x2='20' y2='14' stroke='white' stroke-width='1.5' stroke-linecap='round'/><text x='28' y='19' font-family='system-ui,sans-serif' font-size='13' fill='#666'>Add Section</text></svg>`;

export const SECTION_CURSOR_URL = `url("data:image/svg+xml,${encodeURIComponent(SECTION_SVG)}") 12 14, text`;
