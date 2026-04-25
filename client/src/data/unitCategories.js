export const unitCategories = [
  {
    id: "length",
    name: "Length",
    baseUnit: "m",
    units: {
      m: 1,
      mm: 0.001,
      cm: 0.01,
      in: 0.0254,
      ft: 0.3048
    }
  },
  {
    id: "area",
    name: "Area",
    baseUnit: "m^2",
    units: {
      "m^2": 1,
      "mm^2": 1e-6,
      "cm^2": 1e-4,
      "in^2": 0.00064516
    }
  },
  {
    id: "force",
    name: "Force",
    baseUnit: "N",
    units: {
      N: 1,
      kN: 1000,
      lbf: 4.44822
    }
  },
  {
    id: "stress",
    name: "Stress / Pressure",
    baseUnit: "Pa",
    units: {
      Pa: 1,
      kPa: 1000,
      MPa: 1000000,
      psi: 6894.76
    }
  },
  {
    id: "torque",
    name: "Torque",
    baseUnit: "N*m",
    units: {
      "N*m": 1,
      "kN*m": 1000,
      "lb*ft": 1.35582
    }
  },
  {
    id: "moment_inertia",
    name: "Moment of Inertia",
    baseUnit: "m^4",
    units: {
      "m^4": 1,
      "mm^4": 1e-12,
      "cm^4": 1e-8,
      "in^4": 4.16231e-7
    }
  }
];
