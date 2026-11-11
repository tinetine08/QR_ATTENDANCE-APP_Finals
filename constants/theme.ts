// QR Attendance brand gradients: deep navy surfaces with electric-blue and gold accents.
export const GRADIENT = ['#0754B8', '#167BFF', '#D6A42A'] as const;
export const BG_GRADIENT = ['#06122B', '#0A1D3D', '#102B50'] as const;
export const BG_START = { x: 0, y: 0 };
export const BG_END = { x: 1, y: 1 };

export const GRADIENT_START = { x: 0, y: 0 };
export const GRADIENT_END = { x: 1, y: 0 };

// Soft navy shadows keep cards legible on the dark branded background.
export const SHADOW = {
  card: {
    shadowColor: '#020817',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  nav: {
    shadowColor: '#020817',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.32,
    shadowRadius: 12,
    elevation: 14,
  },
  header: {
    shadowColor: '#020817',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 12,
  },
};
