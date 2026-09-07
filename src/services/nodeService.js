import { onValue, ref, set } from "firebase/database";
import { database } from "../firebase/firebaseConfig";

const NODES_PATH = "nodes";

export function subscribeToNodes(onData, onError) {
  const nodesReference = ref(database, NODES_PATH);

  const unsubscribe = onValue(
    nodesReference,
    (snapshot) => {
      if (!snapshot.exists()) {
        onData([]);
        return;
      }

      const firebaseNodes = snapshot.val();

      const nodesArray = Object.entries(firebaseNodes).map(
        ([firebaseKey, node]) => ({
          firebaseKey,
          ...node,
        }),
      );

      onData(nodesArray);
    },
    (error) => {
      console.error("Failed to read nodes:", error);

      if (onError) {
        onError(error);
      }
    },
  );

  return unsubscribe;
}

export async function createSampleNodes() {
  const sampleNodes = {
    "node-01": {
      id: "NODE-01",
      location: "Area 1 - North Entrance",
      waterLevel: 4,
      pressure: 1013.2,
      battery: 8.1,
      status: "online",
      timestamp: Date.now(),
    },

    "node-02": {
      id: "NODE-02",
      location: "Area 2 - Main Road",
      waterLevel: 13,
      pressure: 1014.1,
      battery: 7.9,
      status: "online",
      timestamp: Date.now(),
    },

    "node-03": {
      id: "NODE-03",
      location: "Area 3 - Bridge",
      waterLevel: 28,
      pressure: 1015.4,
      battery: 7.8,
      status: "online",
      timestamp: Date.now(),
    },

    "node-04": {
      id: "NODE-04",
      location: "Area 4 - Riverside",
      waterLevel: 56,
      pressure: 1017.2,
      battery: 7.5,
      status: "online",
      timestamp: Date.now(),
    },

    "node-05": {
      id: "NODE-05",
      location: "Area 5 - Market Road",
      waterLevel: 9,
      pressure: 1013.8,
      battery: 8.0,
      status: "online",
      timestamp: Date.now(),
    },

    "node-06": {
      id: "NODE-06",
      location: "Area 6 - School Zone",
      waterLevel: 18,
      pressure: 1014.7,
      battery: 7.7,
      status: "online",
      timestamp: Date.now(),
    },

    "node-07": {
      id: "NODE-07",
      location: "Area 7 - Residential Road",
      waterLevel: 35,
      pressure: 1016.3,
      battery: 7.6,
      status: "online",
      timestamp: Date.now(),
    },

    "node-08": {
      id: "NODE-08",
      location: "Area 8 - Drainage Channel",
      waterLevel: 7,
      pressure: 1013.5,
      battery: 8.2,
      status: "online",
      timestamp: Date.now(),
    },

    "node-09": {
      id: "NODE-09",
      location: "Area 9 - Low-Lying Road",
      waterLevel: 48,
      pressure: 1016.8,
      battery: 7.4,
      status: "online",
      timestamp: Date.now(),
    },

    "node-10": {
      id: "NODE-10",
      location: "Area 10 - South Entrance",
      waterLevel: 0,
      pressure: 0,
      battery: 0,
      status: "offline",
      timestamp: Date.now(),
    },
  };

  await set(ref(database, NODES_PATH), sampleNodes);
}