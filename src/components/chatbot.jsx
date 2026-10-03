import React, { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "../firebase/firebaseConfig";
import "./chatbot.css";

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [nodes, setNodes] = useState({});
  const [input, setInput] = useState("");
  const [firebaseLoading, setFirebaseLoading] = useState(true);
  const [firebaseError, setFirebaseError] = useState(false);

  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hello! I'm the FRENDS Assistant. Ask me about flood levels, batteries, streets, or critical conditions.",
    },
  ]);

  // =========================================================
  // FIREBASE NODE DATA
  // =========================================================

  useEffect(() => {
    const nodesRef = ref(database, "nodes");

    const unsubscribe = onValue(
      nodesRef,
      (snapshot) => {
        const data = snapshot.val();

        console.log(
          "FRENDS CHATBOT - Firebase /nodes data:",
          data
        );

        if (data) {
          setNodes(data);
        } else {
          setNodes({});
        }

        setFirebaseLoading(false);
        setFirebaseError(false);
      },
      (error) => {
        console.error(
          "FRENDS CHATBOT - Firebase error:",
          error
        );

        setFirebaseLoading(false);
        setFirebaseError(true);
        setNodes({});
      }
    );

    return () => unsubscribe();
  }, []);

  // =========================================================
  // GET STREET NAME FROM FIREBASE
  // =========================================================

  const getStreetName = (key, node) => {
    if (!node) {
      return key;
    }

    /*
      The chatbot reads the street/location name
      directly from the Firebase node.

      Supported Firebase fields:
      street
      streetName
      name
      nodeName
      location
      address
    */

    const streetName =
      node.street ||
      node.streetName ||
      node.name ||
      node.nodeName ||
      node.location ||
      node.address;

    if (streetName) {
      return String(streetName);
    }

    return key;
  };

  // =========================================================
  // GET FLOOD VALUE FROM FIREBASE
  // =========================================================

  const getFloodValue = (node) => {
    if (!node) {
      return null;
    }

    const possibleValues = [
      node.floodDepth,
      node.flood_depth,
      node.flood,
      node.depth,
      node.waterLevel,
      node.water_level,
    ];

    for (const value of possibleValues) {
      if (
        value !== undefined &&
        value !== null &&
        value !== "" &&
        !isNaN(value)
      ) {
        return Number(value);
      }
    }

    return null;
  };

  // =========================================================
  // GET BATTERY VALUE FROM FIREBASE
  // =========================================================

  const getBatteryValue = (node) => {
    if (!node) {
      return null;
    }

    const possibleValues = [
      node.battery,
      node.batteryLevel,
      node.battery_level,
      node.batteryPercentage,
      node.battery_percentage,
    ];

    for (const value of possibleValues) {
      if (
        value !== undefined &&
        value !== null &&
        value !== "" &&
        !isNaN(value)
      ) {
        return Number(value);
      }
    }

    return null;
  };

  // =========================================================
  // FLOOD STATUS
  // =========================================================

  const getFloodStatus = (value) => {
    if (value === null) {
      return "Unavailable";
    }

    if (value >= 30) {
      return "Critical";
    }

    if (value >= 20) {
      return "High";
    }

    if (value >= 10) {
      return "Moderate";
    }

    return "Normal";
  };

  // =========================================================
  // BATTERY STATUS
  // =========================================================

  const getBatteryStatus = (value) => {
    if (value === null) {
      return "Unavailable";
    }

    if (value <= 20) {
      return "Low";
    }

    return "Normal";
  };

  // =========================================================
  // FIND NODE
  // =========================================================

  const findNode = (query) => {
    const lowerQuery = query.toLowerCase().trim();

    const nodeEntries = Object.entries(nodes);

    // -------------------------------------------------------
    // SEARCH BY STREET NAME FROM FIREBASE
    // -------------------------------------------------------

    for (const [key, node] of nodeEntries) {
      const streetName = getStreetName(key, node);

      const lowerStreetName =
        streetName.toLowerCase();

      // Exact/full street name
      if (lowerQuery.includes(lowerStreetName)) {
        return {
          key,
          node,
        };
      }

      // Allow user to omit "St."
      const streetWithoutSt =
        lowerStreetName
          .replace(/\bst\.?\b/g, "")
          .trim();

      if (
        streetWithoutSt &&
        lowerQuery.includes(streetWithoutSt)
      ) {
        return {
          key,
          node,
        };
      }
    }

    // -------------------------------------------------------
    // SEARCH BY FIREBASE NODE KEY
    // -------------------------------------------------------

    for (const [key, node] of nodeEntries) {
      if (
        lowerQuery.includes(
          key.toLowerCase()
        )
      ) {
        return {
          key,
          node,
        };
      }
    }

    // -------------------------------------------------------
    // SEARCH "NODE 01", "NODE 1", ETC.
    // -------------------------------------------------------

    const numberMatch =
      lowerQuery.match(/node\s*0*(\d+)/);

    if (numberMatch) {
      const number = Number(
        numberMatch[1]
      );

      for (const [key, node] of nodeEntries) {
        const keyNumber =
          key.match(/\d+/);

        if (
          keyNumber &&
          Number(keyNumber[0]) === number
        ) {
          return {
            key,
            node,
          };
        }
      }
    }

    return null;
  };

  // =========================================================
  // GENERATE BOT RESPONSE
  // =========================================================

  const generateResponse = (question) => {
    const query = question
      .toLowerCase()
      .trim();

    if (!query) {
      return "Please enter a question.";
    }

    // -------------------------------------------------------
    // FIREBASE CONNECTION STATUS
    // -------------------------------------------------------

    if (firebaseLoading) {
      return "I'm still connecting to the FRENDS Firebase database. Please try again in a moment.";
    }

    if (firebaseError) {
      return "I'm unable to access the FRENDS Firebase database right now. Please check the Firebase connection.";
    }

    if (Object.keys(nodes).length === 0) {
      return "No monitoring node data is currently available in the Firebase database.";
    }

    // -------------------------------------------------------
    // HELP
    // -------------------------------------------------------

    if (
      query.includes("help") ||
      query.includes("what can you do")
    ) {
      return (
        "I can provide information directly from the FRENDS Firebase database. " +
        "You can ask about flood levels, flood status, battery levels, streets, " +
        "critical conditions, low-battery streets, or the number of monitoring nodes."
      );
    }

    // -------------------------------------------------------
    // NODE COUNT
    // -------------------------------------------------------

    if (
      query.includes("how many nodes") ||
      query.includes("number of nodes") ||
      query.includes("total nodes")
    ) {
      const count =
        Object.keys(nodes).length;

      return `There are currently ${count} monitoring node${
        count !== 1 ? "s" : ""
      } registered in the FRENDS Firebase database.`;
    }

    // -------------------------------------------------------
    // SPECIFIC NODE
    // -------------------------------------------------------

    const foundNode =
      findNode(query);

    if (foundNode) {
      const {
        key,
        node,
      } = foundNode;

      // Street name comes from Firebase
      const streetName =
        getStreetName(key, node);

      // Values come from Firebase
      const flood =
        getFloodValue(node);

      const battery =
        getBatteryValue(node);

      const floodStatus =
        getFloodStatus(flood);

      const batteryStatus =
        getBatteryStatus(battery);

      // -----------------------------------------------------
      // BATTERY QUESTION
      // -----------------------------------------------------

      if (
        query.includes("battery") ||
        query.includes("power")
      ) {
        if (battery === null) {
          return `${streetName} does not currently have a battery value available in Firebase.`;
        }

        return `${streetName} has a battery level of ${battery}%. Battery status: ${batteryStatus}.`;
      }

      // -----------------------------------------------------
      // FLOOD QUESTION
      // -----------------------------------------------------

      if (
        query.includes("flood") ||
        query.includes("water") ||
        query.includes("depth") ||
        query.includes("level")
      ) {
        if (flood === null) {
          return `${streetName} does not currently have a flood-depth value available in Firebase.`;
        }

        return `${streetName} currently has a flood depth of ${flood}. Flood status: ${floodStatus}.`;
      }

      // -----------------------------------------------------
      // GENERAL NODE INFORMATION
      // -----------------------------------------------------

      const floodText =
        flood !== null
          ? `${flood} (${floodStatus})`
          : "unavailable";

      const batteryText =
        battery !== null
          ? `${battery}% (${batteryStatus})`
          : "unavailable";

      return (
        `${streetName} currently has a flood depth of ` +
        `${floodText} and a battery level of ${batteryText}.`
      );
    }

    // -------------------------------------------------------
    // CRITICAL FLOOD NODES
    // -------------------------------------------------------

    if (
      query.includes("critical") ||
      query.includes("dangerous") ||
      query.includes("highest flood")
    ) {
      const criticalNodes =
        Object.entries(nodes)
          .map(([key, node]) => ({
            key,
            node,
            flood:
              getFloodValue(node),
          }))
          .filter(
            (item) =>
              item.flood !== null &&
              item.flood >= 30
          );

      if (criticalNodes.length === 0) {
        return "There are currently no streets with a Critical flood status based on the Firebase data.";
      }

      const names =
        criticalNodes.map((item) => {
          const streetName =
            getStreetName(
              item.key,
              item.node
            );

          return `${streetName} (${item.flood})`;
        });

      return (
        `The following street${
          names.length > 1 ? "s are" : " is"
        } currently at Critical flood status: ` +
        `${names.join(", ")}.`
      );
    }

    // -------------------------------------------------------
    // LOW BATTERY
    // -------------------------------------------------------

    if (
      query.includes("low battery") ||
      query.includes("battery low") ||
      query.includes("weak battery")
    ) {
      const lowBatteryNodes =
        Object.entries(nodes)
          .map(([key, node]) => ({
            key,
            node,
            battery:
              getBatteryValue(node),
          }))
          .filter(
            (item) =>
              item.battery !== null &&
              item.battery <= 20
          );

      if (lowBatteryNodes.length === 0) {
        return "There are currently no streets with low battery based on the Firebase data.";
      }

      const names =
        lowBatteryNodes.map((item) => {
          const streetName =
            getStreetName(
              item.key,
              item.node
            );

          return `${streetName} (${item.battery}%)`;
        });

      return (
        `The following street${
          names.length > 1 ? "s have" : " has"
        } low battery: ${names.join(", ")}.`
      );
    }

    // -------------------------------------------------------
    // FLOOD STATUS SUMMARY
    // -------------------------------------------------------

    if (
      query.includes("flood status") ||
      query.includes("flood condition") ||
      query.includes("flood situation")
    ) {
      const nodeEntries =
        Object.entries(nodes);

      let critical = 0;
      let high = 0;
      let moderate = 0;
      let normal = 0;

      nodeEntries.forEach(
        ([key, node]) => {
          const flood =
            getFloodValue(node);

          if (flood === null) {
            return;
          }

          const status =
            getFloodStatus(flood);

          if (status === "Critical") {
            critical++;
          } else if (status === "High") {
            high++;
          } else if (
            status === "Moderate"
          ) {
            moderate++;
          } else {
            normal++;
          }
        }
      );

      return (
        `Current flood status from Firebase: ` +
        `${critical} Critical, ${high} High, ` +
        `${moderate} Moderate, and ${normal} Normal.`
      );
    }

    // -------------------------------------------------------
    // BATTERY SUMMARY
    // -------------------------------------------------------

    if (
      query.includes("battery status") ||
      query.includes("battery condition") ||
      query.includes("battery levels")
    ) {
      const nodeEntries =
        Object.entries(nodes);

      let lowBattery = 0;
      let normalBattery = 0;

      nodeEntries.forEach(
        ([key, node]) => {
          const battery =
            getBatteryValue(node);

          if (battery === null) {
            return;
          }

          if (battery <= 20) {
            lowBattery++;
          } else {
            normalBattery++;
          }
        }
      );

      return (
        `Battery status from Firebase: ` +
        `${normalBattery} monitoring street${
          normalBattery !== 1 ? "s" : ""
        } with normal battery levels and ` +
        `${lowBattery} with low battery.`
      );
    }

    // -------------------------------------------------------
    // GENERAL FLOOD QUESTION
    // -------------------------------------------------------

    if (
      query.includes("flood") ||
      query.includes("water level") ||
      query.includes("water depth")
    ) {
      const floodNodes =
        Object.entries(nodes)
          .map(([key, node]) => ({
            key,
            node,
            flood:
              getFloodValue(node),
          }))
          .filter(
            (item) =>
              item.flood !== null
          );

      if (floodNodes.length === 0) {
        return "No flood-depth data is currently available in Firebase.";
      }

      const highest =
        floodNodes.sort(
          (a, b) =>
            b.flood - a.flood
        )[0];

      const streetName =
        getStreetName(
          highest.key,
          highest.node
        );

      return (
        `The highest recorded flood depth ` +
        `from the Firebase data is ${highest.flood} ` +
        `at ${streetName}.`
      );
    }

    // -------------------------------------------------------
    // DEFAULT RESPONSE
    // -------------------------------------------------------

    return (
      "I can help with the live FRENDS Firebase data. " +
      'Try asking: "What is the flood level of Leon Guinto St.?", ' +
      '"Which streets are critical?", or ' +
      '"Which streets have low battery?"'
    );
  };

  // =========================================================
  // SEND MESSAGE
  // =========================================================

  const handleSend = () => {
    const question = input.trim();

    if (!question) {
      return;
    }

    const userMessage = {
      sender: "user",
      text: question,
    };

    setMessages((previous) => [
      ...previous,
      userMessage,
    ]);

    setInput("");

    const response =
      generateResponse(question);

    setTimeout(() => {
      setMessages((previous) => [
        ...previous,
        {
          sender: "bot",
          text: response,
        },
      ]);
    }, 300);
  };

  // =========================================================
  // ENTER KEY
  // =========================================================

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSend();
    }
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <>
      {/* =====================================================
          CHATBOT WINDOW
      ===================================================== */}

      {isOpen && (
        <div className="chatbot-window">

          {/* HEADER */}

          <div className="chatbot-header">

            <div className="chatbot-header-info">

              <div className="chatbot-avatar">
                🤖
              </div>

              <div>
                <h3>FRENDS Assistant</h3>

                <span>
                  Flood Monitoring Assistant
                </span>
              </div>

            </div>

            <button
              className="chatbot-close"
              onClick={() =>
                setIsOpen(false)
              }
              aria-label="Close chatbot"
            >
              ×
            </button>

          </div>

          {/* MESSAGES */}

          <div className="chatbot-messages">

            {messages.map(
              (message, index) => (
                <div
                  key={index}
                  className={`chat-message ${message.sender}`}
                >
                  {message.text}
                </div>
              )
            )}

          </div>

          {/* INPUT */}

          <div className="chatbot-input-area">

            <input
              type="text"
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder="Ask about flood conditions..."
            />

            <button
              onClick={handleSend}
              aria-label="Send message"
            >
              ➤
            </button>

          </div>

        </div>
      )}

      {/* =====================================================
          FLOATING CHATBOT BUTTON
      ===================================================== */}

      <button
        className={`chatbot-floating-button ${
          isOpen
            ? "chatbot-button-open"
            : ""
        }`}
        onClick={() =>
          setIsOpen(
            (previous) => !previous
          )
        }
        aria-label={
          isOpen
            ? "Close FRENDS chatbot"
            : "Open FRENDS chatbot"
        }
      >
        {isOpen ? "×" : "💬"}
      </button>
    </>
  );
};

export default Chatbot;