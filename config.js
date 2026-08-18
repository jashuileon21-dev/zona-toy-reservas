window.ZONA_TOY_CONFIG = {
  businessName: "Zona Toy",
  timezone: "America/Mexico_City",
  supabaseUrl: "https://uvlmkgaikudoagokwvbe.supabase.co",
supabaseKey: "sb_publishable_RQ_aYmgFkYbR3ODmm-RaTg_hJ3lNg5u",

  // La cuadrícula avanza cada 30 min para aprovechar el cierre de 8:30 PM.
  slotStepMinutes: 30,

  // El cliente puede reservar entre 1 y 2 horas.
  durationOptions: [60, 90, 120],

  // Zona Toy abre todos los días de 10:00 AM a 8:30 PM.
  hours: {
    0: { open: "10:00", close: "20:30" },
    1: { open: "10:00", close: "20:30" },
    2: { open: "10:00", close: "20:30" },
    3: { open: "10:00", close: "20:30" },
    4: { open: "10:00", close: "20:30" },
    5: { open: "10:00", close: "20:30" },
    6: { open: "10:00", close: "20:30" }
  },

  // Cada reserva bloquea la máquina completa.
  resources: [
    { id: "phoenix2", name: "Pump It Up Phoenix 2" },
    { id: "lx", name: "Pump It Up LX" }
  ]
};
