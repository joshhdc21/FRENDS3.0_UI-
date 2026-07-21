export function subscribeToTraffic(
  onData,
  onError
) {
  try {
    const data = [
      {
        id: 1,
        road: "España Boulevard",
        congestion: "Heavy",
        speed: 12,
      },
      {
        id: 2,
        road: "Taft Avenue",
        congestion: "Moderate",
        speed: 28,
      },
      {
        id: 3,
        road: "EDSA Northbound",
        congestion: "Heavy",
        speed: 10,
      },
      {
        id: 4,
        road: "Quezon Avenue",
        congestion: "Light",
        speed: 52,
      },
    ];

    onData(data);

    return () => {};
  } catch (error) {
    onError(error);
  }
}