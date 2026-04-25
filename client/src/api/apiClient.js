const withJson = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || "Request failed.");
  }

  return payload;
};

export const apiClient = {
  getMaterials: () => withJson("/materials"),
  recommendMaterial: (body) =>
    withJson("/materials/recommend", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  calculateStress: (body) =>
    withJson("/calculate/stress", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  calculateBeam: (body) =>
    withJson("/calculate/beam", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  calculateTorsion: (body) =>
    withJson("/calculate/torsion", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  saveCalculation: (body) =>
    withJson("/save", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  getHistory: () => withJson("/history")
};
